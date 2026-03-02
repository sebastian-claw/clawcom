const express = require('express');
const router = express.Router();

// GET /api/stats - Dashboard stats
router.get('/', (req, res, next) => {
  try {
    const db = req.app.locals.db;

    // Current board counts
    const boardCounts = db.prepare(`
      SELECT column_id, COUNT(*) as count FROM cards GROUP BY column_id
    `).all();

    // Activity log - last 30 days, grouped by day
    const dailyActivity = db.prepare(`
      SELECT DATE(created_at) as date, action, COUNT(*) as count
      FROM activity_log
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY DATE(created_at), action
      ORDER BY date ASC
    `).all();

    // Activity by job
    const jobActivity = db.prepare(`
      SELECT job_name, action, COUNT(*) as count
      FROM activity_log
      WHERE job_name IS NOT NULL AND created_at >= datetime('now', '-30 days')
      GROUP BY job_name, action
      ORDER BY count DESC
    `).all();

    // Activity by assignee
    const assigneeActivity = db.prepare(`
      SELECT assigned_to, action, COUNT(*) as count
      FROM activity_log
      WHERE assigned_to IS NOT NULL AND created_at >= datetime('now', '-30 days')
      GROUP BY assigned_to, action
      ORDER BY count DESC
    `).all();

    // Today's completed tasks
    const todayCompleted = db.prepare(`
      SELECT card_title, job_name, assigned_to, created_at
      FROM activity_log
      WHERE action = 'completed' AND DATE(created_at) = DATE('now')
      ORDER BY created_at DESC
    `).all();

    // Today's created tasks
    const todayCreated = db.prepare(`
      SELECT card_title, job_name, assigned_to, created_at
      FROM activity_log
      WHERE action = 'created' AND DATE(created_at) = DATE('now')
      ORDER BY created_at DESC
    `).all();

    // Total stats
    const totalCompleted = db.prepare(`
      SELECT COUNT(*) as count FROM activity_log WHERE action = 'completed'
    `).get();

    const totalCreated = db.prepare(`
      SELECT COUNT(*) as count FROM activity_log WHERE action = 'created'
    `).get();

    res.json({
      board: boardCounts,
      dailyActivity,
      jobActivity,
      assigneeActivity,
      today: {
        completed: todayCompleted,
        created: todayCreated,
      },
      totals: {
        completed: totalCompleted.count,
        created: totalCreated.count,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

// GET /api/stats/feed - Recent activity feed
router.get('/feed', (req, res, next) => {
  try {
    const db = req.app.locals.db;
    const limit = parseInt(req.query.limit) || 50;
    const feed = db.prepare(`
      SELECT * FROM activity_log ORDER BY created_at DESC LIMIT ?
    `).all(limit);
    res.json(feed);
  } catch (error) {
    next(error);
  }
});
