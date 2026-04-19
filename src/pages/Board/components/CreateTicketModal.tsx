import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Swal from "sweetalert2";
import { ticketService } from "../../../api/services/TicketService";
import { ticketBoardService } from "../../../api/services/TicketBoardService";
import type { Ticket } from "../../../shared/models/Ticket";
import type { TicketBoardColumn } from "../../../shared/models/TicketBoardColumn";
import { useUserStore, type User } from "../../../shared/stores/userStore";

const MAX_ATTACHMENT_SIZE = 3 * 1024 * 1024;

const PRIORITY_OPTIONS = ["Low", "Medium", "High", "Critical"] as const;

const PRIORITY_MAP: Record<(typeof PRIORITY_OPTIONS)[number], number> = {
  Low: 1,
  Medium: 2,
  High: 3,
  Critical: 4,
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const createTicketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(100, "Title must be 100 characters or fewer."),
  description: z
    .string()
    .trim()
    .min(1, "Description is required.")
    .max(2000, "Description must be 2000 characters or fewer."),
  priority: z.enum(PRIORITY_OPTIONS, {
    message: "Please select a priority.",
  }),
  assignedUserId: z.coerce.number().int().positive({
    message: "Please select an assignee.",
  }),
  columnId: z.coerce.number().int().positive({
    message: "Please select a list.",
  }),
  acceptanceCriteria: z
    .string()
    .trim()
    .max(2000, "Acceptance criteria must be 2000 characters or fewer."),
  attachments: z
    .array(
      z
        .instanceof(File)
        .refine(
          (file) => file.size <= MAX_ATTACHMENT_SIZE,
          "Each attachment must be 3 MB or smaller.",
        ),
    )
    .default([]),
});

type CreateTicketFormValues = z.input<typeof createTicketSchema>;
type CreateTicketFormSubmitValues = z.output<typeof createTicketSchema>;

interface CreateTicketModalProps {
  open: boolean;
  onClose: () => void;
  boardId: number | null;
  columns: TicketBoardColumn[];
  defaultColumnId?: number | null;
  onCreated: (ticket: Ticket, columnId: number) => void;
}

