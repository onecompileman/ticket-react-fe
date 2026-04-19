import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Swal from "sweetalert2";
import { ticketService } from "../../../api/services/TicketService";
import type {
  Ticket,
  TicketComment,
  TicketSubtask,
} from "../../../shared/models/Ticket";
import type { TicketBoardColumn } from "../../../shared/models/TicketBoardColumn";
import { useUserStore } from "../../../shared/stores/userStore";
import type { User } from "../../../shared/stores/userStore";

type TicketTab = "attachments" | "activity";

const MAX_ATTACHMENT_SIZE = 4 * 1024 * 1024;

const viewTicketSchema = z.object({
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
  acceptanceCriteria: z
    .string()
    .trim()
    .max(2000, "Acceptance criteria must be 2000 characters or fewer."),
  priority: z.coerce.number().int().min(1).max(4),
  assignedUserId: z.coerce.number().int().positive({
    message: "Please select an assignee.",
  }),
  columnId: z.coerce.number().int().positive({
    message: "Please select a status.",
  }),
});

type ViewTicketFormValues = z.input<typeof viewTicketSchema>;
type ViewTicketFormSubmitValues = z.output<typeof viewTicketSchema>;

interface ModalAttachment {
  id: string;
  entityId: number | null;
  name: string;
  type: string;
  url: string;
}

interface ModalSubtask {
  id: string;
  entityId: number | null;
  title: string;
  isDone: boolean;
}

interface ModalActivity {
  id: string;
  actor: string;
  summary: string;
}

interface ModalComment {
  id: string;
  entityId: number | null;
  author: string;
  body: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null;
};

const getUserName = (value: unknown, fallback: string) => {
  if (!isRecord(value)) {
    return fallback;
  }

  if (typeof value.full_name === "string" && value.full_name.trim()) {
    return value.full_name;
  }

  if (typeof value.id === "number") {
    return `User #${value.id}`;
  }

  return fallback;
};

const getUserEmail = (value: unknown, fallback: string) => {
  if (!isRecord(value)) {
    return fallback;
  }

  if (typeof value.email === "string" && value.email.trim()) {
    return value.email;
  }

  if (typeof value.full_name === "string" && value.full_name.trim()) {
    return value.full_name;
  }

  if (typeof value.id === "number") {
    return `User #${value.id}`;
  }

  return fallback;
};

const getUserId = (value: unknown) => {
  if (!isRecord(value)) {
    return null;
  }

  return typeof value.id === "number" ? value.id : null;
};

const getRecordArray = (source: Record<string, unknown>, keys: string[]) => {
  for (const key of keys) {
    const value = source[key];

    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }

  return [];
};

const buildAttachmentFromRecord = (
  value: Record<string, unknown>,
  index: number,
): ModalAttachment => {
  const rawUrl = typeof value.file_url === "string" ? value.file_url : "";
  const rawFileName = typeof value.file_name === "string" ? value.file_name : "";
  const rawName = typeof value.name === "string" ? value.name : "";
  const fallbackName = rawUrl ? rawUrl.split("/").pop() ?? rawUrl : `Attachment ${index + 1}`;
  const name = rawFileName || rawName || fallbackName;
  const extension = name.includes(".")
    ? name.split(".").pop()?.toUpperCase() ?? "FILE"
    : "FILE";

  return {
    id:
      typeof value.id === "number"
        ? `attachment-${value.id}`
        : `attachment-${index}-${name}`,
    entityId: typeof value.id === "number" ? value.id : null,
    name,
    type: extension,
    url: rawUrl,
  };
};

const buildSubtaskFromApi = (
  subtask: TicketSubtask,
  fallbackKey: string,
): ModalSubtask => ({
  id:
    typeof subtask.id === "number"
      ? `subtask-${subtask.id}`
      : `subtask-${fallbackKey}`,
  entityId: typeof subtask.id === "number" ? subtask.id : null,
  title: subtask.task,
  isDone: Boolean(subtask.is_completed),
});

