const express = require('express');
const router = express.Router();

// Get all labels
router.get('/', (req, res, next) => {
  try {
    const stmt = req.app.locals.db.prepare('SELECT * FROM labels ORDER BY name ASC');
    const labels = stmt.all();
    res.json(labels);
  } catch (error) {
    next(error);
  }
});

// Create label
router.post('/', (req, res, next) => {
  try {
    const { name, color } = req.body;

    if (!name || !color) {
      return res.status(400).json({ error: 'Name and color are required' });
    }

    const stmt = req.app.locals.db.prepare('INSERT INTO labels (name, color) VALUES (?, ?)');
    const result = stmt.run(name.toLowerCase(), color);

    const newLabel = req.app.locals.db.prepare('SELECT * FROM labels WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newLabel);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Label already exists' });
    }
    next(error);
  }
});

// Delete label
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;

    const existingLabel = req.app.locals.db.prepare('SELECT * FROM labels WHERE id = ?').get(id);
    if (!existingLabel) {
      return res.status(404).json({ error: 'Label not found' });
    }

    req.app.locals.db.prepare('DELETE FROM labels WHERE id = ?').run(id);
    res.json({ message: 'Label deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
