import type {
  TicketBoard,
  TicketBoardWithDetails,
} from '../../shared/models/TicketBoard';
import type { User } from '../../shared/stores/userStore';
import { httpClient } from '../httpClient';

export type UpdateTicketBoardPayload = {
  board_name?: string;
  board_color?: string;
  board_description?: string;
};

export type ImportBoardJsonPayload = {
  created_by_id: number;
  creator_email?: string;
  creator_name?: string;
  board: {
    board_name: string;
    board_color: string;
    board_description: string;
  };
  columns?: Array<{
    key?: string;
    column_name: string;
    sort_order?: number;
    color: string;
  }>;
  tickets?: Array<{
    title: string;
    description: string;
    acceptance_criteria?: string;
    priority?: number;
    sort_order?: number;
    column_id?: number;
    column_key?: string;
    column_index?: number;
    assigned_user_id?: number;
  }>;
  invite_emails?: string[];
};

class TicketBoardService {
  addTicketBoard(ticketBoard: TicketBoard): Promise<TicketBoard> {
    const path = '/ticket-board/add';
    return httpClient.post(path, ticketBoard, { withAuth: true });
  }

  deleteTicketBoard(id: number): Promise<void> {
    const path = `/ticket-board/delete/${id}`;
    return httpClient.delete(path, { withAuth: true });
  }

  getAllTicketBoards(): Promise<TicketBoard[]> {
    const path = '/ticket-board/get-all';
    return httpClient.get(path, { withAuth: true });
  }

  getTicketBoardById(id: number): Promise<TicketBoardWithDetails> {
    const path = `/ticket-board/get/${id}`;
    return httpClient.get(path, { withAuth: true });
  }

  updateTicketBoard(
    id: number,
    payload: UpdateTicketBoardPayload,
  ): Promise<TicketBoard> {
    const path = `/ticket-board/update/${id}`;
    return httpClient.put(path, payload, { withAuth: true });
  }

  getUsersByBoardId(boardId: number): Promise<User[]> {
    const path = `/ticket-board/get-users/${boardId}`;
    return httpClient.get(path, { withAuth: true });
  }

  importBoardJsonStart(payload: ImportBoardJsonPayload): Promise<void> {
    const path = '/import/board-json/start';
    return httpClient.post(path, payload, { withAuth: true });
  }
}

export const ticketBoardService = new TicketBoardService();
