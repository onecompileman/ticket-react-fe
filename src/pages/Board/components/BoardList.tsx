import type { TicketBoardColumn } from "../../../shared/models/TicketBoardColumn";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { TicketItem } from "./TicketItem";

const COLUMN_DROP_PREFIX = "column-drop:";
const TICKET_PREFIX = "ticket:";

const getTicketSortableId = (ticketId: number) => `${TICKET_PREFIX}${ticketId}`;

interface BoardListProps {
  list: TicketBoardColumn;
  sortableId: string;
  onAddTicket: (columnId: number) => void;
  onEditList: () => void;
  onDeleteList: () => void;
  onViewTicket: (payload: { ticket: NonNullable<TicketBoardColumn["tickets"]>[number]; status: string }) => void;
}

export const BoardList = ({ list, sortableId, onAddTicket, onEditList, onDeleteList, onViewTicket }: BoardListProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: sortableId });

  const { setNodeRef: setDropRef } = useDroppable({
    id: `${COLUMN_DROP_PREFIX}${String(list.id ?? sortableId)}`,
  });

  const sortableTicketIds = (list.tickets ?? [])
    .filter((ticket): ticket is NonNullable<TicketBoardColumn["tickets"]>[number] & { id: number } => typeof ticket.id === "number")
    .map((ticket) => getTicketSortableId(ticket.id));

  const style = {
    ...(list.color ? { backgroundColor: list.color } : undefined),
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.75 : 1,
  };

  return (
    <article
      ref={setNodeRef}
      className="board-column"
      style={style}
    >
      <div className="column-head" {...attributes} {...listeners}>
        <h2>{list.column_name}</h2>
        <div className="column-actions">
          <button type="button" className="column-action" onClick={onEditList}>
            Edit
          </button>
          <button type="button" className="column-action column-action-danger" onClick={onDeleteList}>
            Delete
          </button>
        </div>
      </div>

      <div ref={setDropRef} className="ticket-dropzone">
        <SortableContext items={sortableTicketIds} strategy={verticalListSortingStrategy}>
          {list.tickets?.map((ticket) => {
            if (typeof ticket.id !== "number") {
              return null;
            }

            return (
              <TicketItem
                key={ticket.id}
                ticket={ticket}
                sortableId={getTicketSortableId(ticket.id)}
                onViewTicket={(selectedTicket) =>
                  onViewTicket({ ticket: selectedTicket, status: list.column_name })
                }
              />
            );
          })}
        </SortableContext>
      </div>

      <button
        type="button"
        className="add-card"
        onClick={() => {
          if (typeof list.id === "number") {
            onAddTicket(list.id);
          }
        }}
        disabled={typeof list.id !== "number"}
      >
        + Add a card
      </button>
    </article>
  );
};