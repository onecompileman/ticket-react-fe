import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { AddListModal } from './components/AddListModal';
import { BoardSettingsModal } from './components/BoardSettingsModal';
import { BoardList } from './components/BoardList';
import { CreateTicketModal } from './components/CreateTicketModal';
import { InviteUserModal } from './components/InviteUserModal';
import { ViewTicketModal } from './components/ViewTicketModal';
import './BoardPage.css';
import { ticketBoardService } from '../../api/services/TicketBoardService';
import { ticketBoardColumnService } from '../../api/services/TicketBoardColumnService';
import { ticketService } from '../../api/services/TicketService';
import type { Ticket } from '../../shared/models/Ticket';
import type { TicketBoardColumn } from '../../shared/models/TicketBoardColumn';
import { useLoadingStore } from '../../shared/stores/loadingStore';
import { useUserStore, type User } from '../../shared/stores/userStore';
import { getUserInitials } from '../../shared/utils/getUserInitials';
import Swal from 'sweetalert2';
import {
  useConfirmationModalStore,
  type ConfirmationModalProps,
} from '../../shared/components/Modals/ConfirmationModal/ConfirmationModal';

const COLUMN_PREFIX = 'column:';
const COLUMN_DROP_PREFIX = 'column-drop:';
const TICKET_PREFIX = 'ticket:';

const getBoardListSortableId = (list: TicketBoardColumn, index: number) => {
  return `${COLUMN_PREFIX}${String(list.id ?? `column-${list.column_name}-${index}`)}`;
};

