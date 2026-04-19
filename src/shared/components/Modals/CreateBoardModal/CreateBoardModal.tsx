import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Modal } from '../Modal';
import type { TicketBoard } from '../../../models/TicketBoard';
import './CreateBoardModal.css';
import { useUserStore } from '../../../stores/userStore';
import { useState } from 'react';
import { ticketBoardService } from '../../../../api/services/TicketBoardService';

export interface CreateBoardModalProps {
  isOpen: boolean;
  board?: TicketBoard;
  onClose: () => void;
  onCreate: (board: TicketBoard) => void;
}

const COLORS = ['lilac', 'mint', 'blue', 'peach', 'cream'] as string[];

const createBoardSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(100, 'Title must be 100 characters or fewer'),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or fewer'),
  color: z.enum(COLORS),
});

type CreateBoardFields = z.infer<typeof createBoardSchema>;

export const CreateBoardModal = ({
  isOpen,
  board,
  onClose,
  onCreate,
}: CreateBoardModalProps) => {
  const { user } = useUserStore();
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<CreateBoardFields>({
    resolver: zodResolver(createBoardSchema),
    defaultValues: {
      title: board?.board_name || '',
      description: board?.board_description || '',
      color: board?.board_color || COLORS[0],
    },
  });

  const onSubmit = async (data: CreateBoardFields) => {
    const boardToCreate: TicketBoard = {
      ...board,
      board_name: data.title,
      board_color: data.color,
      board_description: data.description,
      created_by: user ? { id: user.id } : { id: 0 },
    };

    setIsSaving(true);

    const createdBoard = await ticketBoardService.addTicketBoard(boardToCreate);

    setIsSaving(false);
    reset();
    onClose();

    onCreate(createdBoard);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal
      title={board ? 'Edit Board' : 'Add Board'}
      isOpen={isOpen}
      onClose={handleClose}
    >
      <form className="form-grid" onSubmit={handleSubmit(onSubmit)} noValidate>
        <label>
          <span>Title</span>
          <input
            className={`field${errors.title ? ' field-error' : ''}`}
            placeholder="Q2 Product Launch"
            {...register('title')}
          />
          {errors.title && (
            <span className="field-error-msg">{errors.title.message}</span>
          )}
        </label>
        <label>
          <span>Description</span>
          <textarea
            className={`field field-lg${errors.description ? ' field-error' : ''}`}
            placeholder="Plan ticket flow for launch goals, milestones, and release checks."
            {...register('description')}
          />
          {errors.description && (
            <span className="field-error-msg">
              {errors.description.message}
            </span>
          )}
        </label>
        <label>
          <span>Color</span>
          <Controller
            name="color"
            control={control}
            render={({ field }) => (
              <div className="color-row">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`color-chip chip-${c}${field.value === c ? ' chip-selected' : ''}`}
                    onClick={() => field.onChange(c)}
                    aria-label={c}
                  />
                ))}
              </div>
            )}
          />
        </label>
        <div className="modal-actions">
          <button type="button" className="action-btn" onClick={handleClose}>
            Cancel
          </button>
          <button
            type="submit"
            className="action-btn action-btn-primary"
            disabled={isSaving}
          >
            {isSaving && <i className="fas fa-spinner fa-spin" />}{' '}
            {board ? 'Save Changes' : 'Create Board'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
