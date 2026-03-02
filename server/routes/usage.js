const express = require('express');
const router = express.Router();

// GET /api/usage/minimax - Get Minimax API usage
router.get('/minimax', async (req, res) => {
  console.log('MINIMAX USAGE ENDPOINT HIT');
  try {
    const authToken = process.env.MINIMAX_API_KEY || 'sk-cp-NhTZ2VxKzi-3bv0p2poDc4Z5';
    const response = await fetch('https://www.minimax.io/v1/api/openplatform/coding_plan/remains', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Usage error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
