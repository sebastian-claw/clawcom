const express = require('express');
const router = express.Router();
const { notifyOpenClaw, chatToOpenClaw } = require('../webhook');
const config = require('../config');

// Helper to emit comment events
const emitCommentEvent = (io, event, comment) => {
  if (io) {
    io.emit(event, comment);
  }
};

// Get comments - optionally filter by card_id (omit for global chat)
router.get('/', (req, res, next) => {
  try {
    const { card_id } = req.query;

    let query = 'SELECT * FROM comments';
    const params = [];

    if (card_id !== undefined) {
      // If card_id is provided and not empty
      if (card_id === '' || card_id === 'null') {
        // Global chat (null card_id)
        query += ' WHERE card_id IS NULL';
      } else {
        // Specific card
        query += ' WHERE card_id = ?';
        params.push(parseInt(card_id));
      }
    } else {
      // No card_id param - return all comments (both global and card-specific)
    }

    query += ' ORDER BY created_at ASC';

    const stmt = req.app.locals.db.prepare(query);
    const comments = stmt.all(...params);

    res.json(comments);
  } catch (error) {
    next(error);
  }
});

// Create comment
router.post('/', (req, res, next) => {
  try {
    const { card_id, author, message } = req.body;

    if (!author || !message) {
      return res.status(400).json({ error: 'Author and message are required' });
    }

    // If card_id is provided and not empty, validate it exists
    let finalCardId = null;
    if (card_id !== undefined && card_id !== '' && card_id !== null) {
      const card = req.app.locals.db.prepare('SELECT id, title FROM cards WHERE id = ?').get(card_id);
      if (!card) {
        return res.status(404).json({ error: 'Card not found' });
      }
      finalCardId = card_id;
    }

    const stmt = req.app.locals.db.prepare(`
      INSERT INTO comments (card_id, author, message)
      VALUES (?, ?, ?)
    `);

    const result = stmt.run(finalCardId, author, message);

    const newComment = req.app.locals.db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);

    // Get card title for webhook (if this is a card comment)
    let cardTitle = null;
    if (finalCardId) {
      const card = req.app.locals.db.prepare('SELECT title FROM cards WHERE id = ?').get(finalCardId);
      cardTitle = card?.title;
    }

    const location = cardTitle ? cardTitle : 'Global';
    const messagePreview = message.length > 50 ? message.substring(0, 50) + '...' : message;
    // Skip webhook for AI's own messages to avoid self-notification loop
    if (author !== config.aiName) {
      chatToOpenClaw(author, location, message);
    }

    // Emit WebSocket event for real-time updates
    emitCommentEvent(req.app.locals.io, 'comment:created', newComment);
    req.app.locals.io.emit('activity', { action: 'comment', message: `${newComment.author} commented${newComment.card_id ? '' : ' in chat'}: "${newComment.message.substring(0, 60)}..."`, timestamp: new Date().toISOString() });

    res.status(201).json(newComment);
  } catch (error) {
    next(error);
  }
});

// Typing indicator endpoint
router.post('/typing', (req, res, next) => {
  try {
    const { author, typing } = req.body;

    if (!author) {
      return res.status(400).json({ error: 'Author is required' });
    }

    if (typing === undefined) {
      return res.status(400).json({ error: 'typing flag is required' });
    }

    // Emit typing event to all OTHER clients via Socket.IO
    const io = req.app.locals.io;
    if (io) {
      const event = typing ? 'typing:start' : 'typing:stop';
      // Use broadcast to exclude sender (not applicable for REST, but follows same pattern)
      io.emit(event, { author });
    }

    res.json({ success: true, typing });
  } catch (error) {
    next(error);
  }
});

// Delete comment
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;

    const existingComment = req.app.locals.db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
    if (!existingComment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    req.app.locals.db.prepare('DELETE FROM comments WHERE id = ?').run(id);

    // Emit WebSocket event for real-time updates
    emitCommentEvent(req.app.locals.io, 'comment:deleted', { id: parseInt(id) });

    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

// POST /api/comments/stream - Create or update a streaming comment
router.post('/stream', (req, res, next) => {
  try {
    const { id, author, message, card_id, done } = req.body;
    const io = req.app.locals.io;
    const db = req.app.locals.db;
    
    if (id) {
      // Update existing streaming comment
      db.prepare('UPDATE comments SET message = ? WHERE id = ?').run(message, id);
      io.emit('comment:streaming', { id, message, done: !!done });
      if (done) {
        const comment = db.prepare('SELECT * FROM comments WHERE id = ?').get(id);
        io.emit('comment:updated', comment);
      }
      res.json({ id, status: done ? 'complete' : 'streaming' });
    } else {
      // Create new streaming comment
      const result = db.prepare(
        'INSERT INTO comments (card_id, author, message) VALUES (?, ?, ?)'
      ).run(card_id || null, author, message || '');
      const newComment = db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid);
      io.emit('comment:created', newComment);
      io.emit('comment:streaming', { id: newComment.id, message: newComment.message, done: false });
      res.json(newComment);
    }
  } catch (error) {
    next(error);
  }
});
