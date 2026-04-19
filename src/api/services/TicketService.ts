// services/ticketService.ts
import type {
  Ticket,
  TicketAttachment,
  TicketComment,
  TicketSubtask,
  TicketWithDetails,
} from '../../shared/models/Ticket';
import type { TicketBoard } from '../../shared/models/TicketBoard';
import { httpClient } from '../httpClient';

export type CreateTicketInput = {
  board_id: number;
  assigned_user_id: number;
  title: string;
  description: string;
  acceptance_criteria: string;
  priority: number;
  sort_order: number;
  column_id: number;
  subtasks?: Array<string | { task: string; is_completed?: boolean }>;
  existingAttachmentUrls?: string[];
};

export const buildCreateTicketFormData = (
  data: CreateTicketInput,
  files: File[] = [],
): FormData => {
  const formData = new FormData();

  formData.append('board_id', String(data.board_id));
  formData.append('assigned_user_id', String(data.assigned_user_id));
  formData.append('title', data.title);
  formData.append('description', data.description);
  formData.append('acceptance_criteria', data.acceptance_criteria);
  formData.append('priority', String(data.priority));
  formData.append('sort_order', String(data.sort_order));
  formData.append('column_id', String(data.column_id));

  if (data.subtasks?.length) {
    formData.append('subtasks', JSON.stringify(data.subtasks));
  }

  if (data.existingAttachmentUrls?.length) {
    formData.append('attachments', JSON.stringify(data.existingAttachmentUrls));
  }

  // Backend accepts attachments[] and enforces max 3MB per file.
  files.forEach((file) => {
    formData.append('attachments[]', file);
  });

  return formData;
};

export type CreateTicketPayload = CreateTicketInput;

export type UpdateTicketPayload = {
  assigned_user_id?: number;
  title?: string;
  description?: string;
  acceptance_criteria?: string;
  priority?: number;
  sort_order?: number;
  column_id?: number;
};

export type AddTicketAttachmentPayload = {
  file_url: string;
};

export type AddTicketSubtaskPayload = {
  task: string;
  is_completed?: boolean;
};

export type UpdateTicketSubtaskPayload = {
  task?: string;
  is_completed?: boolean;
};

export type AddTicketCommentPayload = {
  comment: string;
};

export type UpdateTicketCommentPayload = {
  comment: string;
};

// types (adjust import paths to your app)
export type InviteTicketBoardEmailPayload = {
  board_id: number;
  invite_email: string;
};

export type TicketBoardInviteResponse = {
  id: number;
  board_id: number;
  invite_email: string;
  invite_code: string;
};

export type AcceptTicketBoardInviteResponse = {
  message: string;
  board_id: number;
  user_id: number;
};

class TicketService {
  addTicket(payload: CreateTicketInput, files: File[] = []): Promise<Ticket> {
    const path = '/ticket/add';
    return httpClient.post(path, buildCreateTicketFormData(payload, files), {
      withAuth: true,
    });
  }

  getAllTickets(boardId: number): Promise<Ticket[]> {
    const path = `/ticket/get-all/${boardId}`;
    return httpClient.get(path, { withAuth: true });
  }

  updateTicket(id: number, payload: UpdateTicketPayload): Promise<Ticket> {
    const path = `/ticket/update/${id}`;
    return httpClient.put(path, payload, { withAuth: true });
  }

  deleteTicket(id: number): Promise<void> {
    const path = `/ticket/delete/${id}`;
    return httpClient.delete(path, { withAuth: true });
  }

  getTicketById(id: number): Promise<TicketWithDetails> {
    const path = `/ticket/get/${id}`;
    return httpClient.get<TicketWithDetails>(path, { withAuth: true });
  }

  addTicketAttachment(
    ticketId: number,
    payload: AddTicketAttachmentPayload,
  ): Promise<TicketAttachment[]> {
    const path = `/ticket/attachment/add/${ticketId}`;
    return httpClient.post(path, payload, { withAuth: true });
  }

  addTicketAttachmentFile(
    ticketId: number,
    file: File,
  ): Promise<TicketAttachment[]> {
    const path = `/ticket/attachment/add/${ticketId}`;
    const formData = new FormData();
    formData.append('file', file);
    return httpClient.post(path, formData, { withAuth: true });
  }

  deleteTicketAttachment(id: number): Promise<void> {
    const path = `/ticket/attachment/delete/${id}`;
    return httpClient.delete(path, { withAuth: true });
  }

  addTicketSubtask(
    ticketId: number,
    payload: AddTicketSubtaskPayload,
  ): Promise<TicketSubtask> {
    const path = `/ticket/subtask/add/${ticketId}`;
    return httpClient.post(path, payload, { withAuth: true });
  }

  updateTicketSubtask(
    id: number,
    payload: UpdateTicketSubtaskPayload,
  ): Promise<TicketSubtask> {
    const path = `/ticket/subtask/update/${id}`;
    return httpClient.put(path, payload, { withAuth: true });
  }

  deleteTicketSubtask(id: number): Promise<void> {
    const path = `/ticket/subtask/delete/${id}`;
    return httpClient.delete(path, { withAuth: true });
  }

  addTicketComment(
    ticketId: number,
    payload: AddTicketCommentPayload,
  ): Promise<TicketComment> {
    const path = `/ticket/comment/add/${ticketId}`;
    return httpClient.post(path, payload, { withAuth: true });
  }

  updateTicketComment(
    id: number,
    payload: UpdateTicketCommentPayload,
  ): Promise<TicketComment> {
    const path = `/ticket/comment/update/${id}`;
    return httpClient.put(path, payload, { withAuth: true });
  }

  deleteTicketComment(id: number): Promise<void> {
    const path = `/ticket/comment/delete/${id}`;
    return httpClient.delete(path, { withAuth: true });
  }

  getAllSharedBoards(): Promise<TicketBoard[]> {
    const path = '/ticket-board/get-all-shared';
    return httpClient.get<TicketBoard[]>(path, { withAuth: true });
  }

  // Invite by email (backend now validates: already in board / already invited)
  inviteByEmail(
    payload: InviteTicketBoardEmailPayload,
  ): Promise<TicketBoardInviteResponse> {
    const path = '/ticket-board/invite';
    return httpClient.post<TicketBoardInviteResponse>(path, payload, {
      withAuth: true,
    });
  }

  // Accept invite using invite code in path
  acceptInvite(code: string): Promise<AcceptTicketBoardInviteResponse> {
    const path = `/ticket-board/invite/accept/${encodeURIComponent(code)}`;
    return httpClient.get<AcceptTicketBoardInviteResponse>(path, {
      withAuth: true,
    });
  }
}

export const ticketService = new TicketService();
