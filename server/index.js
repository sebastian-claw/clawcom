const express = require('express');
const cors = require('cors');
const path = require('path');
const { createServer } = require('http');
const { Server } = require('socket.io');
const Database = require('better-sqlite3');
const { initializeDatabase, seedDatabase } = require('./db');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;

// Initialize database
const dbPath = path.join(__dirname, 'db.sqlite');
const db = new Database(dbPath);
initializeDatabase(db);

// Make db and io accessible to routes
app.locals.db = db;
app.locals.io = io;

// Seed sample data on first run
seedDatabase(db);

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files in production
app.use(express.static(path.join(__dirname, '../client/dist')));

// API Routes
const cardsRouter = require('./routes/cards');
const labelsRouter = require('./routes/labels');
const jobsRouter = require('./routes/jobs');
const commentsRouter = require('./routes/comments');
const statsRouter = require('./routes/stats');

app.use('/api/cards', cardsRouter);
app.use('/api/labels', labelsRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/comments', commentsRouter);
app.use('/api/stats', statsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve React app for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle typing events
  socket.on('typing:start', (data) => {
    // Broadcast to all OTHER clients (not the sender)
    socket.broadcast.emit('typing:start', { author: data.author });
  });

  socket.on('typing:stop', (data) => {
    // Broadcast to all OTHER clients (not the sender)
    socket.broadcast.emit('typing:stop', { author: data.author });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;