const parsePrefixedNumber = (value: string, prefix: string) => {
  if (!value.startsWith(prefix)) {
    return null;
  }

  const parsed = Number(value.slice(prefix.length));
  return Number.isFinite(parsed) ? parsed : null;
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

export const BoardPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [boardName, setBoardName] = useState('Board');
  const [boardColor, setBoardColor] = useState('lilac');
  const [boardUsers, setBoardUsers] = useState<User[]>([]);
  const [boardLists, setBoardLists] = useState<TicketBoardColumn[]>([]);
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isAddListModalOpen, setAddListModalOpen] = useState(false);
  const [isInviteModalOpen, setInviteModalOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);
  const [boardSettingsError, setBoardSettingsError] = useState<string | null>(
    null,
  );
  const [isUpdatingBoard, setIsUpdatingBoard] = useState(false);
  const [createTicketColumnId, setCreateTicketColumnId] = useState<
    number | null
  >(null);

  const { setModalState, showModal } = useConfirmationModalStore();

  const { showLoading, hideLoading } = useLoadingStore();

  const { user } = useUserStore();

  const [selectedTicket, setSelectedTicket] = useState<{
    ticket: Ticket;
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  useEffect(() => {
    const boardId = Number(id);

    if (!boardId || Number.isNaN(boardId)) {
      setBoardName('Board');
      setBoardColor('lilac');
      setBoardUsers([]);
      setBoardLists([]);
      return;
    }

    const fetchBoard = async () => {
      showLoading();
      try {
        const boardDetails =
          await ticketBoardService.getTicketBoardById(boardId);

        const ticketBuckets = new Map<number, Ticket[]>();

        (boardDetails.tickets ?? []).forEach((ticket) => {
          const columnRef = ticket.column;
          const columnId =
            columnRef && typeof columnRef === 'object' && 'id' in columnRef
              ? columnRef.id
              : undefined;

          if (typeof columnId !== 'number') {
            return;
          }

          const existingTickets = ticketBuckets.get(columnId) ?? [];
          ticketBuckets.set(columnId, [...existingTickets, ticket]);
        });

        const mappedColumns = (boardDetails.boardColumns ?? []).map(
          (column) => ({
            ...column,
            tickets: ticketBuckets.get(column.id ?? -1) ?? column.tickets ?? [],
          }),
        );

        setBoardName(boardDetails.board_name);
        setBoardColor(boardDetails.board_color || 'lilac');
        setBoardUsers(boardDetails.users ?? []);
        setBoardLists(mappedColumns);
      } catch (error) {
        console.error('Failed to fetch board details:', error);
        setBoardName('Board');
        setBoardColor('lilac');
        setBoardUsers([]);
        setBoardLists([]);
      } finally {
        hideLoading();
      }
    };

    fetchBoard();
  }, [id, showLoading, hideLoading]);

  const handleCreateList = ({
    column_name,
    color,
  }: {
    column_name: string;
    color: string;
  }) => {
    const boardId = Number(id);

    if (!boardId || Number.isNaN(boardId)) {
      return;
    }

    const normalizedColumnName = column_name.trim();
    if (!normalizedColumnName) {
      return;
    }

    const createColumn = async () => {
      showLoading();
      try {
        const createdColumn =
          await ticketBoardColumnService.addTicketBoardColumn({
            board_id: boardId,
            column_name: normalizedColumnName,
            color,
            sort_order: boardLists.length + 1,
          });

        setBoardLists((previousLists) => [
          ...previousLists,
          {
            ...createdColumn,
            color: createdColumn.color || color,
            tickets: createdColumn.tickets ?? [],
          },
        ]);
      } catch (error) {
        console.error('Failed to create board column:', error);
        Swal.fire({
          icon: 'error',
          title: 'Creation Failed',
          text: getErrorMessage(
            error,
            'An error occurred while creating the column. Please try again.',
          ),
        });
      } finally {
        hideLoading();
      }
    };

    createColumn();
  };

  const handleDeleteList = (columnId: number) => {
    const modalState: ConfirmationModalProps = {
      isOpen: true,
      title: 'Confirm Deletion',
      message:
        'Are you sure you want to delete this column? This action cannot be undone.',
      onClose: () => {},
      onConfirm: async () => {
        try {
          showLoading();
          await ticketBoardColumnService.deleteTicketBoardColumn(columnId);
          Swal.fire({
            icon: 'success',
            title: 'Column Deleted',
            text: 'The column has been successfully deleted.',
          });
          setBoardLists((lists) =>
            lists.filter((list) => list.id !== columnId),
          );
        } catch (error) {
          console.error('Failed to delete board column:', error);
          Swal.fire({
            icon: 'error',
            title: 'Deletion Failed',
            text: getErrorMessage(
              error,
              'An error occurred while deleting the column. Please try again.',
            ),
          });
        } finally {
          hideLoading();
        }
      },
    };
    setModalState(modalState);
    showModal();
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) {
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    if (
      activeId.startsWith(COLUMN_PREFIX) &&
      overId.startsWith(COLUMN_PREFIX)
    ) {
      const sortableIds = boardLists.map((list, index) =>
        getBoardListSortableId(list, index),
      );
      const oldIndex = sortableIds.indexOf(activeId);
      const newIndex = sortableIds.indexOf(overId);

      if (oldIndex < 0 || newIndex < 0) {
        return;
      }

      const reorderedLists = arrayMove(boardLists, oldIndex, newIndex).map(
        (list, index) => ({
          ...list,
          sort_order: index + 1,
        }),
      );

      setBoardLists(reorderedLists);

      const persistedLists = reorderedLists.filter(
        (list): list is TicketBoardColumn & { id: number } =>
          typeof list.id === 'number',
      );

      void Promise.all(
        persistedLists.map((list) =>
          ticketBoardColumnService.updateTicketBoardColumn(list.id, {
            sort_order: list.sort_order,
          }),
        ),
      ).catch((error) => {
        console.error('Failed to persist board column order:', error);
        Swal.fire({
          icon: 'error',
          title: 'Reorder Failed',
          text: getErrorMessage(
            error,
            'An error occurred while saving the new column order. Please try again.',
          ),
        });
      });

      return;
    }

    if (!activeId.startsWith(TICKET_PREFIX)) {
      return;
    }

    const movingTicketId = parsePrefixedNumber(activeId, TICKET_PREFIX);

    if (movingTicketId == null) {
      return;
    }

    const previousLists = boardLists;
    let sourceColumnIndex = -1;
    let sourceTicketIndex = -1;

    for (
      let columnIndex = 0;
      columnIndex < previousLists.length;
      columnIndex += 1
    ) {
      const ticketIndex = (previousLists[columnIndex].tickets ?? []).findIndex(
        (ticket) => ticket.id === movingTicketId,
      );

      if (ticketIndex >= 0) {
        sourceColumnIndex = columnIndex;
        sourceTicketIndex = ticketIndex;
        break;
      }
    }

    if (sourceColumnIndex < 0 || sourceTicketIndex < 0) {
      return;
    }

    let targetColumnIndex = -1;
    let targetTicketIndex = -1;

    const overTicketId = parsePrefixedNumber(overId, TICKET_PREFIX);

    if (overTicketId != null) {
      for (
        let columnIndex = 0;
        columnIndex < previousLists.length;
        columnIndex += 1
      ) {
        const ticketIndex = (
          previousLists[columnIndex].tickets ?? []
        ).findIndex((ticket) => ticket.id === overTicketId);

        if (ticketIndex >= 0) {
          targetColumnIndex = columnIndex;
          targetTicketIndex = ticketIndex;
          break;
        }
      }
    } else {
      const overColumnId =
        parsePrefixedNumber(overId, COLUMN_DROP_PREFIX) ??
        parsePrefixedNumber(overId, COLUMN_PREFIX);

      if (overColumnId != null) {
        targetColumnIndex = previousLists.findIndex(
          (column) => column.id === overColumnId,
        );

        if (targetColumnIndex >= 0) {
          targetTicketIndex = (previousLists[targetColumnIndex].tickets ?? [])
            .length;
        }
      }
    }

    if (targetColumnIndex < 0 || targetTicketIndex < 0) {
      return;
    }

    if (
      sourceColumnIndex === targetColumnIndex &&
      sourceTicketIndex === targetTicketIndex
    ) {
      return;
    }

    const nextLists = previousLists.map((column) => ({
      ...column,
      tickets: [...(column.tickets ?? [])],
    }));

    const [movingTicket] = nextLists[sourceColumnIndex].tickets.splice(
      sourceTicketIndex,
      1,
    );

    if (!movingTicket) {
      return;
    }

    nextLists[targetColumnIndex].tickets.splice(
      targetTicketIndex,
      0,
      movingTicket,
    );

    const changedColumnIndexes = Array.from(
      new Set([sourceColumnIndex, targetColumnIndex]),
    );

    changedColumnIndexes.forEach((columnIndex) => {
      nextLists[columnIndex].tickets = (
        nextLists[columnIndex].tickets ?? []
      ).map((ticket, index) => ({
        ...ticket,
        sort_order: index + 1,
      }));
    });

    setBoardLists(nextLists);

    const minSwapIndex = Math.min(sourceTicketIndex, targetTicketIndex);
    const maxSwapIndex = Math.max(sourceTicketIndex, targetTicketIndex);

    const updates = changedColumnIndexes.flatMap((columnIndex) => {
      const newColumn = nextLists[columnIndex];

      if (typeof newColumn.id !== 'number') {
        return [];
      }

      const updateRequests = [];
      const newTickets = newColumn.tickets ?? [];

      for (let i = 0; i < newTickets.length; i += 1) {
        const newTicket = newTickets[i];

        if (typeof newTicket.id !== 'number') {
          continue;
        }

        const isMovedTicket = newTicket.id === movingTicketId;
        const isInSwapRange = i >= minSwapIndex && i <= maxSwapIndex;

        if (isMovedTicket || isInSwapRange) {
          updateRequests.push(
            ticketService.updateTicket(newTicket.id, {
              column_id: newColumn.id,
              sort_order: i + 1,
            }),
          );
        }
      }

      return updateRequests;
    });

    void Promise.all(updates).catch((error) => {
      console.error('Failed to persist ticket move:', error);
      setBoardLists(previousLists);
      Swal.fire({
        icon: 'error',
        title: 'Move Failed',
        text: getErrorMessage(
          error,
          'An error occurred while moving the ticket. Please try again.',
        ),
      });
    });
  };

  const filteredBoardLists = boardLists.map((column) => {
    const normalizedQuery = searchQuery.toLowerCase().trim();

    if (!normalizedQuery) {
      return column;
    }

    const filteredTickets = (column.tickets ?? []).filter((ticket) => {
      const ticketTitle = (ticket.title ?? '').toLowerCase();
      const ticketDescription = (ticket.description ?? '').toLowerCase();
      const ticketSysId = (ticket.sys_id ?? '').toLowerCase();
      const ticketId = ticket.id ? String(ticket.id).toLowerCase() : '';

      return (
        ticketTitle.includes(normalizedQuery) ||
        ticketDescription.includes(normalizedQuery) ||
        ticketSysId.includes(normalizedQuery) ||
        ticketId.includes(normalizedQuery)
      );
    });

    return {
      ...column,
      tickets: filteredTickets,
    };
  });

  const sortableBoardLists = filteredBoardLists.map((list, index) => ({
    list,
    sortableId: getBoardListSortableId(list, index),
  }));

  const boardId = Number(id);
  const resolvedBoardId =
    Number.isNaN(boardId) || boardId <= 0 ? null : boardId;

  const handleOpenCreateTicketModal = (columnId?: number) => {
    if (typeof columnId === 'number') {
      setCreateTicketColumnId(columnId);
    } else {
      const fallbackColumn = boardLists.find(
        (list) => typeof list.id === 'number',
      );
      setCreateTicketColumnId(fallbackColumn?.id ?? null);
    }

    setCreateModalOpen(true);
  };

  const handleTicketCreated = (ticket: Ticket, columnId: number) => {
    setBoardLists((previousLists) =>
      previousLists.map((list) => {
        if (list.id !== columnId) {
          return list;
        }

        return {
          ...list,
          tickets: [...(list.tickets ?? []), ticket],
        };
      }),
    );
  };

  const onViewTicketHandler = async (payload: {
    ticket: NonNullable<TicketBoardColumn['tickets']>[number];
    status: string;
  }) => {
    showLoading();
    await ticketService
      .getTicketById(payload.ticket.id ?? -1)
      .then((freshTicket) => {
        setSelectedTicket({
          ticket: freshTicket,
        });
      })
      .catch((error) => {
        console.error('Failed to fetch ticket details:', error);
        Swal.fire({
          icon: 'error',
          title: 'Fetch Failed',
          text: getErrorMessage(
            error,
            'An error occurred while fetching the ticket details. Please try again.',
          ),
        });
      })
      .finally(() => {
        hideLoading();
      });
  };

  const handleTicketUpdated = (updatedTicket: Ticket) => {
    const targetColumnId =
      updatedTicket.column &&
      typeof updatedTicket.column === 'object' &&
      'id' in updatedTicket.column
        ? updatedTicket.column.id
        : undefined;

    setBoardLists((previousLists) => {
      if (typeof updatedTicket.id !== 'number') {
        return previousLists;
      }

      const nextLists = previousLists.map((column) => ({
        ...column,
        tickets: [...(column.tickets ?? [])],
      }));

      let existingColumnIndex = -1;
      let existingTicketIndex = -1;

      for (let index = 0; index < nextLists.length; index += 1) {
        const ticketIndex = nextLists[index].tickets.findIndex(
          (ticket) => ticket.id === updatedTicket.id,
        );

        if (ticketIndex >= 0) {
          existingColumnIndex = index;
          existingTicketIndex = ticketIndex;
          break;
        }
      }

      if (existingColumnIndex >= 0 && existingTicketIndex >= 0) {
        nextLists[existingColumnIndex].tickets.splice(existingTicketIndex, 1);
      }

      if (typeof targetColumnId === 'number') {
        const targetColumnIndex = nextLists.findIndex(
          (column) => column.id === targetColumnId,
        );

        if (targetColumnIndex >= 0) {
          const targetTickets = nextLists[targetColumnIndex].tickets;
          const sameTicketIndex = targetTickets.findIndex(
            (ticket) => ticket.id === updatedTicket.id,
          );

          if (sameTicketIndex >= 0) {
            targetTickets[sameTicketIndex] = updatedTicket;
          } else {
            targetTickets.push(updatedTicket);
          }

          targetTickets.sort(
            (leftTicket, rightTicket) =>
              (leftTicket.sort_order ?? 0) - (rightTicket.sort_order ?? 0),
          );

          return nextLists;
        }
      }

      return nextLists.map((column) => ({
        ...column,
        tickets: column.tickets.map((ticket) =>
          ticket.id === updatedTicket.id ? updatedTicket : ticket,
        ),
      }));
    });

    setSelectedTicket((previousSelectedTicket) => {
      if (
        !previousSelectedTicket ||
        previousSelectedTicket.ticket.id !== updatedTicket.id
      ) {
        return previousSelectedTicket;
      }

      return {
        ...previousSelectedTicket,
        ticket: updatedTicket,
      };
    });
  };

  const handleTicketDeleted = (ticketId: number) => {
    setBoardLists((previousLists) =>
      previousLists.map((column) => ({
        ...column,
        tickets: (column.tickets ?? []).filter(
          (ticket) => ticket.id !== ticketId,
        ),
      })),
    );

    setSelectedTicket((previousSelectedTicket) => {
      if (
        !previousSelectedTicket ||
        previousSelectedTicket.ticket.id !== ticketId
      ) {
        return previousSelectedTicket;
      }

      return null;
    });
  };

  const handleEditList = () => {
    Swal.fire({
      icon: 'info',
      title: 'Coming Soon',
      text: 'Column editing is not implemented yet.',
    });
  };

  const handleUpdateBoardSettings = async (payload: {
    boardName: string;
    boardColor: 'lilac' | 'mint' | 'blue' | 'peach' | 'cream';
  }) => {
    if (!resolvedBoardId) {
      setBoardSettingsError('Board not found. Refresh and try again.');
      return;
    }

    setBoardSettingsError(null);
    setIsUpdatingBoard(true);

    try {
      const updatedBoard = await ticketBoardService.updateTicketBoard(
        resolvedBoardId,
        {
          board_name: payload.boardName,
          board_color: payload.boardColor,
        },
      );

      setBoardName(updatedBoard.board_name);
      setBoardColor(updatedBoard.board_color || payload.boardColor);
      setSettingsModalOpen(false);
    } catch (error) {
      setBoardSettingsError(
        getErrorMessage(
          error,
          'Unable to update board settings. Please try again.',
        ),
      );
    } finally {
      setIsUpdatingBoard(false);
    }
  };

  return (
    <main className="board-page">
      <div className="app-shell" id="board">
        <header className="global-nav">
          <div className="nav-left">
            <span className="logo-mark">T</span>
            <strong className="brand">Ticket</strong>
          </div>

          <div className="nav-right">
            <button
              type="button"
              className="nav-create"
              onClick={() => navigate('/home', { replace: true })}
            >
              Back to Home
            </button>
            <input
              className="nav-search"
              placeholder="Search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search tickets"
            />
            <span className="nav-avatar">
              {user ? getUserInitials(user.full_name) : '?'}
            </span>
          </div>
        </header>

        <section className="board-nav">
          <div className="board-nav-left">
            <span
              className={`board-title-color board-color-${boardColor}`}
              aria-hidden="true"
            />
            <h1>{boardName}</h1>
            <button
              type="button"
              className="ghost-btn ghost-btn-strong"
              onClick={() => setInviteModalOpen(true)}
            >
              Invite Users
            </button>
          </div>

          <div className="board-nav-right">
            <button
              type="button"
              className="ghost-btn"
              onClick={() => {
                setBoardSettingsError(null);
                setSettingsModalOpen(true);
              }}
            >
              Settings
            </button>

            <button
              type="button"
              className="ghost-btn ghost-btn-strong"
              onClick={() => handleOpenCreateTicketModal()}
            >
              Create Ticket
            </button>
          </div>
        </section>

        <section className="board-wrap" aria-label="Ticket Board">
          <div className="board-columns">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={sortableBoardLists.map((item) => item.sortableId)}
                strategy={horizontalListSortingStrategy}
              >
                {sortableBoardLists.map(({ list, sortableId }) => (
                  <BoardList
                    key={sortableId}
                    sortableId={sortableId}
                    list={list}
                    onAddTicket={(columnId) =>
                      handleOpenCreateTicketModal(columnId)
                    }
                    onViewTicket={(payload) => {
                      onViewTicketHandler(payload);
                    }}
                    onEditList={handleEditList}
                    onDeleteList={() => {
                      if (typeof list.id === 'number') {
                        handleDeleteList(list.id);
                      }
                    }}
                  />
                ))}
              </SortableContext>
            </DndContext>

            <article className="board-column add-list-column">
              <button
                type="button"
                className="add-list-action"
                onClick={() => setAddListModalOpen(true)}
              >
                + Add list
              </button>
            </article>
          </div>
        </section>
      </div>

      <CreateTicketModal
        open={isCreateModalOpen}
        onClose={() => setCreateModalOpen(false)}
        boardId={resolvedBoardId}
        columns={boardLists}
        defaultColumnId={createTicketColumnId}
        onCreated={handleTicketCreated}
      />
      <InviteUserModal
        isOpen={isInviteModalOpen}
        boardId={resolvedBoardId}
        onClose={() => setInviteModalOpen(false)}
      />
      <BoardSettingsModal
        isOpen={isSettingsModalOpen}
        boardName={boardName}
        boardColor={boardColor}
        users={boardUsers}
        isSaving={isUpdatingBoard}
        submitError={boardSettingsError}
        onClose={() => {
          setBoardSettingsError(null);
          setSettingsModalOpen(false);
        }}
        onSave={handleUpdateBoardSettings}
      />
      <AddListModal
        open={isAddListModalOpen}
        onClose={() => setAddListModalOpen(false)}
        onCreate={handleCreateList}
      />
      <ViewTicketModal
        open={selectedTicket !== null}
        ticket={selectedTicket?.ticket ?? null}
        columns={boardLists}
        users={boardUsers}
        onUpdated={handleTicketUpdated}
        onDeleted={handleTicketDeleted}
        onClose={() => setSelectedTicket(null)}
      />
    </main>
  );
};
