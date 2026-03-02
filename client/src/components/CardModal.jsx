import { useState, useEffect, useRef, useCallback } from 'react';
import { memo } from 'react';
import ReactMarkdown from 'react-markdown';
import { createCard, updateCard, deleteCard, fetchComments, createComment, deleteComment } from '../api';
import { users, currentUser } from '../config/users';

// Team members for assignment
const TEAM_MEMBERS = [
  { value: '', label: 'Unassigned' },
  ...users.map(u => ({ value: u.id, label: u.name }))
];

const CardModal = memo(function CardModal({ card, labels, jobs, currentJob, onClose, onSave, onDelete, socket, comments: initialComments }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    labels: [],
    due_date: '',
    job_id: '',
    assigned_to: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const typingTimeoutRef = useRef(null);
  const commentsEndRef = useRef(null);
  const typingTimeoutsRef = useRef({}); // Track 30s timeouts per user
  const commentAuthor = currentUser; // Configurable - set in config/users.js

  // Track the card ID to prevent form reset on WebSocket-triggered re-renders
  const lastCardIdRef = useRef(null);
  const isInitializedRef = useRef(false);

  const isEditing = card && card.id;

  // Only initialize form data when the card actually changes (not on every re-render)
  useEffect(() => {
    const currentCardId = card?.id ?? null;

    // Only reset form when card ID changes (i.e., opening a different card)
    // This prevents WebSocket events from resetting the form while user is typing
    if (currentCardId !== lastCardIdRef.current) {
      lastCardIdRef.current = currentCardId;
      isInitializedRef.current = true;

      if (card) {
        setFormData({
          title: card.title || '',
          description: card.description || '',
          priority: card.priority || 'medium',
          labels: card.labels || [],
          due_date: card.due_date || '',
          job_id: card.job_id || '',
          assigned_to: card.assigned_to || '',
        });
      } else {
        // For new cards, default to current job selection (if not "all")
        setFormData({
          title: '',
          description: '',
          priority: 'medium',
          labels: [],
          due_date: '',
          job_id: currentJob !== 'all' ? currentJob : '',
          assigned_to: '',
        });
      }
    }
  }, [card?.id, currentJob]);

  // Auto-scroll comments to bottom when new comments arrive
  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // Load comments when editing a card
  useEffect(() => {
    if (isEditing && card?.id) {
      console.log('[CardModal] useEffect triggered loadComments, card.id:', card.id);
      loadComments(card.id);
    }
  }, [isEditing, card?.id]);

  // Listen for comment events via socket
  useEffect(() => {
    if (!socket || !isEditing || !card?.id) return;

    const handleCommentCreated = (comment) => {
      console.log('[CardModal] WebSocket comment:created received:', comment, 'card.id:', card.id, 'card.id type:', typeof card.id, 'comment.card_id type:', typeof comment.card_id);
      // Use loose equality or convert to string to handle type mismatch (DB returns int, JSON might be string)
      if (String(comment.card_id) === String(card.id)) {
        setComments((prev) => {
          // Replace temp comments or add new ones - don't skip
          const exists = prev.some(c => c.id === comment.id);
          if (exists) {
            // Update existing comment (e.g., replace optimistic with real)
            console.log('[CardModal] Updating existing comment from WebSocket:', comment.id);
            return prev.map(c => c.id === comment.id ? comment : c);
          }
          console.log('[CardModal] Adding new comment from WebSocket:', comment.id);
          return [...prev, comment];
        });
      }
    };

    const handleCommentDeleted = ({ id }) => {
      setComments((prev) => prev.filter((c) => c.id !== id));
    };

    socket.on('comment:created', handleCommentCreated);
    socket.on('comment:deleted', handleCommentDeleted);

    return () => {
      socket.off('comment:created', handleCommentCreated);
      socket.off('comment:deleted', handleCommentDeleted);
    };
  }, [socket, isEditing, card?.id]);

  // Listen for typing events via socket
  useEffect(() => {
    if (!socket || !isEditing || !card?.id) return;

    const handleTypingStart = ({ author: typingAuthor }) => {
      if (typingAuthor !== commentAuthor) {
        // Clear any existing timeout for this user before setting a new one
        if (typingTimeoutsRef.current[typingAuthor]) {
          clearTimeout(typingTimeoutsRef.current[typingAuthor]);
        }
        setTypingUsers((prev) => ({ ...prev, [typingAuthor]: true }));
        // Auto-hide after 30 seconds as safety timeout
        typingTimeoutsRef.current[typingAuthor] = setTimeout(() => {
          setTypingUsers((prev) => {
            const newState = { ...prev };
            delete newState[typingAuthor];
            return newState;
          });
          delete typingTimeoutsRef.current[typingAuthor];
        }, 30000);
      }
    };

    const handleTypingStop = ({ author: typingAuthor }) => {
      setTypingUsers((prev) => {
        const newState = { ...prev };
        delete newState[typingAuthor];
        return newState;
      });
    };

    const handleCommentCreated = (comment) => {
      // Hide typing indicator when a new message arrives from that author
      // Use String() to handle type mismatch (DB returns int, JSON might be string)
      if (String(comment.card_id) === String(card.id) && comment.author) {
        setTypingUsers((prev) => {
          const newState = { ...prev };
          delete newState[comment.author];
          return newState;
        });
      }
    };

    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('comment:created', handleCommentCreated);

    return () => {
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('comment:created', handleCommentCreated);
      // Clean up all typing timeouts
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      typingTimeoutsRef.current = {};
    };
  }, [socket, isEditing, card?.id, commentAuthor]);

  // Emit typing events
  const emitTyping = useCallback((isTyping) => {
    if (!socket || !card?.id) return;
    const event = isTyping ? 'typing:start' : 'typing:stop';
    socket.emit(event, { author: commentAuthor });
  }, [socket, card?.id, commentAuthor]);

  // Handle comment input change with typing detection
  const handleCommentInputChange = (e) => {
    const value = e.target.value;
    setNewComment(value);

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Emit typing:start
    if (value.trim()) {
      emitTyping(true);

      // Set timeout to emit typing:stop after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        emitTyping(false);
      }, 2000);
    } else {
      emitTyping(false);
    }
  };

  const loadComments = useCallback(async (cardId) => {
    try {
      console.log('[CardModal] loadComments called for cardId:', cardId);
      const data = await fetchComments(cardId);
      console.log('[CardModal] loadComments received:', data.length, 'comments');
      setComments(data);
    } catch (err) {
      console.error('Failed to load comments:', err);
    }
  }, []);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    console.log('[CardModal] handleAddComment called, card.id:', card.id, 'type:', typeof card.id);
    setCommenting(true);

    const commentMessage = newComment.trim();

    // Optimistically add the comment IMMEDIATELY before API call
    // This cannot be overwritten by useEffect or race conditions
    const tempId = `temp-${Date.now()}`;
    const optimisticComment = {
      id: tempId,
      card_id: card.id,
      author: commentAuthor,
      message: commentMessage,
      created_at: new Date().toISOString(),
    };
    console.log('[CardModal] Adding optimistic comment:', optimisticComment.id);
    setComments((prev) => [...prev, optimisticComment]);

    try {
      const newCommentObj = await createComment({
        card_id: card.id,
        author: commentAuthor,
        message: commentMessage,
      });
      console.log('[CardModal] createComment returned:', newCommentObj, 'card_id type:', typeof newCommentObj.card_id);

      // Replace the optimistic comment with the real one from the server
      setComments((prev) => {
        return prev.map(c => c.id === tempId ? newCommentObj : c);
      });

      // Also refetch all comments as a fallback to ensure consistency
      console.log('[CardModal] Refetching comments to ensure consistency');
      await loadComments(card.id);

      setNewComment('');
    } catch (err) {
      console.error('Failed to add comment:', err);
      // Remove the optimistic comment on error
      setComments((prev) => prev.filter(c => c.id !== tempId));
    } finally {
      setCommenting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (window.confirm('Delete this comment?')) {
      try {
        await deleteComment(commentId);
      } catch (err) {
        console.error('Failed to delete comment:', err);
      }
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (isEditing) {
        await updateCard(card.id, formData);
      } else {
        await createCard({
          ...formData,
          column_id: card.column_id || 'backlog',
          created_date: new Date().toISOString().split('T')[0],
        });
      }
      onSave();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEditing) return;

    if (window.confirm('Are you sure you want to delete this task?')) {
      setSaving(true);
      try {
        await deleteCard(card.id);
        onDelete();
      } catch (err) {
        setError(err.message);
      } finally {
        setSaving(false);
      }
    }
  };

  const toggleLabel = (labelName) => {
    setFormData((prev) => ({
      ...prev,
      labels: prev.labels.includes(labelName)
        ? prev.labels.filter((l) => l !== labelName)
        : [...prev.labels, labelName],
    }));
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Memoized event handlers to prevent re-renders
  const handleTitleChange = useCallback((e) => {
    setFormData((prev) => ({ ...prev, title: e.target.value }));
  }, []);

  const handleDescriptionChange = useCallback((e) => {
    setFormData((prev) => ({ ...prev, description: e.target.value }));
  }, []);

  const handlePriorityChange = useCallback((e) => {
    setFormData((prev) => ({ ...prev, priority: e.target.value }));
  }, []);

  const handleDueDateChange = useCallback((e) => {
    setFormData((prev) => ({ ...prev, due_date: e.target.value }));
  }, []);

  const handleJobIdChange = useCallback((e) => {
    setFormData((prev) => ({ ...prev, job_id: e.target.value }));
  }, []);

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className="modal">
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Task' : 'New Task'}</h2>
          <button className="modal-close" onClick={onClose}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              width="20"
              height="20"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div
                style={{
                  padding: '12px',
                  background: 'rgba(239, 68, 68, 0.15)',
                  borderRadius: '6px',
                  color: '#ef4444',
                  marginBottom: '16px',
                  fontSize: '14px',
                }}
              >
                {error}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                id="title"
                type="text"
                className="form-input"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Enter task title..."
                autoFocus
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description (Markdown supported)</label>
              <textarea
                id="description"
                className="form-textarea"
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                placeholder="Add a description..."
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="priority">Priority</label>
                <select
                  id="priority"
                  className="form-select"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      priority: e.target.value,
                    }))
                  }
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="due_date">Due Date</label>
                <input
                  id="due_date"
                  type="date"
                  className="form-input"
                  value={formData.due_date}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      due_date: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="job_id">Job / Project</label>
              <select
                id="job_id"
                className="form-select"
                value={formData.job_id}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    job_id: e.target.value,
                  }))
                }
              >
                <option value="">No Job</option>
                {jobs.map((job) => (
                  <option key={job.id} value={job.id}>
                    {job.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="assigned_to">Assigned To</label>
              <select
                id="assigned_to"
                className="form-select"
                value={formData.assigned_to}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    assigned_to: e.target.value,
                  }))
                }
              >
                {TEAM_MEMBERS.map((member) => (
                  <option key={member.value} value={member.value}>
                    {member.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Labels</label>
              <div className="labels-select">
                {labels.map((label) => (
                  <div
                    key={label.id}
                    className={`label-option ${
                      formData.labels.includes(label.name) ? 'selected' : ''
                    }`}
                    onClick={() => toggleLabel(label.name)}
                  >
                    <span
                      className="label-color"
                      style={{ backgroundColor: label.color }}
                    />
                    {label.name}
                  </div>
                ))}
              </div>
            </div>

            {/* Comments Section - only show when editing */}
            {isEditing && (
              <div className="card-comments">
                <div className="comments-header">
                  <label>Discussion</label>
                  <span className="comments-count">{comments.length}</span>
                </div>

                <div className="comments-list">
                  {comments.length === 0 ? (
                    <p className="no-comments">No comments yet</p>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="comment">
                        <div className="comment-header">
                          <span className="comment-author">{comment.author}</span>
                          <span className="comment-date">{formatDate(comment.created_at)}</span>
                          <button
                            className="comment-delete"
                            onClick={() => handleDeleteComment(comment.id)}
                            title="Delete comment"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="14" height="14">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <div className="comment-message">
                          <ReactMarkdown>{comment.message}</ReactMarkdown>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={commentsEndRef} />
                </div>

                {/* Typing Indicator */}
                {Object.keys(typingUsers).length > 0 && (
                  <div className="typing-indicator">
                    <span className="typing-dots">
                      <span></span>
                      <span></span>
                      <span></span>
                    </span>
                    <span className="typing-text">
                      {Object.keys(typingUsers).join(', ')} {Object.keys(typingUsers).length === 1 ? 'is' : 'are'} typing...
                    </span>
                  </div>
                )}

                <div className="comment-form">
                  <input
                    type="text"
                    className="comment-input"
                    placeholder="Add a comment..."
                    value={newComment}
                    onChange={handleCommentInputChange}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddComment(e); } }}
                  />
                  <button
                    type="button"
                    className="btn btn-primary comment-submit"
                    onClick={handleAddComment}
                    disabled={commenting || !newComment.trim()}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <div className="modal-footer-left">
              {isEditing && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={saving}
                >
                  Delete
                </button>
              )}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClose}
                disabled={saving}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
});

export default CardModal;
