import { useState, useEffect } from 'react';

// Team members with their colors
const TEAM_COLORS = {
  Michael: '#3b82f6', // Blue
  Sebastian: '#a855f7', // Purple
};

function getAssigneeColor(name) {
  if (!name) return '#6b7280'; // Gray for unknown
  return TEAM_COLORS[name] || '#6b7280';
}

function getInitials(name) {
  if (!name) return '';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function Card({ card, onEdit, isOverlay, jobs = [], collapsed, onToggleCollapse, unreadCount = 0 }) {
  const [isOverdue, setIsOverdue] = useState(false);

  useEffect(() => {
    if (card.due_date) {
      const dueDate = new Date(card.due_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setIsOverdue(dueDate < today);
    }
  }, [card.due_date]);

  const handleClick = (e) => {
    // Don't trigger edit on collapse toggle click
    if (collapsed && onToggleCollapse && e.target.closest('.card-expand-toggle')) {
      return;
    }
    if (!isOverlay && onEdit) {
      e.preventDefault();
      onEdit();
    }
  };

  const handleExpandToggle = (e) => {
    e.stopPropagation();
    if (onToggleCollapse) {
      onToggleCollapse();
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const cardJob = card.job_id ? jobs.find(j => j.id === card.job_id) : null;

  return (
    <div
      className={`card priority-${card.priority} ${isOverlay ? 'is-overlay' : ''} ${collapsed ? 'collapsed' : ''} ${unreadCount > 0 ? 'has-unread' : ''}`}
      onClick={handleClick}
    >
      {cardJob && !collapsed && (
        <div className="card-job">
          <span className="card-job-dot" style={{ backgroundColor: cardJob.color }} />
          {cardJob.name}
        </div>
      )}
      <div className="card-header">
        <span className="card-title">{card.title}</span>
        <div className="card-header-right">
          {collapsed && onToggleCollapse && (
            <button
              className="card-expand-toggle"
              onClick={handleExpandToggle}
              aria-label="Expand card"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 8.25l-7.5 7.5-7.5-7.5"
                />
              </svg>
            </button>
          )}
          {!collapsed && onToggleCollapse && (
            <button
              className="card-expand-toggle"
              onClick={handleExpandToggle}
              aria-label="Collapse card"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 15.75l7.5-7.5 7.5 7.5"
                />
              </svg>
            </button>
          )}
          <span className={`card-priority ${card.priority}`}>
            {card.priority}
          </span>
        </div>
      </div>

      {!collapsed && card.description && (
        <p className="card-description">{card.description}</p>
      )}

      {!collapsed && card.labels && card.labels.length > 0 && (
        <div className="card-labels">
          {card.labels.map((label, idx) => (
            <span
              key={idx}
              className="card-label"
              style={{ backgroundColor: getLabelColor(label) }}
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {!collapsed && (
        <div className="card-footer">
          {card.assigned_to && (
            <span
              className="card-assignee"
              style={{ backgroundColor: getAssigneeColor(card.assigned_to) }}
              title={`Assigned to ${card.assigned_to}`}
            >
              {getInitials(card.assigned_to)}
            </span>
          )}
          {card.due_date && (
            <span className={`card-due ${isOverdue ? 'overdue' : ''}`}>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                />
              </svg>
              {formatDate(card.due_date)}
            </span>
          )}
          <span className="card-date">{formatDate(card.created_date)}</span>
        </div>
      )}
    </div>
  );
}

// Simple hash function to generate consistent colors for labels
function getLabelColor(labelName) {
  const colors = [
    '#8b5cf6',
    '#06b6d4',
    '#10b981',
    '#f59e0b',
    '#ec4899',
    '#6366f1',
  ];
  let hash = 0;
  for (let i = 0; i < labelName.length; i++) {
    hash = labelName.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

export default Card;
