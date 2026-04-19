import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import Swal from 'sweetalert2';
import { Modal } from '../../../shared/components/Modals/Modal';
import { ticketService } from '../../../api/services/TicketService';

const inviteUserSchema = z.object({
  inviteEmail: z.string().trim().email('Please enter a valid email address.'),
});

type InviteUserFormValues = z.infer<typeof inviteUserSchema>;

interface InviteUserModalProps {
  isOpen: boolean;
  boardId: number | null;
  onClose: () => void;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export const InviteUserModal = ({
  isOpen,
  boardId,
  onClose,
}: InviteUserModalProps) => {
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteUserFormValues>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: {
      inviteEmail: '',
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({ inviteEmail: '' });
      setSubmitError(null);
    }
  }, [isOpen, reset]);

  const handleClose = () => {
    reset({ inviteEmail: '' });
    setSubmitError(null);
    onClose();
  };

  const onSubmit = handleSubmit(async (data) => {
    if (boardId == null) {
      setSubmitError('Unable to resolve the board. Please refresh and try again.');
      return;
    }

    setSubmitError(null);

    try {
      await ticketService.inviteByEmail({
        board_id: boardId,
        invite_email: data.inviteEmail.trim().toLowerCase(),
      });

      await Swal.fire({
        icon: 'success',
        title: 'Invitation Sent',
        text: `An invite has been sent to ${data.inviteEmail.trim()}.`,
      });

      handleClose();
    } catch (error) {
      setSubmitError(
        getErrorMessage(
          error,
          'Unable to send invitation. Please try again in a moment.',
        ),
      );
    }
  });

  return (
    <Modal title="Invite Users" isOpen={isOpen} onClose={handleClose}>
      <form className="form-grid" onSubmit={onSubmit} noValidate>
        <label>
          <span>Email Address</span>
          <input
            type="email"
            className={`field${errors.inviteEmail ? ' field-error' : ''}`}
            placeholder="name@company.com"
            autoComplete="email"
            {...register('inviteEmail')}
          />
          {errors.inviteEmail && (
            <span className="field-error-msg">{errors.inviteEmail.message}</span>
          )}
        </label>

        {submitError && <span className="field-error-msg">{submitError}</span>}

        <div className="modal-actions">
          <button type="button" className="btn" onClick={handleClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting && <i className="fas fa-spinner fa-spin" />}
            Send Invite
          </button>
        </div>
      </form>
    </Modal>
  );
};
