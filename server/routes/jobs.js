const express = require('express');
const router = express.Router();

// Get all jobs
router.get('/', (req, res, next) => {
  try {
    const stmt = req.app.locals.db.prepare('SELECT * FROM jobs ORDER BY name ASC');
    const jobs = stmt.all();
    res.json(jobs);
  } catch (error) {
    next(error);
  }
});

// Get single job
router.get('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const stmt = req.app.locals.db.prepare('SELECT * FROM jobs WHERE id = ?');
    const job = stmt.get(id);

    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    res.json(job);
  } catch (error) {
    next(error);
  }
});

// Create job
router.post('/', (req, res, next) => {
  try {
    const { name, description, color } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const stmt = req.app.locals.db.prepare(
      'INSERT INTO jobs (name, description, color) VALUES (?, ?, ?)'
    );
    const result = stmt.run(
      name,
      description || '',
      color || '#6366f1'
    );

    const newJob = req.app.locals.db.prepare('SELECT * FROM jobs WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json(newJob);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Job already exists' });
    }
    next(error);
  }
});

// Update job
router.put('/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, description, color } = req.body;

    const existingJob = req.app.locals.db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
    if (!existingJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const stmt = req.app.locals.db.prepare(`
      UPDATE jobs
      SET name = ?, description = ?, color = ?
      WHERE id = ?
    `);

    stmt.run(
      name ?? existingJob.name,
      description ?? existingJob.description,
      color ?? existingJob.color,
      id
    );

    const updatedJob = req.app.locals.db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
    res.json(updatedJob);
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Job name already exists' });
    }
    next(error);
  }
});

// Delete job
router.delete('/:id', (req, res, next) => {
  try {
    const { id } = req.params;

    const existingJob = req.app.locals.db.prepare('SELECT * FROM jobs WHERE id = ?').get(id);
    if (!existingJob) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Don't allow deleting the "General" job
    if (existingJob.name === 'General') {
      return res.status(400).json({ error: 'Cannot delete the General job' });
    }

    // Set job_id to NULL for cards using this job
    req.app.locals.db.prepare('UPDATE cards SET job_id = NULL WHERE job_id = ?').run(id);

    req.app.locals.db.prepare('DELETE FROM jobs WHERE id = ?').run(id);
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
