# CLAWCOM

<p align="center">
  <img src="client/public/logo.svg" alt="CLAWCOM" width="200" />
</p>


A real-time kanban board and project management app built for small teams. Features drag-and-drop task management, live chat, comments, typing indicators, and WebSocket-powered instant updates across all connected clients.

## Features

- **Kanban Board** — Drag-and-drop cards between Backlog, In Progress, Review, and Done columns
- **Jobs/Projects** — Organize tasks under different jobs, each with its own color coding
- **Real-Time Updates** — WebSocket (Socket.IO) pushes all changes instantly to every connected browser
- **Global Chat** — Built-in team chat with typing indicators and markdown support
- **Card Comments** — Threaded comments on each task card
- **Unread Indicators** — Cards with unread comments glow with a subtle backlit effect
- **Daily Archive** — API endpoint to archive completed tasks into compact summaries
- **Webhook Integration** — Optional webhook for external notifications (e.g., AI assistants)
- **Dark Theme** — Clean dark UI with indigo accent palette
- **Collapsible Done Column** — Completed tasks collapse to single lines to reduce clutter

## Tech Stack

**Backend:** Node.js, Express, SQLite (better-sqlite3), Socket.IO
**Frontend:** React 18, Vite, dnd-kit, Socket.IO Client, react-markdown

## Quick Start

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/YOUR_USERNAME/clawcom.git
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
│       └── labels.js      # Label management
├── client/
│   ├── src/
│   │   ├── App.jsx        # Main kanban board app
│   │   ├── api.js         # API client helpers
│   │   ├── components/    # React components
│   │   ├── styles/        # CSS (dark theme)
│   │   └── main.jsx       # Entry point
│   └── public/            # Logo + favicon
└── package.json           # Root scripts
```

## API Reference

Base URL: `http://localhost:3001/api`

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
| GET | `/comments` | List comments (`?card_id=` or `null` for global chat) |
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

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `WEBHOOK_URL` | — | Webhook URL for external notifications |

## Running as a Service (systemd)

```bash
cat > ~/.config/systemd/user/mission-control.service << UNIT
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
systemctl --user enable mission-control
systemctl --user start mission-control
```

## License

MIT
