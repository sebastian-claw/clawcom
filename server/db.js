const Database = require('better-sqlite3');

function initializeDatabase(db) {
  // Create jobs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT NOT NULL DEFAULT '#6366f1',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create cards table
  db.exec(`
    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
      labels TEXT DEFAULT '[]',
      due_date TEXT,
      created_date TEXT NOT NULL,
      column_id TEXT DEFAULT 'backlog' CHECK(column_id IN ('backlog', 'in-progress', 'review', 'done')),
      position INTEGER DEFAULT 0,
      job_id INTEGER,
      assigned_to TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE SET NULL
    )
  `);

  // Create labels table
  db.exec(`
    CREATE TABLE IF NOT EXISTS labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      color TEXT NOT NULL
    )
  `);

  // Create comments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      card_id INTEGER,
      author TEXT NOT NULL,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (card_id) REFERENCES cards(id) ON DELETE CASCADE
    )
  `);

  // Create activity log table for dashboard stats
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      card_title TEXT,
      card_id INTEGER,
      job_id INTEGER,
      job_name TEXT,
      assigned_to TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create indexes for better query performance
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_cards_column ON cards(column_id);
    CREATE INDEX IF NOT EXISTS idx_cards_priority ON cards(priority);
    CREATE INDEX IF NOT EXISTS idx_cards_job_id ON cards(job_id);
    CREATE INDEX IF NOT EXISTS idx_cards_assigned_to ON cards(assigned_to);
    CREATE INDEX IF NOT EXISTS idx_comments_card_id ON comments(card_id);
  `);

  // Migration: Add assigned_to column if it doesn't exist
  try {
    db.exec(`ALTER TABLE cards ADD COLUMN assigned_to TEXT`);
  } catch (e) {
    // Column may already exist, ignore error
  }

  console.log('Database initialized');
}

function seedDatabase(db) {
  // Check if jobs already exist
  const jobCount = db.prepare('SELECT COUNT(*) as count FROM jobs').get();

  console.log('Seeding database with sample data...');

  // Insert sample labels only if they don't exist
  const labelCount = db.prepare('SELECT COUNT(*) as count FROM labels').get();
  if (labelCount.count === 0) {
    const insertLabel = db.prepare('INSERT INTO labels (name, color) VALUES (?, ?)');
    const sampleLabels = [
      ['frontend', '#8b5cf6'],
      ['backend', '#06b6d4'],
      ['design', '#ec4899'],
      ['devops', '#10b981'],
      ['api', '#f59e0b'],
      ['testing', '#22c55e'],
      ['docs', '#6366f1'],
      ['feature', '#8b5cf6']
    ];

    const insertLabelTransaction = db.transaction((labels) => {
      for (const [name, color] of labels) {
        insertLabel.run(name, color);
      }
    });
    insertLabelTransaction(sampleLabels);
  }

  // If jobs don't exist, create them and seed sample cards
  if (jobCount.count === 0) {
    // Insert sample jobs
    const insertJob = db.prepare('INSERT INTO jobs (name, description, color) VALUES (?, ?, ?)');
    const sampleJobs = [
      {
        name: 'General',
        description: 'General tasks not assigned to any specific project',
        color: '#6366f1'
      },
      {
        name: 'Oak and Clay Website',
        description: 'Website redesign and development for Oak and Clay',
        color: '#8b5cf6'
      },
      {
        name: 'CLAWCOM',
        description: 'This kanban board application',
        color: '#06b6d4'
      },
      {
        name: 'Timber Frame Articles',
        description: 'Content creation for timber frame construction articles',
        color: '#10b981'
      }
    ];

    const insertJobTransaction = db.transaction((jobs) => {
      for (const job of jobs) {
        insertJob.run(job.name, job.description, job.color);
      }
    });
    insertJobTransaction(sampleJobs);

    // Get the General job ID for assigning existing cards
    const generalJob = db.prepare('SELECT id FROM jobs WHERE name = ?').get('General');
    const generalJobId = generalJob.id;

    // Insert sample cards
    const sampleCards = [
      {
        title: 'Set up project infrastructure',
        description: 'Initialize the repository with proper structure and dependencies',
        priority: 'high',
        labels: JSON.stringify(['setup', 'devops']),
        due_date: '2026-02-15',
        column_id: 'done',
        position: 0,
        created_date: '2026-02-01',
        job_id: generalJobId
      },
      {
        title: 'Design system components',
        description: 'Create reusable UI components following the design spec',
        priority: 'medium',
        labels: JSON.stringify(['design', 'frontend']),
        due_date: '2026-02-20',
        column_id: 'review',
        position: 0,
        created_date: '2026-02-03',
        job_id: generalJobId
      },
      {
        title: 'Implement drag and drop',
        description: 'Add dnd-kit for smooth card dragging between columns',
        priority: 'high',
        labels: JSON.stringify(['frontend', 'feature']),
        due_date: '2026-02-25',
        column_id: 'in-progress',
        position: 0,
        created_date: '2026-02-05',
        job_id: generalJobId
      },
      {
        title: 'REST API endpoints',
        description: 'Build Express API for CRUD operations and filtering',
        priority: 'urgent',
        labels: JSON.stringify(['backend', 'api']),
        due_date: '2026-02-22',
        column_id: 'in-progress',
        position: 1,
        created_date: '2026-02-06',
        job_id: generalJobId
      },
      {
        title: 'Add unit tests',
        description: 'Write tests for critical business logic',
        priority: 'low',
        labels: JSON.stringify(['testing']),
        due_date: '2026-03-01',
        column_id: 'backlog',
        position: 0,
        created_date: '2026-02-08',
        job_id: generalJobId
      },
      {
        title: 'Documentation',
        description: 'Write README with API docs and setup instructions',
        priority: 'medium',
        labels: JSON.stringify(['docs']),
        due_date: '2026-03-05',
        column_id: 'backlog',
        position: 1,
        created_date: '2026-02-09',
        job_id: generalJobId
      }
    ];

    const insertCardsTransaction = db.transaction((cards) => {
      const insertCardStmt = db.prepare(`
        INSERT INTO cards (title, description, priority, labels, due_date, column_id, position, created_date, job_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const card of cards) {
        insertCardStmt.run(
          card.title,
          card.description,
          card.priority,
          card.labels,
          card.due_date,
          card.column_id,
          card.position,
          card.created_date,
          card.job_id
        );
      }
    });

    insertCardsTransaction(sampleCards);
  } else {
    // Migration: Assign existing cards without job_id to General job
    const generalJob = db.prepare('SELECT id FROM jobs WHERE name = ?').get('General');
    if (generalJob) {
      // Update cards that don't have a job_id
      db.prepare('UPDATE cards SET job_id = ? WHERE job_id IS NULL').run(generalJob.id);
    }
  }

  console.log('Database seeded with sample data');
}

module.exports = { initializeDatabase, seedDatabase };
