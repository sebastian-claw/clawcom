// Server configuration
module.exports = {
  // AI agent name - used to prevent self-notification loops
  aiName: 'Sebastian',
  
  // Server port
  port: process.env.PORT || 3001,
  
  // Database
  database: {
    filename: './db.sqlite'
  }
};
