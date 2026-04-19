// services/ticketBoardColumnService.ts
import type { TicketBoardColumn } from '../../shared/models/TicketBoardColumn';
import { httpClient } from '../httpClient';

export type CreateTicketBoardColumnPayload = {
  board_id: number;
  column_name: string;
  sort_order: number;
  color: string;
};

export type UpdateTicketBoardColumnPayload = {
  column_name?: string;
  sort_order?: number;
};

class TicketBoardColumnService {
  addTicketBoardColumn(payload: CreateTicketBoardColumnPayload): Promise<TicketBoardColumn> {
    const path = '/ticket-board-column/add';
    return httpClient.post(path, payload, { withAuth: true });
  }

  updateTicketBoardColumn(id: number, payload: UpdateTicketBoardColumnPayload): Promise<TicketBoardColumn> {
    const path = `/ticket-board-column/update/${id}`;
    return httpClient.put(path, payload, { withAuth: true });
  }

  deleteTicketBoardColumn(id: number): Promise<void> {
    const path = `/ticket-board-column/delete/${id}`;
    return httpClient.delete(path, { withAuth: true });
  }
}

export const ticketBoardColumnService = new TicketBoardColumnService();