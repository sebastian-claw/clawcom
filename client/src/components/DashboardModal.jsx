import { useState, useEffect, useRef } from 'react';


function DashboardModal({ isOpen, onClose, jobs = [] }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const canvasRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetch('/api/stats')
        .then(r => r.json())
        .then(data => {
          setStats(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (stats && canvasRef.current) {
      drawChart(canvasRef.current, stats.dailyActivity);
    }
  }, [stats]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal dashboard-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="22" height="22" style={{display:"inline-block",verticalAlign:"middle",marginRight:"8px"}}><path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" /></svg>Dashboard</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body dashboard-body">
          {loading ? (
            <div className="dashboard-loading">Loading stats...</div>
          ) : stats ? (
            <>
              {/* Summary Cards */}
              <div className="dashboard-summary">
                <div className="summary-card">
                  <span className="summary-number">{stats.totals.completed}</span>
                  <span className="summary-label">Tasks Completed</span>
                </div>
                <div className="summary-card">
                  <span className="summary-number">{stats.totals.created}</span>
                  <span className="summary-label">Tasks Created</span>
                </div>
                <div className="summary-card">
                  <span className="summary-number">{stats.today.completed.length}</span>
                  <span className="summary-label">Done Today</span>
                </div>
                <div className="summary-card">
                  <span className="summary-number">
                    {stats.board.reduce((sum, b) => sum + b.count, 0)}
                  </span>
                  <span className="summary-label">Active Tasks</span>
                </div>
              </div>

              {/* Activity Chart */}
              <div className="dashboard-section">
                <h3>Activity (Last 30 Days)</h3>
                <canvas ref={canvasRef} width={600} height={200} className="dashboard-chart" />
              </div>

              {/* Job Breakdown */}
              {stats.jobActivity.length > 0 && (
                <div className="dashboard-section">
                  <h3>By Job</h3>
                  <div className="dashboard-job-list">
                    {groupBy(stats.jobActivity, 'job_name').map(([name, items]) => {
                      const completed = items.find(i => i.action === 'completed')?.count || 0;
                      const created = items.find(i => i.action === 'created')?.count || 0;
                      const job = jobs.find(j => j.name === name);
                      return (
                        <div key={name} className="dashboard-job-row">
                          <span className="job-dot" style={{ backgroundColor: job?.color || '#6366f1' }} />
                          <span className="job-name">{name}</span>
                          <span className="job-stat created">{created} created</span>
                          <span className="job-stat completed">{completed} completed</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Today's Activity */}
              {stats.today.completed.length > 0 && (
                <div className="dashboard-section">
                  <h3>Completed Today</h3>
                  <ul className="dashboard-today-list">
                    {stats.today.completed.map((t, i) => (
                      <li key={i}>
                        <span className="today-task">{t.card_title}</span>
                        {t.job_name && <span className="today-job">{t.job_name}</span>}
                        {t.assigned_to && <span className="today-assignee">— {t.assigned_to}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Board Status */}
              <div className="dashboard-section">
                <h3>Board Status</h3>
                <div className="dashboard-board-bars">
                  {['backlog', 'in-progress', 'review', 'done'].map(col => {
                    const count = stats.board.find(b => b.column_id === col)?.count || 0;
                    const maxCount = Math.max(...stats.board.map(b => b.count), 1);
                    return (
                      <div key={col} className="board-bar-row">
                        <span className="board-bar-label">{col}</span>
                        <div className="board-bar-track">
                          <div
                            className={`board-bar-fill bar-${col}`}
                            style={{ width: `${(count / maxCount) * 100}%` }}
                          />
                        </div>
                        <span className="board-bar-count">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            <div className="dashboard-loading">Failed to load stats</div>
          )}
        </div>
      </div>
    </div>
  );
}

function drawChart(canvas, dailyActivity) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);

  ctx.clearRect(0, 0, w, h);

  // Group by date
  const dateMap = {};
  dailyActivity.forEach(d => {
    if (!dateMap[d.date]) dateMap[d.date] = { created: 0, completed: 0 };
    dateMap[d.date][d.action] = d.count;
  });

  const dates = Object.keys(dateMap).sort();
  if (dates.length === 0) {
    ctx.fillStyle = '#71717a';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No activity data yet', w / 2, h / 2);
    return;
  }

  const maxVal = Math.max(...dates.map(d => Math.max(dateMap[d].created, dateMap[d].completed)), 1);
  const padding = { top: 20, bottom: 30, left: 10, right: 10 };
  const chartW = w - padding.left - padding.right;
  const chartH = h - padding.top - padding.bottom;
  const barWidth = Math.min(20, (chartW / dates.length - 4) / 2);

  dates.forEach((date, i) => {
    const x = padding.left + (i / dates.length) * chartW + (chartW / dates.length) / 2;
    const created = dateMap[date].created;
    const completed = dateMap[date].completed;

    // Created bar
    const cH = (created / maxVal) * chartH;
    ctx.fillStyle = 'rgba(99, 102, 241, 0.6)';
    ctx.fillRect(x - barWidth - 1, padding.top + chartH - cH, barWidth, cH);

    // Completed bar
    const dH = (completed / maxVal) * chartH;
    ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
    ctx.fillRect(x + 1, padding.top + chartH - dH, barWidth, dH);

    // Date label (show every nth)
    if (dates.length <= 7 || i % Math.ceil(dates.length / 7) === 0) {
      ctx.fillStyle = '#71717a';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(date.slice(5), x, h - 5);
    }
  });

  // Legend
  ctx.fillStyle = 'rgba(99, 102, 241, 0.6)';
  ctx.fillRect(w - 160, 5, 10, 10);
  ctx.fillStyle = '#a1a1aa';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Created', w - 145, 14);

  ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
  ctx.fillRect(w - 80, 5, 10, 10);
  ctx.fillStyle = '#a1a1aa';
  ctx.fillText('Done', w - 65, 14);
}

function groupBy(arr, key) {
  const map = new Map();
  arr.forEach(item => {
    const k = item[key];
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  });
  return [...map.entries()];
}

export default DashboardModal;
