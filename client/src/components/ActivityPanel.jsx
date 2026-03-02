import { useState, useEffect, useRef } from 'react';

function ActivityPanel({ socket, isOpen, onToggle }) {
  const [feed, setFeed] = useState([]);
  const feedEndRef = useRef(null);
  const panelRef = useRef(null);

  // Load initial feed
  useEffect(() => {
    if (isOpen) {
      fetch('/api/stats/feed?limit=30')
        .then(r => r.json())
        .then(data => {
          setFeed(data.reverse().map(item => ({
            message: `[${item.action.toUpperCase()}] ${item.card_title || 'Unknown'}`,
            timestamp: item.created_at,
            action: item.action,
          })));
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Listen for real-time activity
  useEffect(() => {
    if (!socket) return;
    const handler = (data) => {
      setFeed(prev => {
        const next = [...prev, {
          message: data.message,
          timestamp: data.timestamp,
          action: data.action,
        }];
        // Keep last 100 entries
        return next.slice(-100);
      });
    };
    socket.on('activity', handler);
    return () => socket.off('activity', handler);
  }, [socket]);

  // Auto-scroll
  useEffect(() => {
    if (feedEndRef.current) {
      feedEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [feed]);

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getActionColor = (action) => {
    switch (action) {
      case 'created': return '#22c55e';
      case 'completed': return '#6366f1';
      case 'moved': return '#eab308';
      case 'updated': return '#3b82f6';
      case 'comment': return '#8b5cf6';
      default: return '#6b7280';
    }
  };

  return (
    <>
      <button
        className={`activity-toggle ${isOpen ? 'active' : ''}`}
        onClick={onToggle}
        title="Activity Feed"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
        </svg>
      </button>
      {isOpen && (
        <div className="activity-panel" ref={panelRef}>
          <div className="activity-panel-header">
            <span className="activity-panel-title">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="14" height="14">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 2.25-3 2.25m4.5 0h3m-9 8.25h13.5A2.25 2.25 0 0021 18V6a2.25 2.25 0 00-2.25-2.25H5.25A2.25 2.25 0 003 6v12a2.25 2.25 0 002.25 2.25z" />
              </svg>
              Activity
            </span>
            <button className="activity-panel-close" onClick={onToggle}>×</button>
          </div>
          <div className="activity-feed">
            {feed.length === 0 && (
              <div className="activity-empty">No activity yet...</div>
            )}
            {feed.map((item, i) => (
              <div key={i} className="activity-entry">
                <span className="activity-time">{formatTime(item.timestamp)}</span>
                <span className="activity-dot" style={{ backgroundColor: getActionColor(item.action) }} />
                <span className="activity-message">{item.message}</span>
              </div>
            ))}
            <div ref={feedEndRef} />
          </div>
        </div>
      )}
    </>
  );
}

export default ActivityPanel;
