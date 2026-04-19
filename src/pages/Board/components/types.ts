export type TicketTone = "blue" | "green" | "pink" | "yellow";

export interface BoardTicket {
  id: string;
  title: string;
  description: string;
  meta: string;
  assignee: string;
  tone: TicketTone;
}

export interface BoardListModel {
  id: string;
  title: string;
  color?: string;
  tickets: BoardTicket[];
}