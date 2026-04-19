import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { User } from '../../../shared/stores/userStore';
import { Modal } from '../../../shared/components/Modals/Modal';

const BOARD_COLORS = ['lilac', 'mint', 'blue', 'peach', 'cream'] as const;

const boardSettingsSchema = z.object({
  boardName: z
    .string()
    .trim()
    .min(1, 'Board name is required.')
    .max(100, 'Board name must be 100 characters or fewer.'),
  boardColor: z.enum(BOARD_COLORS),
});

type BoardSettingsFormValues = z.input<typeof boardSettingsSchema>;
type BoardSettingsSubmitValues = z.output<typeof boardSettingsSchema>;

interface BoardSettingsModalProps {
  isOpen: boolean;
  boardName: string;
  boardColor: string;
  users: User[];
  isSaving: boolean;
  submitError?: string | null;
  onClose: () => void;
  onSave: (values: BoardSettingsSubmitValues) => Promise<void>;
}

export const BoardSettingsModal = ({
  isOpen,
  boardName,
  boardColor,
  users,
  isSaving,
  submitError,
  onClose,
  onSave,
}: BoardSettingsModalProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BoardSettingsFormValues, undefined, BoardSettingsSubmitValues>({
    resolver: zodResolver(boardSettingsSchema),
    defaultValues: {
      boardName,
      boardColor: BOARD_COLORS.includes(boardColor as (typeof BOARD_COLORS)[number])
        ? (boardColor as (typeof BOARD_COLORS)[number])
        : BOARD_COLORS[0],
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({
        boardName,
        boardColor: BOARD_COLORS.includes(boardColor as (typeof BOARD_COLORS)[number])
          ? (boardColor as (typeof BOARD_COLORS)[number])
          : BOARD_COLORS[0],
      });
    }
  }, [isOpen, boardName, boardColor, reset]);

  const selectedColor = watch('boardColor');

  const onSubmit = handleSubmit(async (values) => {
    await onSave(values);
  });

  return (
    <Modal title="Board Settings" isOpen={isOpen} onClose={onClose}>
      <form className="form-grid" onSubmit={onSubmit} noValidate>
        <label>
          <span>Board Name</span>
          <input
            type="text"
            className={`field${errors.boardName ? ' field-error' : ''}`}
            maxLength={100}
            placeholder="Board name"
            {...register('boardName')}
          />
          {errors.boardName && (
            <span className="field-error-msg">{errors.boardName.message}</span>
          )}
        </label>

        <label>
          <span>Color</span>
          <input type="hidden" {...register('boardColor')} />
          <div className="color-row" role="radiogroup" aria-label="Board color">
            {BOARD_COLORS.map((color) => {
              const isSelected = selectedColor === color;

              return (
                <button
                  key={color}
                  type="button"
                  className={`color-chip chip-${color}${isSelected ? ' chip-selected' : ''}`}
                  role="radio"
                  aria-checked={isSelected}
                  aria-label={color}
                  onClick={() =>
                    setValue('boardColor', color, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
              );
            })}
          </div>
          {errors.boardColor && (
            <span className="field-error-msg">{errors.boardColor.message}</span>
          )}
        </label>

        <div className="settings-users-block">
          <span className="settings-users-title">Board Users ({users.length})</span>
          <ul className="settings-user-list">
            {users.length === 0 && <li className="settings-user-item">No users found.</li>}
            {users.map((boardUser) => (
              <li key={boardUser.id} className="settings-user-item">
                <strong>{boardUser.full_name}</strong>
                <span>{boardUser.email}</span>
              </li>
            ))}
          </ul>
        </div>

        {submitError && <span className="field-error-msg">{submitError}</span>}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={onClose} disabled={isSaving}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSaving}>
            {isSaving && <i className="fas fa-spinner fa-spin" />}
            Save Changes
          </button>
        </div>
      </form>
    </Modal>
  );
};
