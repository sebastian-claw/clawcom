import { useState, useEffect, memo, useCallback, useRef } from 'react';

const COLUMN_NAMES = {
  'backlog': 'Backlog',
  'in-progress': 'In Progress',
  'review': 'Review',
  'done': 'Done'
};

function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

const Toast = memo(function Toast({ toast, onRemove }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove(toast.id);
    }, 5000);

    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <div className="toast toast-enter">
      <span className="toast-message">{toast.message}</span>
      <button
        className="toast-close"
        onClick={() => onRemove(toast.id)}
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
});

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const addToast = useCallback((message) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message }]);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showCardMoved = useCallback((cardTitle, columnId) => {
    const columnName = COLUMN_NAMES[columnId] || columnId;
    addToast(`${cardTitle} moved to ${columnName}`);
  }, [addToast]);

  const showCardCreated = useCallback((cardTitle) => {
    addToast(`Task "${cardTitle}" created`);
  }, [addToast]);

  const showCardDeleted = useCallback((cardTitle) => {
    addToast(`Task "${cardTitle}" deleted`);
  }, [addToast]);

  const showNewComment = useCallback((cardTitle, author) => {
    addToast(`New comment on "${cardTitle}" from ${author}`);
  }, [addToast]);

  return {
    toasts,
    addToast,
    removeToast,
    showCardMoved,
    showCardCreated,
    showCardDeleted,
    showNewComment,
    ToastContainer: () => (
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    ),
  };
}
