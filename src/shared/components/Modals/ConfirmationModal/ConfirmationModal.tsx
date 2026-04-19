import { useState } from 'react';
import { Modal } from '../Modal';
import { create } from 'zustand';

export interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  title: string;
  message: string;
}

type ConfirmationModalState = {
  modalState: ConfirmationModalProps;
  showModal: () => void;
  hideModal: () => void;
  setModalState: (state: ConfirmationModalProps) => void;
};

export const useConfirmationModalStore = create<ConfirmationModalState>(
  (set) => ({
    modalState: {
      isOpen: false,
      onClose: () => {},
      onConfirm: async () => {},
      title: '',
      message: '',
    },
    showModal: () =>
      set((state) => ({ modalState: { ...state.modalState, isOpen: true } })),
    hideModal: () =>
      set((state) => ({ modalState: { ...state.modalState, isOpen: false } })),
    setModalState: (state: ConfirmationModalProps) =>
      set({ modalState: state }),
  }),
);

export const ConfirmationModal = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const { modalState, hideModal } = useConfirmationModalStore();
  const { isOpen, onClose, onConfirm, title, message } = modalState;
  const confirmHandler = async () => {
    setIsProcessing(true);
    
    await onConfirm();

    setIsProcessing(false);
    onClose();
    hideModal();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        onClose();
        hideModal();
      }}
      title={title}
    >
      <p>{message}</p>
      <div className="modal-actions">
        <button
          className="action-btn"
          onClick={() => {
            onClose();
            hideModal();
          }}
        >
          Cancel
        </button>
        <button
          className="action-btn danger-btn"
          onClick={confirmHandler}
          disabled={isProcessing}
        >
          {isProcessing && <i className="fas fa-spinner fa-spin" />}
          Confirm
        </button>
      </div>
    </Modal>
  );
};
