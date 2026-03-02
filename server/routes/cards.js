const express = require('express');
const router = express.Router();
const { notifyOpenClaw } = require('../webhook');

// Helper to emit card events
const emitCardEvent = (io, event, card) => {
  if (io) {
    io.emit(event, card);
  }
};

// Get all cards with optional filters
router.get('/', (req, res, next) => {
  try {
    const { column, priority, label, search, job_id, assigned_to } = req.query;

    let query = 'SELECT * FROM cards WHERE 1=1';
    const params = [];

    if (column) {
      query += ' AND column_id = ?';
      params.push(column);
    }

    if (priority) {
      query += ' AND priority = ?';
      params.push(priority);
    }

    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (label) {
      query += ' AND labels LIKE ?';
      params.push(`%"${label}"%`);
    }

    if (job_id) {
      if (job_id === 'all') {
        // Show all cards (no filter)
      } else if (job_id === 'null' || job_id === '') {
        query += ' AND job_id IS NULL';
      } else {
        query += ' AND job_id = ?';
        params.push(job_id);
      }
    }

    if (assigned_to) {
      if (assigned_to === 'unassigned') {
        query += ' AND assigned_to IS NULL';
      } else {
        query += ' AND assigned_to = ?';
        params.push(assigned_to);
      }
    }

    query += ' ORDER BY column_id, position ASC';

    const stmt = req.app.locals.db.prepare(query);
    const cards = stmt.all(...params);

    // Parse JSON labels
    const parsedCards = cards.map(card => ({
      ...card,
      labels: JSON.parse(card.labels || '[]')
    }));

    res.json(parsedCards);
  } catch (error) {
    next(error);
  }
});

// Get single card
router.get('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const stmt = req.app.locals.db.prepare('SELECT * FROM cards WHERE id = ?');
    const card = stmt.get(id);

    if (!card) {
      return res.status(404).json({ error: 'Card not found' });
    }

    res.json({
      ...card,
      labels: JSON.parse(card.labels || '[]')
    });
  } catch (error) {
    next(error);
  }
});

// Create card
router.post('/', (req, res, next) => {
  try {
    const { title, description, priority, labels, due_date, column_id, position, job_id, assigned_to } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    // Get max position in column
    const maxPosStmt = req.app.locals.db.prepare(
      'SELECT MAX(position) as maxPos FROM cards WHERE column_id = ?'
    );
    const maxPosResult = maxPosStmt.get(column_id || 'backlog');
    const newPosition = position ?? ((maxPosResult.maxPos ?? -1) + 1);

    const stmt = req.app.locals.db.prepare(`
      INSERT INTO cards (title, description, priority, labels, due_date, column_id, position, created_date, job_id, assigned_to)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      title,
      description || '',
      priority || 'medium',
      JSON.stringify(labels || []),
      due_date || null,
      column_id || 'backlog',
      newPosition,
      new Date().toISOString().split('T')[0],
      job_id || null,
      assigned_to || null
    );

    const newCard = req.app.locals.db.prepare('SELECT * FROM cards WHERE id = ?').get(result.lastInsertRowid);

    const createdCard = { ...newCard, labels: JSON.parse(newCard.labels || '[]') };
    // Log activity
    const cJob = createdCard.job_id ? req.app.locals.db.prepare("SELECT name FROM jobs WHERE id = ?").get(createdCard.job_id) : null;
    req.app.locals.db.prepare("INSERT INTO activity_log (action, card_title, card_id, job_id, job_name, assigned_to) VALUES (?, ?, ?, ?, ?, ?)").run("created", createdCard.title, createdCard.id, createdCard.job_id, cJob ? cJob.name : null, createdCard.assigned_to);
    notifyOpenClaw(`CLAWCOM: New task "${createdCard.title}" [${createdCard.priority}] added to ${createdCard.column_id}`);

    // Emit WebSocket event for real-time updates
    emitCardEvent(req.app.locals.io, 'card:created', createdCard);
    req.app.locals.io.emit("activity", { action: "created", message: `Task "${createdCard.title}" created`, timestamp: new Date().toISOString() });

    res.status(201).json(createdCard);
  } catch (error) {
    next(error);
  }
});

// Update card
router.put('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, priority, labels, due_date, column_id, position, job_id, assigned_to } = req.body;

    // Check if card exists
    const existingCard = req.app.locals.db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
    if (!existingCard) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const stmt = req.app.locals.db.prepare(`
      UPDATE cards
      SET title = ?, description = ?, priority = ?, labels = ?, due_date = ?, column_id = ?, position = ?, job_id = ?, assigned_to = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      title ?? existingCard.title,
      description ?? existingCard.description,
      priority ?? existingCard.priority,
      JSON.stringify(labels ?? JSON.parse(existingCard.labels || '[]')),
      due_date ?? existingCard.due_date,
      column_id ?? existingCard.column_id,
      position ?? existingCard.position,
      job_id !== undefined ? job_id : existingCard.job_id,
      assigned_to !== undefined ? assigned_to : existingCard.assigned_to,
      id
    );

    const updatedCard = req.app.locals.db.prepare('SELECT * FROM cards WHERE id = ?').get(id);

    const card = { ...updatedCard, labels: JSON.parse(updatedCard.labels || '[]') };

    // Emit WebSocket event for real-time updates
    emitCardEvent(req.app.locals.io, 'card:updated', card);
    req.app.locals.io.emit("activity", { action: "updated", message: `Task "${card.title}" updated`, timestamp: new Date().toISOString() });

    res.json(card);
  } catch (error) {
    next(error);
  }
});

