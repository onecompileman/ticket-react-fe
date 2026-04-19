import type { User } from "../stores/userStore";
import type { TicketBoard } from "./TicketBoard";
import type { Ticket } from "./Ticket";

export class TicketBoardColumn {
  id?: number;
  board!: TicketBoard | { id: number };
  created_by!: User | { id: number };
  column_name!: string;
  sort_order!: number;
  color!: string;

  tickets?: Ticket[]; 
}