const buildCommentFromApi = (
  comment: TicketComment,
  fallbackKey: string,
): ModalComment => ({
  id:
    typeof comment.id === "number"
      ? `comment-${comment.id}`
      : `comment-${fallbackKey}`,
  entityId: typeof comment.id === "number" ? comment.id : null,
  author: getUserName(comment.user, "Unknown"),
  body: comment.comment,
});

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

interface ViewTicketModalProps {
  open: boolean;
  ticket: Ticket | null;
  columns: TicketBoardColumn[];
  users: User[];
  onUpdated: (ticket: Ticket) => void;
  onDeleted: (ticketId: number) => void;
  onClose: () => void;
}

export const ViewTicketModal = ({
  open,
  ticket,
  columns,
  users,
  onUpdated,
  onDeleted,
  onClose,
}: ViewTicketModalProps) => {
  const [activeTab, setActiveTab] = useState<TicketTab>("attachments");
  const [attachments, setAttachments] = useState<ModalAttachment[]>([]);
  const [subtasks, setSubtasks] = useState<ModalSubtask[]>([]);
  const [activities, setActivities] = useState<ModalActivity[]>([]);
  const [comments, setComments] = useState<ModalComment[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [editingSubtaskId, setEditingSubtaskId] = useState<string | null>(null);
  const [editingSubtaskTitle, setEditingSubtaskTitle] = useState("");
  const [subtaskError, setSubtaskError] = useState("");
  const [commentError, setCommentError] = useState("");
  const [newCommentBody, setNewCommentBody] = useState("");
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentBody, setEditingCommentBody] = useState("");

  const { user } = useUserStore();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ViewTicketFormValues, undefined, ViewTicketFormSubmitValues>({
    resolver: zodResolver(viewTicketSchema),
    defaultValues: {
      title: "",
      description: "",
      acceptanceCriteria: "",
      priority: 3,
      assignedUserId: 0,
      columnId: 0,
    },
  });

  const availableColumns = useMemo(
    () =>
      columns.filter(
        (column): column is TicketBoardColumn & { id: number } =>
          typeof column.id === "number",
      ),
    [columns],
  );

  const normalizePriority = (priority: number) => {
    if (priority >= 0 && priority <= 3) {
      return priority + 1;
    }

    if (priority < 1) {
      return 1;
    }

    if (priority > 4) {
      return 4;
    }

    return priority;
  };

  const reporterName = useMemo(() => {
    if (!ticket) {
      return "Unknown";
    }

    return getUserName(ticket.created_by, "Unknown");
  }, [ticket]);

  const canDeleteTicket = useMemo(() => {
    if (!ticket || !user) {
      return false;
    }

    return getUserId(ticket.created_by) === user.id;
  }, [ticket, user]);

  const applyTicketDetails = (ticketData: Ticket) => {
    const ticketRecord = ticketData as unknown as Record<string, unknown>;
    const rawAttachments = getRecordArray(ticketRecord, [
      "attachments",
      "ticket_attachments",
    ]);
    const rawSubtasks = getRecordArray(ticketRecord, ["subtasks", "ticket_subtasks"]);
    const rawActivities = getRecordArray(ticketRecord, ["activities", "ticket_activities"]);
    const rawComments = getRecordArray(ticketRecord, ["comments", "ticket_comments"]);

    reset({
      title: ticketData.title,
      description: ticketData.description,
      acceptanceCriteria: ticketData.acceptance_criteria ?? "",
      priority: normalizePriority(ticketData.priority),
      assignedUserId: getUserId(ticketData.assigned_user) ?? users[0]?.id ?? 0,
      columnId:
        (isRecord(ticketData.column) && typeof ticketData.column.id === "number"
          ? ticketData.column.id
          : null) ??
        availableColumns[0]?.id ??
        0,
    });
    setAttachments(
      rawAttachments.map((attachment, index) =>
        buildAttachmentFromRecord(attachment, index),
      ),
    );
    setSubtasks(
      rawSubtasks.map((subtask, index) => ({
        id:
          typeof subtask.id === "number"
            ? `subtask-${subtask.id}`
            : `subtask-${index}-${String(subtask.task ?? "")}`,
        entityId: typeof subtask.id === "number" ? subtask.id : null,
        title: typeof subtask.task === "string" ? subtask.task : `Subtask ${index + 1}`,
        isDone: Boolean(subtask.is_completed),
      })),
    );
    setActivities(
      rawActivities.map((activity, index) => ({
        id:
          typeof activity.id === "number"
            ? `activity-${activity.id}`
            : `activity-${index}`,
        actor: getUserEmail(activity.user, "Unknown"),
        summary:
          typeof activity.log === "string" && activity.log.trim()
            ? activity.log
            : "Activity recorded.",
      })),
    );
    setComments(
      rawComments.map((comment, index) => ({
        id:
          typeof comment.id === "number"
            ? `comment-${comment.id}`
            : `comment-${index}`,
        entityId: typeof comment.id === "number" ? comment.id : null,
        author: getUserName(comment.user, "Unknown"),
        body:
          typeof comment.comment === "string" && comment.comment.trim()
            ? comment.comment
            : "",
      })),
    );
    setNewSubtaskTitle("");
    setEditingSubtaskId(null);
    setEditingSubtaskTitle("");
    setSubtaskError("");
    setCommentError("");
    setNewCommentBody("");
    setEditingCommentId(null);
    setEditingCommentBody("");
    clearErrors("root");
  };

  const refreshTicketDetailsSilently = async () => {
    if (!ticket || typeof ticket.id !== "number") {
      return;
    }

    try {
      const refreshedTicket = await ticketService.getTicketById(ticket.id);
      applyTicketDetails(refreshedTicket);
      onUpdated(refreshedTicket);
    } catch {
      // Silent refresh should never interrupt the user's current flow.
    }
  };

  useEffect(() => {
    if (!open || !ticket) {
      return;
    }

    setActiveTab("attachments");

    applyTicketDetails(ticket);
  }, [open, ticket, reset, clearErrors, users, availableColumns]);

  if (!open || !ticket) {
    return null;
  }

  const handleAddAttachments = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    const oversizedFile = files.find((file) => file.size > MAX_ATTACHMENT_SIZE);

    if (oversizedFile) {
      setError("root", {
        type: "validate",
        message: `${oversizedFile.name} exceeds the 4 MB limit.`,
      });
      event.target.value = "";
      return;
    }

    clearErrors("root");

    if (typeof ticket.id !== "number") {
      setError("root", {
        type: "validate",
        message: "Missing ticket id. Refresh and try again.",
      });
      event.target.value = "";
      return;
    }

    try {
      await Promise.all(
        files.map((file) => ticketService.addTicketAttachmentFile(ticket.id as number, file)),
      );
      void refreshTicketDetailsSilently();
    } catch (error) {
      setError("root", {
        type: "server",
        message: getErrorMessage(
          error,
          "Could not upload attachment. Please try again.",
        ),
      });
    }

    event.target.value = "";
  };

  const handleRemoveAttachment = async (attachment: ModalAttachment) => {
    if (attachment.entityId === null) {
      setAttachments((previousAttachments) =>
        previousAttachments.filter((item) => item.id !== attachment.id),
      );
      return;
    }

    try {
      await ticketService.deleteTicketAttachment(attachment.entityId);
      void refreshTicketDetailsSilently();
    } catch (error) {
      setError("root", {
        type: "server",
        message: getErrorMessage(
          error,
          "Could not delete attachment. Please try again.",
        ),
      });
    }
  };

  const handleToggleSubtask = async (subtask: ModalSubtask) => {
    const nextIsDone = !subtask.isDone;

    setSubtasks((previousSubtasks) =>
      previousSubtasks.map((item) =>
        item.id === subtask.id
          ? { ...item, isDone: nextIsDone }
          : item,
      ),
    );

    if (subtask.entityId === null) {
      return;
    }

    try {
      const updatedSubtask = await ticketService.updateTicketSubtask(subtask.entityId, {
        is_completed: nextIsDone,
      });
      setSubtasks((previousSubtasks) =>
        previousSubtasks.map((item) =>
          item.entityId === subtask.entityId
            ? buildSubtaskFromApi(updatedSubtask, item.id)
            : item,
        ),
      );
      setSubtaskError("");
      void refreshTicketDetailsSilently();
    } catch (error) {
      // Revert optimistic state if the API call fails.
      setSubtasks((previousSubtasks) =>
        previousSubtasks.map((item) =>
          item.id === subtask.id
            ? { ...item, isDone: subtask.isDone }
            : item,
        ),
      );
      setSubtaskError(
        getErrorMessage(error, "Could not update subtask. Please try again."),
      );
    }
  };

  const handleAddSubtask = async () => {
    const normalizedTitle = newSubtaskTitle.trim();

    if (!normalizedTitle) {
      setSubtaskError("Subtask title is required.");
      return;
    }

    if (normalizedTitle.length > 120) {
      setSubtaskError("Subtask title must be 120 characters or fewer.");
      return;
    }

    if (typeof ticket.id !== "number") {
      setSubtaskError("Missing ticket id. Refresh and try again.");
      return;
    }

    try {
      const createdSubtask = await ticketService.addTicketSubtask(ticket.id, {
        task: normalizedTitle,
        is_completed: false,
      });
      setSubtasks((previousSubtasks) => [
        ...previousSubtasks,
        buildSubtaskFromApi(createdSubtask, `${Date.now()}`),
      ]);
      setSubtaskError("");
      setNewSubtaskTitle("");
      void refreshTicketDetailsSilently();
    } catch (error) {
      setSubtaskError(
        getErrorMessage(error, "Could not add subtask. Please try again."),
      );
    }
  };

  const handleBeginEditSubtask = (subtask: ModalSubtask) => {
    setEditingSubtaskId(subtask.id);
    setEditingSubtaskTitle(subtask.title);
  };

  const handleSaveSubtask = async (subtask: ModalSubtask) => {
    const normalizedTitle = editingSubtaskTitle.trim();

    if (!normalizedTitle) {
      setSubtaskError("Subtask title is required.");
      return;
    }

    if (normalizedTitle.length > 120) {
      setSubtaskError("Subtask title must be 120 characters or fewer.");
      return;
    }

    if (subtask.entityId === null) {
      setSubtasks((previousSubtasks) =>
        previousSubtasks.map((item) =>
          item.id === subtask.id
            ? { ...item, title: normalizedTitle }
            : item,
        ),
      );
      setEditingSubtaskId(null);
      setEditingSubtaskTitle("");
      setSubtaskError("");
      return;
    }

    try {
      const updatedSubtask = await ticketService.updateTicketSubtask(subtask.entityId, {
        task: normalizedTitle,
      });
      setSubtasks((previousSubtasks) =>
        previousSubtasks.map((item) =>
          item.entityId === subtask.entityId
            ? buildSubtaskFromApi(updatedSubtask, item.id)
            : item,
        ),
      );
      setEditingSubtaskId(null);
      setEditingSubtaskTitle("");
      setSubtaskError("");
      void refreshTicketDetailsSilently();
    } catch (error) {
      setSubtaskError(
        getErrorMessage(error, "Could not update subtask. Please try again."),
      );
    }
  };

  const handleCancelEditSubtask = () => {
    setEditingSubtaskId(null);
    setEditingSubtaskTitle("");
    setSubtaskError("");
  };

  const handleDeleteSubtask = async (subtask: ModalSubtask) => {
    if (subtask.entityId === null) {
      setSubtasks((previousSubtasks) =>
        previousSubtasks.filter((item) => item.id !== subtask.id),
      );
      return;
    }

    try {
      await ticketService.deleteTicketSubtask(subtask.entityId);
      setSubtasks((previousSubtasks) =>
        previousSubtasks.filter((item) => item.entityId !== subtask.entityId),
      );
      setSubtaskError("");
      void refreshTicketDetailsSilently();
    } catch (error) {
      setSubtaskError(
        getErrorMessage(error, "Could not delete subtask. Please try again."),
      );
    }
  };

  const handleAddComment = async () => {
    const normalizedBody = newCommentBody.trim();

    if (!normalizedBody) {
      setCommentError("Comment is required.");
      return;
    }

    if (typeof ticket.id !== "number") {
      setCommentError("Missing ticket id. Refresh and try again.");
      return;
    }

    try {
      const createdComment = await ticketService.addTicketComment(ticket.id, {
        comment: normalizedBody,
      });
      setComments((previousComments) => [
        ...previousComments,
        buildCommentFromApi(createdComment, `${Date.now()}`),
      ]);
      setCommentError("");
      setNewCommentBody("");
      void refreshTicketDetailsSilently();
    } catch (error) {
      setCommentError(
        getErrorMessage(error, "Could not add comment. Please try again."),
      );
    }
  };

  const handleBeginEditComment = (comment: ModalComment) => {
    setEditingCommentId(comment.id);
    setEditingCommentBody(comment.body);
    setCommentError("");
  };

  const handleCancelEditComment = () => {
    setEditingCommentId(null);
    setEditingCommentBody("");
    setCommentError("");
  };

  const handleSaveComment = async (comment: ModalComment) => {
    const normalizedBody = editingCommentBody.trim();

    if (!normalizedBody) {
      setCommentError("Comment is required.");
      return;
    }

    if (comment.entityId === null) {
      setComments((previousComments) =>
        previousComments.map((item) =>
          item.id === comment.id ? { ...item, body: normalizedBody } : item,
        ),
      );
      setEditingCommentId(null);
      setEditingCommentBody("");
      setCommentError("");
      return;
    }

    try {
      await ticketService.updateTicketComment(comment.entityId, {
        comment: normalizedBody,
      });
      setEditingCommentId(null);
      setEditingCommentBody("");
      setCommentError("");
      void refreshTicketDetailsSilently();
    } catch (error) {
      setCommentError(
        getErrorMessage(error, "Could not update comment. Please try again."),
      );
    }
  };

  const handleDeleteComment = async (comment: ModalComment) => {
    if (comment.entityId === null) {
      setComments((previousComments) =>
        previousComments.filter((item) => item.id !== comment.id),
      );
      return;
    }

    try {
      await ticketService.deleteTicketComment(comment.entityId);
      void refreshTicketDetailsSilently();
    } catch (error) {
      setCommentError(
        getErrorMessage(error, "Could not delete comment. Please try again."),
      );
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    if (typeof ticket.id !== "number") {
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: "Missing ticket id. Refresh and try again.",
      });
      return;
    }

    try {
      const updatedTicket = await ticketService.updateTicket(ticket.id, {
        assigned_user_id: values.assignedUserId,
        title: values.title,
        description: values.description,
        acceptance_criteria: values.acceptanceCriteria,
        priority: values.priority,
        column_id: values.columnId,
      });

      onUpdated(updatedTicket);
      onClose();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text: getErrorMessage(
          error,
          "An error occurred while updating the ticket. Please try again.",
        ),
      });
    }
  });

  const handleDeleteTicket = async () => {
    if (typeof ticket.id !== "number") {
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text: "Missing ticket id. Refresh and try again.",
      });
      return;
    }

    const confirmResult = await Swal.fire({
      icon: "warning",
      title: "Delete Ticket?",
      text: "This action cannot be undone.",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#b55d68",
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

    try {
      await ticketService.deleteTicket(ticket.id);
      onDeleted(ticket.id);
      onClose();
      await Swal.fire({
        icon: "success",
        title: "Ticket Deleted",
        text: "The ticket has been deleted.",
      });
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text: getErrorMessage(
          error,
          "An error occurred while deleting the ticket. Please try again.",
        ),
      });
    }
  };

  return (
    <div
      className="board-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-detail-title"
    >
      <form className="board-modal-card ticket-detail-card" onSubmit={onSubmit} noValidate>
        <div className="board-modal-head">
          <input
            id="ticket-detail-title"
            className={`detail-title-input${errors.title ? " field-invalid" : ""}`}
            maxLength={100}
            aria-label="Ticket title"
            {...register("title")}
          />
          <button
            type="button"
            className="close-btn"
            onClick={onClose}
            aria-label="Close ticket details modal"
          >
            X
          </button>
        </div>
        {errors.title && <p className="field-error">{errors.title.message}</p>}

        <p className="modal-text">{ticket.sys_id ?? `Ticket #${ticket.id ?? "N/A"}`}</p>

        <div className="modal-grid">
          <div>
            <span>Reporter</span>
            <strong>{reporterName}</strong>
          </div>
        </div>

        <div className="form-row">
          <label>
            Priority
            <select
              className={`field field-input${errors.priority ? " field-invalid" : ""}`}
              {...register("priority")}
            >
              <option value={1}>Low</option>
              <option value={2}>Medium</option>
              <option value={3}>High</option>
              <option value={4}>Critical</option>
            </select>
            {errors.priority && <p className="field-error">{errors.priority.message}</p>}
          </label>

          <label>
            Status
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
            {errors.columnId && <p className="field-error">{errors.columnId.message}</p>}
          </label>
        </div>

        <label>
          Assigned User
          <select
            className={`field field-input${errors.assignedUserId ? " field-invalid" : ""}`}
            {...register("assignedUserId")}
          >
            {users.map((boardUser) => (
              <option key={boardUser.id} value={boardUser.id}>
                {`${boardUser.full_name} (${boardUser.email})`}
              </option>
            ))}
          </select>
          {errors.assignedUserId && (
            <p className="field-error">{errors.assignedUserId.message}</p>
          )}
        </label>

        <h3>Description</h3>
        <textarea
          className={`detail-textarea${errors.description ? " field-invalid" : ""}`}
          maxLength={2000}
          aria-label="Ticket description"
          {...register("description")}
        />
        <div className="field-meta-row">
          <span className="field-hint">Required, up to 2000 characters.</span>
          <span className="field-counter">{watch("description").length}/2000</span>
        </div>
        {errors.description && (
          <p className="field-error">{errors.description.message}</p>
        )}

        <h3>Acceptance Criteria</h3>
        <textarea
          className={`detail-textarea${errors.acceptanceCriteria ? " field-invalid" : ""}`}
          maxLength={2000}
          aria-label="Acceptance criteria"
          {...register("acceptanceCriteria")}
        />
        <div className="field-meta-row">
          <span className="field-hint">Optional, up to 2000 characters.</span>
          <span className="field-counter">{watch("acceptanceCriteria").length}/2000</span>
        </div>
        {errors.acceptanceCriteria && (
          <p className="field-error">{errors.acceptanceCriteria.message}</p>
        )}

        <div className="detail-tabs">
          <div className="tab-controls" role="tablist" aria-label="Ticket detail tabs">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "attachments"}
              className={`tab-control${activeTab === "attachments" ? " tab-control-active" : ""}`}
              onClick={() => setActiveTab("attachments")}
            >
              Attachments
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "activity"}
              className={`tab-control${activeTab === "activity" ? " tab-control-active" : ""}`}
              onClick={() => setActiveTab("activity")}
            >
              Activity Log
            </button>
          </div>

          {activeTab === "attachments" && (
            <section className="tab-panel" role="tabpanel" aria-label="Attachments">
              <div className="detail-panel-actions">
                <label className="attachment-add-btn" htmlFor="ticket-detail-attachments">
                  + Add attachment
                </label>
                <input
                  id="ticket-detail-attachments"
                  type="file"
                  className="attachment-input"
                  multiple
                  onChange={handleAddAttachments}
                />
              </div>

              <div className="detail-list">
                {attachments.length === 0 && <p>No attachments yet.</p>}
                {attachments.map((attachment) => (
                  <article key={attachment.id}>
                    <span className="chip">{attachment.type}</span>
                    {attachment.url ? (
                      <a
                        href={attachment.url}
                        download={attachment.name}
                        target="_blank"
                        rel="noreferrer"
                        className="attachment-download-link"
                      >
                        {attachment.name}
                      </a>
                    ) : (
                      <p>{attachment.name}</p>
                    )}
                    <button
                      type="button"
                      className="inline-text-btn"
                      onClick={() => handleRemoveAttachment(attachment)}
                    >
                      Remove
                    </button>
                  </article>
                ))}
              </div>
              {errors.root?.message && (
                <p className="field-error">{errors.root.message}</p>
              )}
            </section>
          )}

          {activeTab === "activity" && (
            <section className="tab-panel" role="tabpanel" aria-label="Activity log">
              <div className="detail-log">
                {activities.length === 0 && <p>No activity yet.</p>}
                {activities.map((activity) => (
                  <p key={activity.id}>
                    <strong>{activity.actor}</strong>: {activity.summary}
                  </p>
                ))}
              </div>
            </section>
          )}
        </div>

        <h3>Subtasks</h3>
        {subtasks.length === 0 ? (
          <p className="modal-text">No subtasks yet.</p>
        ) : (
          <ul className="detail-checklist">
            {subtasks.map((subtask) => {
              const isEditing = editingSubtaskId === subtask.id;

              return (
                <li key={subtask.id}>
                  <button
                    type="button"
                    className={`check check-btn${subtask.isDone ? " is-done" : ""}`}
                    onClick={() => handleToggleSubtask(subtask)}
                    aria-label={`Toggle ${subtask.title}`}
                  />

                  {isEditing ? (
                    <input
                      className="subtask-edit-input"
                      value={editingSubtaskTitle}
                      onChange={(event) => setEditingSubtaskTitle(event.target.value)}
                    />
                  ) : (
                    <span className="subtask-text">{subtask.title}</span>
                  )}

                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        className="inline-text-btn"
                        onClick={() => handleSaveSubtask(subtask)}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        className="inline-text-btn"
                        onClick={handleCancelEditSubtask}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="inline-text-btn"
                      onClick={() => handleBeginEditSubtask(subtask)}
                    >
                      Edit
                    </button>
                  )}
                  <button
                    type="button"
                    className="inline-text-btn"
                    onClick={() => handleDeleteSubtask(subtask)}
                  >
                    Delete
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div className="subtask-add-row">
          <input
            className="subtask-edit-input"
            placeholder="Add a subtask"
            value={newSubtaskTitle}
            onChange={(event) => setNewSubtaskTitle(event.target.value)}
            maxLength={120}
          />
          <button type="button" className="attachment-add-btn" onClick={handleAddSubtask}>
            + Add
          </button>
        </div>
        {subtaskError && <p className="field-error">{subtaskError}</p>}

        <h3>Comments</h3>
        <div className="detail-comments">
          {comments.length === 0 && <article><p>No comments yet.</p></article>}
          {comments.map((comment) => {
            const isEditing = editingCommentId === comment.id;

            return (
              <article key={comment.id}>
                <p>
                  <strong>{comment.author}</strong>
                </p>
                {isEditing ? (
                  <textarea
                    className="comment-input"
                    value={editingCommentBody}
                    onChange={(event) => setEditingCommentBody(event.target.value)}
                  />
                ) : (
                  <p>{comment.body}</p>
                )}
                {isEditing ? (
                  <>
                    <button
                      type="button"
                      className="inline-text-btn"
                      onClick={() => handleSaveComment(comment)}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="inline-text-btn"
                      onClick={handleCancelEditComment}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="inline-text-btn"
                    onClick={() => handleBeginEditComment(comment)}
                  >
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  className="inline-text-btn"
                  onClick={() => handleDeleteComment(comment)}
                >
                  Delete
                </button>
              </article>
            );
          })}
          <textarea
            className="comment-input"
            placeholder="Add comment..."
            value={newCommentBody}
            onChange={(event) => setNewCommentBody(event.target.value)}
          />
          <div>
            <button
              type="button"
              className="attachment-add-btn"
              onClick={handleAddComment}
            >
              Add Comment
            </button>
          </div>
        </div>
        {commentError && <p className="field-error">{commentError}</p>}

        <div className="modal-actions detail-modal-actions">
          {canDeleteTicket && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDeleteTicket}
            >
              Delete Ticket
            </button>
          )}
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting && <i className="fas fa-spinner fa-spin" />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};
