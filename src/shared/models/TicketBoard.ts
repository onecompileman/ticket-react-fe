import type { User } from "../stores/userStore";
import type { TicketWithDetails } from "./Ticket";
import type { TicketBoardColumn } from "./TicketBoardColumn";

export class TicketBoard {
  id?: number;
  sys_id?: string;
  board_name!: string;
  board_color!: string;
  board_description!: string;
  created_by!: User | { id: number };
  created_at?: Date;
  updated_at?: Date;
}


export class TicketBoardWithDetails extends TicketBoard {
  tickets!: TicketWithDetails[];
  boardColumns!: TicketBoardColumn[];
  users!: User[];
}


export class TicketBoardUser {
  id?: number;
  board!: TicketBoard | { id: number };
  user!: User | { id: number };
}
  