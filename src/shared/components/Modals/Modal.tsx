import './Modal.css';
import React from 'react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export const Modal = ({ isOpen, onClose, children, title }: ModalProps) => {
  if (!isOpen) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};
