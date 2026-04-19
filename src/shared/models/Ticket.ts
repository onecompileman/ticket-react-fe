import type { User } from '../stores/userStore';
import type { TicketBoard } from './TicketBoard';
import type { TicketBoardColumn } from './TicketBoardColumn';

export class Ticket {
  id?: number;
  board: TicketBoard | { id: number };
  assigned_user: User | { id: number };
  created_by: User | { id: number };
  sys_id?: string;
  title: string;
  description: string;
  acceptance_criteria: string;
  priority: number;
  sort_order: number;
  column: TicketBoardColumn | { id: number };
  created_at?: Date;
  updated_at?: Date;
}

export class TicketSubtask {
  id?: number;
  ticket: Ticket | { id: number };
  task: string;
  is_completed: boolean;
  created_at?: Date;
  created_by: User | { id: number };
}

export class TicketComment {
  id?: number;
  ticket: Ticket | { id: number };
  user: User | { id: number };
  comment: string;
  created_at?: Date;
}

export class TicketAttachment {
  id?: number;
  ticket: Ticket | { id: number };
  file_url: string;
  file_name: string;
  created_at?: Date;
  created_by: User | { id: number };
}

export class TicketActivity {
  id?: number;
  ticket: Ticket | { id: number };
  user: User | { id: number };
  log: string;
  created_at?: Date;
}

export class TicketWithDetails extends Ticket {
  subtasks: TicketSubtask[];
  attachments: TicketAttachment[];
  activities: TicketActivity[];
}