// Move card to column/position
router.put('/:id/move', (req, res, next) => {
  try {
    const { id } = req.params;
    const { column_id, position } = req.body;

    // Check if card exists
    const existingCard = req.app.locals.db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
    if (!existingCard) {
      return res.status(404).json({ error: 'Card not found' });
    }

    const newColumn = column_id || existingCard.column_id;
    const newPosition = position ?? existingCard.position;

    // Update positions of other cards in the target column
    if (column_id && column_id !== existingCard.column_id) {
      // Moving to different column - shift cards in target column
      req.app.locals.db.prepare(`
        UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ?
      `).run(newColumn, newPosition);
    } else if (position !== undefined && position !== existingCard.position) {
      // Moving within same column
      if (position > existingCard.position) {
        req.app.locals.db.prepare(`
          UPDATE cards SET position = position - 1 WHERE column_id = ? AND position > ? AND position <= ?
        `).run(newColumn, existingCard.position, position);
      } else {
        req.app.locals.db.prepare(`
          UPDATE cards SET position = position + 1 WHERE column_id = ? AND position >= ? AND position < ?
        `).run(newColumn, position, existingCard.position);
      }
    }

    // Update the card
    req.app.locals.db.prepare(`
      UPDATE cards SET column_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `).run(newColumn, newPosition, id);

    const updatedCard = req.app.locals.db.prepare('SELECT * FROM cards WHERE id = ?').get(id);

    const movedCard = { ...updatedCard, labels: JSON.parse(updatedCard.labels || '[]') };
    // Log activity for dashboard
    if (movedCard.column_id === "done") {
      const job = movedCard.job_id ? req.app.locals.db.prepare("SELECT name FROM jobs WHERE id = ?").get(movedCard.job_id) : null;
      req.app.locals.db.prepare("INSERT INTO activity_log (action, card_title, card_id, job_id, job_name, assigned_to) VALUES (?, ?, ?, ?, ?, ?)").run("completed", movedCard.title, movedCard.id, movedCard.job_id, job ? job.name : null, movedCard.assigned_to);
    }
    notifyOpenClaw(`CLAWCOM: Task "${movedCard.title}" moved to ${movedCard.column_id}`);

    // Emit WebSocket event for real-time updates
    emitCardEvent(req.app.locals.io, 'card:moved', movedCard);
    req.app.locals.io.emit("activity", { action: "moved", message: `Task "${movedCard.title}" moved to ${movedCard.column_id}`, timestamp: new Date().toISOString() });

    res.json(movedCard);
  } catch (error) {
    next(error);
  }
});

// Delete card
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;

    const existingCard = req.app.locals.db.prepare('SELECT * FROM cards WHERE id = ?').get(id);
    if (!existingCard) {
      return res.status(404).json({ error: 'Card not found' });
    }

    req.app.locals.db.prepare('DELETE FROM cards WHERE id = ?').run(id);

    // Emit WebSocket event for real-time updates
    emitCardEvent(req.app.locals.io, 'card:deleted', { id: parseInt(id) });

    res.json({ message: 'Card deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

// POST /api/cards/archive-done - Archive all done tasks into a compact summary
router.post('/archive-done', (req, res, next) => {
  try {
    const db = req.app.locals.db;

    // Get all done cards
    const doneCards = db.prepare("SELECT * FROM cards WHERE column_id = 'done' ORDER BY updated_at ASC").all();

    if (doneCards.length === 0) {
      return res.json({ message: 'No completed tasks to archive', summary: null, archived: 0 });
    }

    // Build compact summary
    const today = new Date().toISOString().split('T')[0];
    const lines = [`## Archived Tasks - ${today}\n`];

    for (const card of doneCards) {
      const comments = db.prepare('SELECT * FROM comments WHERE card_id = ? ORDER BY created_at ASC').all(card.id);
      lines.push(`- **${card.title}** (${card.priority}) — assigned: ${card.assigned_to || 'unassigned'}`);
      if (card.description) {
        lines.push(`  - ${card.description.substring(0, 120)}${card.description.length > 120 ? '...' : ''}`);
      }
      if (comments.length > 0) {
        lines.push(`  - ${comments.length} comment(s), last: "${comments[comments.length - 1].message.substring(0, 80)}..."`);
      }
      lines.push(`  - Completed: ${card.updated_at}`);
    }

    const summary = lines.join('\n');

    // Delete the done cards and their comments
    const cardIds = doneCards.map(c => c.id);
    const placeholders = cardIds.map(() => '?').join(',');
    db.prepare(`DELETE FROM comments WHERE card_id IN (${placeholders})`).run(...cardIds);
    db.prepare(`DELETE FROM cards WHERE id IN (${placeholders})`).run(...cardIds);

    // Emit WebSocket events
    const io = req.app.locals.io;
    for (const id of cardIds) {
      emitCardEvent(io, 'card:deleted', { id });
    }

    res.json({ message: `Archived ${doneCards.length} tasks`, summary, archived: doneCards.length });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
