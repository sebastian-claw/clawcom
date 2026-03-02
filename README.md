# CLAWCOM

<p align="center">
  <img src="client/public/logo.svg" alt="CLAWCOM" width="200" />
</p>

A real-time kanban board built for **human-AI teams**. CLAWCOM was designed from the ground up so an AI agent and a human can collaborate on projects together — the human manages priorities and reviews work through the browser, while the agent picks up tasks, posts updates, and moves cards through the API.

It works just as well for small human teams too, but the API-first design and webhook integration make it particularly suited for workflows where an AI assistant is part of the team.

## Why CLAWCOM?

Most project management tools assume all users are humans clicking around in a browser. CLAWCOM assumes one of your team members might be an API call. Every action available in the UI is also available through the REST API, which means an AI agent can:

- Pull tasks from the backlog and move them to in-progress
- Post status updates and questions as comments on cards
- Chat with the team through the built-in global chat
- Archive completed work at the end of the day
- Trigger webhooks to notify external systems

The human stays in control — reviewing work, setting priorities, creating tasks — while the agent handles execution and communication through the same board.

## Features

- **Kanban Board** — Drag-and-drop cards between Backlog, In Progress, Review, and Done
- **Jobs/Projects** — Organize tasks under different jobs, each with its own color coding
- **Real-Time Updates** — WebSocket (Socket.IO) pushes all changes instantly to every connected client
- **Global Chat** — Built-in team chat with typing indicators and markdown support
- **Card Comments** — Threaded comments on each task card
- **Unread Indicators** — Cards with unread comments glow with a backlit effect
- **Activity Feed** — Collapsible side panel showing a live terminal-style log of all activity
- **Dashboard** — Activity graphs, job breakdowns, and daily summaries
- **Daily Archive** — API endpoint to bulk-archive completed tasks into compact summaries
- **Webhook Integration** — Notify external systems (like an AI agent) when tasks are created or moved
- **Dark Theme** — Clean dark UI with indigo accent palette

## Tech Stack

**Backend:** Node.js, Express, SQLite (better-sqlite3), Socket.IO  
**Frontend:** React 18, Vite, dnd-kit, Socket.IO Client, react-markdown

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/sebastian-claw/clawcom.git
cd clawcom
npm run install:all
```

### Development

```bash
npm run dev
```

- **API Server:** http://localhost:3001
- **Vite Dev Server:** http://localhost:5173

### Production

```bash
npm run build
npm start
```

Server runs on port `3001` by default. Set `PORT` env var to change it.

## Project Structure

```
clawcom/
├── server/
│   ├── index.js           # Express + Socket.IO server
│   ├── db.js              # SQLite database init
│   ├── webhook.js         # External webhook notifications
│   └── routes/
│       ├── cards.js       # Task CRUD + move + archive
│       ├── comments.js    # Comments + typing indicators
│       ├── jobs.js        # Job/project management
│       ├── labels.js      # Label management
│       └── stats.js       # Dashboard stats + activity feed
├── client/
│   ├── src/
│   │   ├── App.jsx        # Main kanban board app
│   │   ├── api.js         # API client helpers
│   │   ├── components/
│   │   │   ├── ActivityPanel.jsx  # Live activity feed
│   │   │   ├── Card.jsx           # Task card display
│   │   │   ├── CardModal.jsx      # Card create/edit modal
│   │   │   ├── Column.jsx         # Kanban column
│   │   │   ├── DashboardModal.jsx # Stats dashboard
│   │   │   ├── GlobalChat.jsx     # Real-time chat
│   │   │   ├── Header.jsx         # App header
│   │   │   ├── JobsModal.jsx      # Job management
│   │   │   ├── SettingsModal.jsx  # Settings panel
│   │   │   ├── SortableCard.jsx   # Drag-and-drop wrapper
│   │   │   └── Toast.jsx          # Notifications
│   │   ├── styles/
│   │   │   └── index.css  # All styles (dark theme)
│   │   └── main.jsx       # React entry point
│   └── public/            # Logo + favicon
└── package.json           # Root scripts
```

## API Reference

Base URL: `http://localhost:3001/api`

All endpoints return JSON. An AI agent can use these to fully participate in the workflow without ever touching the browser.

### Cards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cards` | List cards (optional `?column_id=` filter) |
| GET | `/cards/:id` | Get single card |
| POST | `/cards` | Create card |
| PUT | `/cards/:id` | Update card |
| PUT | `/cards/:id/move` | Move card (`{column_id, position}`) |
| DELETE | `/cards/:id` | Delete card |
| POST | `/cards/archive-done` | Archive all completed tasks |

Card fields: `title`, `description`, `priority` (low/medium/high/urgent), `labels`, `due_date`, `column_id` (backlog/in-progress/review/done), `position`, `job_id`, `assigned_to`

### Comments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/comments` | List comments (`?card_id=` for card, `null` for global chat) |
| POST | `/comments` | Create comment (`card_id: null` = global chat) |
| POST | `/comments/typing` | Typing indicator |
| DELETE | `/comments/:id` | Delete comment |

### Jobs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/jobs` | List jobs |
| POST | `/jobs` | Create job |
| PUT | `/jobs/:id` | Update job |
| DELETE | `/jobs/:id` | Delete job |

### Stats
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats` | Dashboard data (board counts, activity, summaries) |
| GET | `/stats/feed` | Recent activity feed (`?limit=` to control count) |

### Labels
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/labels` | List labels |
| POST | `/labels` | Create label |
| DELETE | `/labels/:id` | Delete label |

## WebSocket Events

Connect via Socket.IO to the server URL:

- `card:created` / `card:updated` / `card:moved` / `card:deleted`
- `comment:created` / `comment:deleted`
- `typing` — User typing indicator
- `activity` — Live activity feed events

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `WEBHOOK_URL` | — | Webhook URL for external notifications |

### Webhook

Set `WEBHOOK_URL` to receive POST notifications when tasks are created, moved, or updated. This is how an AI agent can stay in the loop — point it at your agent's webhook endpoint and it gets notified of every board change.

## Running as a Service (systemd)

```bash
cat > ~/.config/systemd/user/clawcom.service << UNIT
[Unit]
Description=CLAWCOM Server
After=network.target

[Service]
Type=simple
WorkingDirectory=/path/to/clawcom
ExecStart=/usr/bin/node server/index.js
Restart=always
Environment=PORT=3001

[Install]
WantedBy=default.target
UNIT

systemctl --user daemon-reload
systemctl --user enable clawcom
systemctl --user start clawcom
```

## Background

CLAWCOM was built in a single afternoon by an AI agent (Sebastian) and a human (Michael) working together. The AI wrote the code and managed tasks through the API while the human reviewed, tested, and directed priorities through the browser UI. The tool itself was used to manage its own development — tasks moved across the board in real-time as features were built, reviewed, and completed.

The name is a play on CENTCOM — a command center for coordinating work between humans and AI.

## License

MIT
