const API_BASE = '/api';

async function fetchCards(query = '') {
  const response = await fetch(`${API_BASE}/cards${query}`);
  if (!response.ok) {
    throw new Error('Failed to fetch cards');
  }
  return response.json();
}

async function fetchCard(id) {
  const response = await fetch(`${API_BASE}/cards/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch card');
  }
  return response.json();
}

async function createCard(cardData) {
  const response = await fetch(`${API_BASE}/cards`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cardData),
  });
  if (!response.ok) {
    throw new Error('Failed to create card');
  }
  return response.json();
}

async function updateCard(id, cardData) {
  const response = await fetch(`${API_BASE}/cards/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(cardData),
  });
  if (!response.ok) {
    throw new Error('Failed to update card');
  }
  return response.json();
}

async function updateCardPosition(id, { column_id, position }) {
  const response = await fetch(`${API_BASE}/cards/${id}/move`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ column_id, position }),
  });
  if (!response.ok) {
    throw new Error('Failed to move card');
  }
  return response.json();
}

async function deleteCard(id) {
  const response = await fetch(`${API_BASE}/cards/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete card');
  }
  return response.json();
}

async function fetchLabels() {
  const response = await fetch(`${API_BASE}/labels`);
  if (!response.ok) {
    throw new Error('Failed to fetch labels');
  }
  return response.json();
}

async function createLabel(name, color) {
  const response = await fetch(`${API_BASE}/labels`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, color }),
  });
  if (!response.ok) {
    throw new Error('Failed to create label');
  }
  return response.json();
}

async function deleteLabel(id) {
  const response = await fetch(`${API_BASE}/labels/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete label');
  }
  return response.json();
}

async function fetchJobs() {
  const response = await fetch(`${API_BASE}/jobs`);
  if (!response.ok) {
    throw new Error('Failed to fetch jobs');
  }
  return response.json();
}

async function createJob(jobData) {
  const response = await fetch(`${API_BASE}/jobs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(jobData),
  });
  if (!response.ok) {
    throw new Error('Failed to create job');
  }
  return response.json();
}

async function updateJob(id, jobData) {
  const response = await fetch(`${API_BASE}/jobs/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(jobData),
  });
  if (!response.ok) {
    throw new Error('Failed to update job');
  }
  return response.json();
}

async function deleteJob(id) {
  const response = await fetch(`${API_BASE}/jobs/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete job');
  }
  return response.json();
}

async function fetchComments(cardId) {
  const params = cardId !== undefined ? `?card_id=${cardId}` : '';
  const response = await fetch(`${API_BASE}/comments${params}`);
  if (!response.ok) {
    throw new Error('Failed to fetch comments');
  }
  return response.json();
}

async function createComment(commentData) {
  const response = await fetch(`${API_BASE}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(commentData),
  });
  if (!response.ok) {
    throw new Error('Failed to create comment');
  }
  return response.json();
}

async function deleteComment(id) {
  const response = await fetch(`${API_BASE}/comments/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error('Failed to delete comment');
  }
  return response.json();
}

export {
  fetchCards,
  fetchCard,
  createCard,
  updateCard,
  updateCardPosition,
  deleteCard,
  fetchLabels,
  createLabel,
  deleteLabel,
  fetchJobs,
  createJob,
  updateJob,
  deleteJob,
  fetchComments,
  createComment,
  deleteComment,
};
