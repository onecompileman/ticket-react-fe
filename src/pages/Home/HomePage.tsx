import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './HomePage.css';
import { CreateBoardModal } from '../../shared/components/Modals/CreateBoardModal/CreateBoardModal';
import {
  useConfirmationModalStore,
  type ConfirmationModalProps,
} from '../../shared/components/Modals/ConfirmationModal/ConfirmationModal';
import { useUserStore } from '../../shared/stores/userStore';
import { getUserInitials } from '../../shared/utils/getUserInitials';
import { authCognitoService } from '../../api/services/AuthCognitoService';
import { ticketBoardService } from '../../api/services/TicketBoardService';
import { ticketService } from '../../api/services/TicketService';
import Swal from 'sweetalert2';
import { useLoadingStore } from '../../shared/stores/loadingStore';
import type { TicketBoard } from '../../shared/models/TicketBoard';

const PENDING_INVITE_CODE_KEY = 'ticket_pending_invite_code';

export const HomePage = () => {
  const navigate = useNavigate();
  const { setModalState, showModal } = useConfirmationModalStore();

  const [addOpen, setAddOpen] = useState(false);

  const { showLoading, hideLoading } = useLoadingStore();

  const { user } = useUserStore();

  const [ticketBoards, setTicketBoards] = useState<TicketBoard[]>([]);
  const [sharedTicketBoards, setSharedTicketBoards] = useState<TicketBoard[]>([]);

  const processPendingInvite = async () => {
    const inviteCode = localStorage.getItem(PENDING_INVITE_CODE_KEY);

    if (!inviteCode) {
      return;
    }

    try {
      await ticketService.acceptInvite(inviteCode);
      localStorage.removeItem(PENDING_INVITE_CODE_KEY);
     
    } catch (error) {
      localStorage.removeItem(PENDING_INVITE_CODE_KEY);
     
    }
  };

  const fetchBoards = async () => {
    showLoading();

    try {
      await processPendingInvite();

      const [boards, sharedBoards] = await Promise.all([
        ticketBoardService.getAllTicketBoards(),
        ticketService.getAllSharedBoards(),
      ]);

      setTicketBoards(boards);
      setSharedTicketBoards(sharedBoards);
    } finally {
      hideLoading();
    }
  };

  useEffect(() => {
    if (!user) {
      return;
    }

    fetchBoards();
  }, [user]);

  const handleCreateBoard = (createdBoard: TicketBoard) => {
    // TODO: wire to API
    setAddOpen(false);
    setTicketBoards((boards) => [...boards, createdBoard]);
  };

  const handleDeleteBoard = async (id: number) => {
    // TODO: wire to API
    const modalState: ConfirmationModalProps = {
      isOpen: true,
      onClose: () => {},
      onConfirm: async () => {
        try {
          await ticketBoardService.deleteTicketBoard(id);
          Swal.fire({
            icon: 'success',
            title: 'Board Deleted',
            text: 'The board has been successfully deleted.',
          });
          setTicketBoards((boards) => {
           const updated = boards.filter((board) => board.id !== id);
           console.log(updated);
            return updated;
          });
        } catch (error) {
          Swal.fire({
            icon: 'error',
            title: 'Deletion Failed',
            text:
              error.message ||
              'An error occurred while deleting the board. Please try again.',
          });
        }
      },
      title: 'Confirm Deletion',
      message:
        'Are you sure you want to delete this board? This action cannot be undone.',
    };
    setModalState(modalState);
    showModal();
  };

  const handleLogout = () => {
    const modalState: ConfirmationModalProps = {
      isOpen: true,
      onClose: () => {},
      onConfirm: async () => {
        authCognitoService.logout();
      },
      title: 'Confirm Logout',
      message: 'Are you sure you want to log out?',
    };

    setModalState(modalState);
    showModal();
  };

  return (
    <div className="home-shell">
      {/* Topbar */}
      <header className="home-topbar">
        <div className="brand-wrap">
          <span className="brand-mark">T</span>
          <h1>Ticket</h1>
        </div>
        <div className="topbar-actions">
          <div className="user-nav">
            <div className="user-avatar-img">
              {user ? getUserInitials(user.full_name) : '?'}
            </div>
            <button
              className="action-btn logout-btn"
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="home-content">
        <BoardSection
          title="My Ticket Boards"
          boards={ticketBoards}
          showAdd
          onAdd={() => setAddOpen(true)}
          onOpen={(board) => {
            if (!board.id) {
              return;
            }

            navigate(`/board/${board.id}`);
          }}
          onDelete={(id) => {
            handleDeleteBoard(id);
          }}
        />
        <BoardSection
          title="Shared Ticket Boards"
          boards={sharedTicketBoards}
          onOpen={(board) => {
            if (!board.id) {
              return;
            }

            navigate(`/board/${board.id}`);
          }}
          onDelete={(id) => {
            handleDeleteBoard(id);
          }}
        />
      </main>

      {/* Add Board Modal */}
      <CreateBoardModal
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        onCreate={handleCreateBoard}
      />
    </div>
  );
};

interface BoardSectionProps {
  title: string;
  boards: TicketBoard[];
  showAdd?: boolean;
  onAdd?: () => void;
  onOpen: (board: TicketBoard) => void;
  onDelete: (id: number) => void;
}

const BoardSection = ({
  title,
  boards,
  showAdd,
  onAdd,
  onOpen,
  onDelete,
}: BoardSectionProps) => (
  <section className="board-section">
    <div className="section-head">
      <h2>{title}</h2>
      {showAdd && (
        <button className="section-link" onClick={onAdd}>
          + Add
        </button>
      )}
    </div>
    <div className="board-grid">
      {boards.map((board) => (
        <article
          key={board.id}
          className={`board-card board-card-${board.board_color}`}
        >
          <h3>{board.board_name}</h3>
          <p>{board.board_description}</p>
          <div className="board-card-actions">
            <button onClick={() => onOpen(board)}>Open</button>
            <button className="danger" onClick={() => onDelete(board.id)}>
              Delete
            </button>
          </div>
        </article>
      ))}
    </div>
  </section>
);