export const CreateTicketModal = ({
  open,
  onClose,
  boardId,
  columns,
  defaultColumnId,
  onCreated,
}: CreateTicketModalProps) => {
  const { user } = useUserStore();
  const [boardUsers, setBoardUsers] = useState<User[]>([]);

  const availableColumns = useMemo(
    () =>
      columns.filter(
        (column): column is TicketBoardColumn & { id: number } =>
          typeof column.id === "number",
      ),
    [columns],
  );

  const resolvedDefaultColumnId = useMemo(() => {
    if (
      typeof defaultColumnId === "number" &&
      availableColumns.some((column) => column.id === defaultColumnId)
    ) {
      return defaultColumnId;
    }

    return availableColumns[0]?.id ?? 0;
  }, [availableColumns, defaultColumnId]);

  const resolvedDefaultAssignedUserId = useMemo(() => {
    if (user && boardUsers.some((candidate) => candidate.id === user.id)) {
      return user.id;
    }

    return boardUsers[0]?.id ?? 0;
  }, [boardUsers, user]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    getValues,
    setError,
    clearErrors,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateTicketFormValues, undefined, CreateTicketFormSubmitValues>({
    resolver: zodResolver(createTicketSchema),
    defaultValues: {
      title: "",
      description: "",
      priority: "High",
      assignedUserId: 0,
      columnId: 0,
      acceptanceCriteria: "",
      attachments: [],
    },
  });

  const attachments = watch("attachments") ?? [];

  useEffect(() => {
    if (open) {
      reset({
        title: "",
        description: "",
        priority: "High",
        assignedUserId: resolvedDefaultAssignedUserId,
        columnId: resolvedDefaultColumnId,
        acceptanceCriteria: "",
        attachments: [],
      });
    }
  }, [open, reset, resolvedDefaultAssignedUserId, resolvedDefaultColumnId]);

  useEffect(() => {
    if (!open || !boardId) {
      return;
    }

    const loadBoardUsers = async () => {
      try {
        const users = await ticketBoardService.getUsersByBoardId(boardId);
        setBoardUsers(users);
      } catch (error) {
        console.error("Failed to load board users:", error);
        setBoardUsers([]);
      }
    };

    loadBoardUsers();
  }, [open, boardId]);

  if (!open) {
    return null;
  }

  const handleAttachmentChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    const oversizedFile = selectedFiles.find(
      (file) => file.size > MAX_ATTACHMENT_SIZE,
    );

    if (oversizedFile) {
      setError("attachments", {
        type: "validate",
        message: `${oversizedFile.name} exceeds the 3 MB limit.`,
      });
      event.target.value = "";
      return;
    }

    clearErrors("attachments");
    setValue(
      "attachments",
      [...(getValues("attachments") ?? []), ...selectedFiles],
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    );
    event.target.value = "";
  };

  const handleRemoveAttachment = (indexToRemove: number) => {
    setValue(
      "attachments",
      attachments.filter((_, index) => index !== indexToRemove),
      {
        shouldDirty: true,
        shouldValidate: true,
      },
    );
    clearErrors("attachments");
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!boardId) {
      Swal.fire({
        icon: "error",
        title: "Missing Board",
        text: "Board context is missing. Refresh and try again.",
      });
      return;
    }

    const selectedColumn = columns.find((column) => column.id === values.columnId);
    const sortOrder = (selectedColumn?.tickets?.length ?? 0) + 1;

    try {
      const createdTicket = await ticketService.addTicket(
        {
          board_id: boardId,
          assigned_user_id: values.assignedUserId,
          title: values.title,
          description: values.description,
          acceptance_criteria: values.acceptanceCriteria,
          priority: PRIORITY_MAP[values.priority],
          sort_order: sortOrder,
          column_id: values.columnId,
        },
        values.attachments,
      );

      onCreated(createdTicket, values.columnId);

      reset({
        title: "",
        description: "",
        priority: "High",
        assignedUserId: resolvedDefaultAssignedUserId,
        columnId: resolvedDefaultColumnId,
        acceptanceCriteria: "",
        attachments: [],
      });
      onClose();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Ticket Creation Failed",
        text: getErrorMessage(
          error,
          "An error occurred while creating the ticket. Please try again.",
        ),
      });
    }
  });

  return (
    <div
      className="board-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-ticket-title"
    >
      <div className="board-modal-card">
        <div className="board-modal-head">
          <h2 id="create-ticket-title">Create Ticket</h2>
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Close create ticket modal"
          >
            X
          </button>
        </div>

        <form className="form-preview" onSubmit={onSubmit} noValidate>
          <label>
            Title
            <input
              type="text"
              className={`field field-input${errors.title ? " field-invalid" : ""}`}
              maxLength={100}
              placeholder="Improve onboarding checklist hierarchy"
              {...register("title")}
            />
            <div className="field-meta-row">
              <span className="field-hint">
                Required, up to 100 characters.
              </span>
              <span className="field-counter">{watch("title").length}/100</span>
            </div>
            {errors.title && (
              <p className="field-error">{errors.title.message}</p>
            )}
          </label>

          <label>
            Description
            <textarea
              className={`field field-input field-lg field-textarea${errors.description ? " field-invalid" : ""}`}
              maxLength={2000}
              placeholder="Clarify first-run tasks and streamline product to design handoff."
              {...register("description")}
            />
            <div className="field-meta-row">
              <span className="field-hint">
                Required, up to 2000 characters.
              </span>
              <span className="field-counter">
                {watch("description").length}/2000
              </span>
            </div>
            {errors.description && (
              <p className="field-error">{errors.description.message}</p>
            )}
          </label>

          <div className="form-row">
            <label>
              Priority
              <select
                className={`field field-input${errors.priority ? " field-invalid" : ""}`}
                {...register("priority")}
              >
                {PRIORITY_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {errors.priority && (
                <p className="field-error">{errors.priority.message}</p>
              )}
            </label>

            <label>
              List
              <select
                className={`field field-input${errors.columnId ? " field-invalid" : ""}`}
                {...register("columnId")}
              >
                {availableColumns.map((column) => (
                  <option key={column.id} value={column.id}>
                    {column.column_name}
                  </option>
                ))}
              </select>
              {errors.columnId && (
                <p className="field-error">{errors.columnId.message}</p>
              )}
            </label>
          </div>

          <label>
            Assigned User
            <select
              className={`field field-input${errors.assignedUserId ? " field-invalid" : ""}`}
              {...register("assignedUserId")}
            >
              {boardUsers.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.full_name}
                </option>
              ))}
            </select>
            {errors.assignedUserId && (
              <p className="field-error">{errors.assignedUserId.message}</p>
            )}
          </label>

          <label>
            Acceptance Criteria
            <textarea
              className={`field field-input field-lg field-textarea${errors.acceptanceCriteria ? " field-invalid" : ""}`}
              maxLength={2000}
              placeholder="Checklist for scope, outcome, and release readiness."
              {...register("acceptanceCriteria")}
            />
            <div className="field-meta-row">
              <span className="field-hint">
                Optional, up to 2000 characters.
              </span>
              <span className="field-counter">
                {watch("acceptanceCriteria").length}/2000
              </span>
            </div>
            {errors.acceptanceCriteria && (
              <p className="field-error">{errors.acceptanceCriteria.message}</p>
            )}
          </label>

          <div className="attachment-section">
            <div className="attachment-copy">
              <strong>Attachments</strong>
              <p>
                Upload supporting files. Each attachment must be 3 MB or
                smaller.
              </p>
            </div>

            <label
              className="attachment-dropzone"
              htmlFor="create-ticket-attachments"
            >
              <span className="attachment-button">Choose files</span>
              <span className="attachment-dropzone-copy">
                Add one or more attachments to this ticket.
              </span>
            </label>
            <input
              id="create-ticket-attachments"
              type="file"
              className="attachment-input"
              multiple
              onChange={handleAttachmentChange}
            />

            {errors.attachments && (
              <p className="field-error">{errors.attachments.message}</p>
            )}

            {attachments.length > 0 && (
              <ul className="attachment-list">
                {attachments.map((file, index) => (
                  <li
                    key={`${file.name}-${file.lastModified}`}
                    className="attachment-item"
                  >
                    <div>
                      <strong>{file.name}</strong>
                      <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                    <button
                      type="button"
                      className="attachment-remove"
                      onClick={() => handleRemoveAttachment(index)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={
                isSubmitting ||
                !boardId ||
                availableColumns.length === 0 ||
                boardUsers.length === 0
              }
            >
              {isSubmitting && <i className="fas fa-spinner fa-spin" />}
              Create Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
