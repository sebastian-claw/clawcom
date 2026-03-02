import { useState, useEffect, useRef, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { createComment, deleteComment } from '../api';
import { currentUser } from '../config/users';

function GlobalChat({ socket, comments, onClose }) {
  const [newMessage, setNewMessage] = useState('');
  const author = currentUser; // Configurable - set in config/users.js
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [streamingMessages, setStreamingMessages] = useState({}); // {commentId: text}
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const typingTimeoutsRef = useRef({}); // Track 30s timeouts per user

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  // Listen for typing events from socket
  useEffect(() => {
    if (!socket) return;

    const handleTypingStart = ({ author: typingAuthor }) => {
      if (typingAuthor !== author) {
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
      if (comment.author && !comment.card_id) {
        setTypingUsers((prev) => {
          const newState = { ...prev };
          delete newState[comment.author];
          return newState;
        });
      }
    };

    const handleStreaming = ({ id, message, done }) => {
      if (done) {
        setStreamingMessages(prev => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      } else {
        setStreamingMessages(prev => ({ ...prev, [id]: message }));
      }
    };

    socket.on('typing:start', handleTypingStart);
    socket.on('typing:stop', handleTypingStop);
    socket.on('comment:created', handleCommentCreated);
    socket.on('comment:streaming', handleStreaming);

    return () => {
      socket.off('typing:start', handleTypingStart);
      socket.off('typing:stop', handleTypingStop);
      socket.off('comment:created', handleCommentCreated);
      socket.off('comment:streaming', handleStreaming);
      // Clean up all typing timeouts
      Object.values(typingTimeoutsRef.current).forEach(clearTimeout);
      typingTimeoutsRef.current = {};
    };
  }, [socket, author]);

  // Emit typing events
  const emitTyping = useCallback((isTyping) => {
    if (!socket) return;
    const event = isTyping ? 'typing:start' : 'typing:stop';
    socket.emit(event, { author });
  }, [socket, author]);

  // Handle input change with typing detection
  const handleInputChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    try {
      await createComment({
        card_id: null,
        author: author,
        message: newMessage.trim(),
      });
      setNewMessage('');
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Delete this message?')) {
      try {
        await deleteComment(id);
      } catch (err) {
        console.error('Failed to delete message:', err);
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

  return (
    <div className="global-chat">
      <div className="chat-header">
        <h3>Global Chat</h3>
        <button className="chat-close" onClick={onClose}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="chat-messages">
        {comments.length === 0 ? (
          <p className="no-messages">No messages yet. Start the conversation!</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="chat-message">
              <div className="message-header">
                <span className="message-author">{comment.author}</span>
                <span className="message-date">{formatDate(comment.created_at)}</span>
                <button
                  className="message-delete"
                  onClick={() => handleDelete(comment.id)}
                  title="Delete message"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="12" height="12">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className={`message-content${streamingMessages[comment.id] !== undefined ? ' streaming' : ''}`}>
                <ReactMarkdown>{streamingMessages[comment.id] !== undefined ? streamingMessages[comment.id] : comment.message}</ReactMarkdown>
                {streamingMessages[comment.id] !== undefined && <span className="streaming-cursor">▊</span>}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
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

      <form className="chat-input-form" onSubmit={handleSubmit}>
        <input
          type="text"
          className="chat-input"
          placeholder="Type a message..."
          value={newMessage}
          onChange={handleInputChange}
        />
        <button
          type="submit"
          className="chat-send"
          disabled={sending || !newMessage.trim()}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        </button>
      </form>
    </div>
  );
}

export default GlobalChat;
