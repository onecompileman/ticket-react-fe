import type { Ticket } from "../../../shared/models/Ticket";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TicketItemProps {
  ticket: Ticket;
  sortableId: string;
  onViewTicket: (ticket: Ticket) => void;
}

const getNormalizedPriority = (priority: number) => {
  if (priority >= 0 && priority <= 3) {
    return priority + 1;
  }

  return priority;
};

const getPriorityTone = (priority: number) => {
  const normalizedPriority = getNormalizedPriority(priority);

  if (normalizedPriority <= 1) {
    return "blue";
  }

  if (normalizedPriority === 2) {
    return "green";
  }

  if (normalizedPriority === 3) {
    return "yellow";
  }

  return "pink";
};

const getPriorityLabel = (priority: number) => {
  const normalizedPriority = getNormalizedPriority(priority);

  if (normalizedPriority <= 1) {
    return "Low";
  }

  if (normalizedPriority === 2) {
    return "Medium";
  }

  if (normalizedPriority === 3) {
    return "High";
  }

  return "Critical";
};

const getAssigneeLabel = (ticket: Ticket) => {
  const assignedUser = ticket.assigned_user;

  if ("full_name" in assignedUser && assignedUser.full_name) {
    return assignedUser.full_name;
  }

  if ("id" in assignedUser) {
    return `User #${assignedUser.id}`;
  }

  return "Unassigned";
};

const getTicketMeta = (ticket: Ticket) => {
  if (ticket.sys_id) {
    return ticket.sys_id;
  }

  if (ticket.id) {
    return `Ticket #${ticket.id}`;
  }

  return getPriorityLabel(ticket.priority);
};

const getSubtaskProgress = (ticket: Ticket) => {
  const ticketRecord = ticket as unknown as Record<string, unknown>;
  const subtasksValue = ticketRecord.subtasks ?? ticketRecord.ticket_subtasks;

  if (!Array.isArray(subtasksValue)) {
    return null;
  }

  const total = subtasksValue.length;

  if (total === 0) {
    return null;
  }

  const completed = subtasksValue.filter(
    (subtask) =>
      typeof subtask === "object" &&
      subtask !== null &&
      "is_completed" in subtask &&
      Boolean((subtask as { is_completed?: unknown }).is_completed),
  ).length;

  const percent = Math.round((completed / total) * 100);

  return {
    completed,
    total,
    percent,
  };
};

export const TicketItem = ({ ticket, sortableId, onViewTicket }: TicketItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const priorityTone = getPriorityTone(ticket.priority);
  const subtaskProgress = getSubtaskProgress(ticket);

  return (
    <button
      ref={setNodeRef}
      type="button"
      className="ticket-card"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.72 : 1,
      }}
      onClick={() => onViewTicket(ticket)}
      {...attributes}
      {...listeners}
    >
      <span className={`ticket-tag ticket-tag-${priorityTone}`} />
      <h3>{ticket.title}</h3>
      <p>{ticket.description}</p>
      {subtaskProgress && (
        <div className="ticket-subtasks-progress">
          <div className="ticket-subtasks-meta">
            <span>Subtasks</span>
            <span>
              {subtaskProgress.completed}/{subtaskProgress.total}
            </span>
          </div>
          <div className="ticket-subtasks-track" aria-hidden="true">
            <div
              className="ticket-subtasks-fill"
              style={{ width: `${subtaskProgress.percent}%` }}
            />
          </div>
        </div>
      )}
      <div className="ticket-meta">
        <span>{getTicketMeta(ticket)}</span>
        <span>{getAssigneeLabel(ticket)}</span>
      </div>
    </button>
  );
};