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
}

export const ticketBoardService = new TicketBoardService();
