import { useMemo, useState } from 'react';
import { z } from 'zod';
import { Modal } from '../Modal';
import type { ImportBoardJsonPayload } from '../../../../api/services/TicketBoardService';
import './ImportBoardModal.css';

export interface ImportBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (payload: ImportBoardJsonPayload) => Promise<void>;
}

const importBoardSchema = z.object({
  created_by_id: z.number().int().positive(),
  creator_email: z.string().email().optional(),
  creator_name: z.string().optional(),
  board: z.object({
    board_name: z.string().min(1),
    board_color: z.string().min(1),
    board_description: z.string().min(1),
  }),
  columns: z
    .array(
      z.object({
        key: z.string().optional(),
        column_name: z.string().min(1),
        sort_order: z.number().int().optional(),
        color: z.string().min(1),
      }),
    )
    .optional(),
  tickets: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        acceptance_criteria: z.string().optional(),
        priority: z.number().int().optional(),
        sort_order: z.number().int().optional(),
        column_id: z.number().int().optional(),
        column_key: z.string().optional(),
        column_index: z.number().int().optional(),
        assigned_user_id: z.number().int().optional(),
      }),
    )
    .optional(),
  invite_emails: z.array(z.string().email()).optional(),
});

const TEMPLATE: ImportBoardJsonPayload = {
  created_by_id: 1,
  creator_email: 'creator@example.com',
  creator_name: 'Board Creator',
  board: {
    board_name: 'Imported Roadmap Board',
    board_color: 'lilac',
    board_description: 'Board created from JSON import flow.',
  },
  columns: [
    { key: 'todo', column_name: 'To Do', sort_order: 0, color: '#dcebdd' },
    { key: 'in_progress', column_name: 'In Progress', sort_order: 1, color: '#d9e6f7' },
    { key: 'done', column_name: 'Done', sort_order: 2, color: '#efe4cc' },
  ],
  tickets: [
    {
      title: 'Prepare launch plan',
      description: 'Gather requirements and dependencies for release.',
      acceptance_criteria: 'Plan is reviewed and approved by the team.',
      priority: 2,
      sort_order: 0,
      column_key: 'todo',
      column_index: 0,
    },
  ],
  invite_emails: ['teammate@example.com'],
};

export const ImportBoardModal = ({
  isOpen,
  onClose,
  onImport,
}: ImportBoardModalProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fileName, setFileName] = useState('');
  const [payload, setPayload] = useState<ImportBoardJsonPayload | null>(null);
  const [error, setError] = useState('');

  const canSubmit = useMemo(() => !!payload && !isSubmitting, [payload, isSubmitting]);

  const resetState = () => {
    setIsSubmitting(false);
    setFileName('');
    setPayload(null);
    setError('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const downloadTemplate = () => {
    const blob = new Blob([JSON.stringify(TEMPLATE, null, 2)], {
      type: 'application/json;charset=utf-8',
    });

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'template.json';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    setError('');
    setPayload(null);

    if (!file) {
      setFileName('');
      return;
    }

    setFileName(file.name);

    try {
      const rawText = await file.text();
      const json = JSON.parse(rawText) as unknown;
      const validatedPayload = importBoardSchema.parse(json);

      setPayload(validatedPayload);
    } catch {
      setPayload(null);
      setError('Invalid JSON format. Please use template.json and keep the required fields.');
    }
  };

  const handleSubmit = async () => {
    if (!payload) {
      setError('Please upload a valid JSON file first.');
      return;
    }

    setIsSubmitting(true);

    try {
      await onImport(payload);
      resetState();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal title="Import Board" isOpen={isOpen} onClose={handleClose}>
      <div className="import-board-modal">
        <p className="import-board-copy">
          Download the JSON template, fill in your board data, then upload the file to start the import process.
        </p>

        <div className="import-board-actions">
          <button
            type="button"
            className="action-btn"
            onClick={downloadTemplate}
          >
            Download template.json
          </button>
          <label className="import-file-label" htmlFor="board-json-file">
            <span>{fileName || 'Choose JSON file'}</span>
            <input
              id="board-json-file"
              type="file"
              accept="application/json,.json"
              onChange={handleFileChange}
            />
          </label>
        </div>

        {error && <p className="field-error-msg">{error}</p>}

        <div className="modal-actions">
          <button type="button" className="action-btn" onClick={handleClose}>
            Cancel
          </button>
          <button
            type="button"
            className="action-btn action-btn-primary"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {isSubmitting ? 'Importing...' : 'Start Import'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
