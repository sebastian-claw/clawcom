# CLAWCOM - Kanban Board Web App

## 1. Project Overview

- **Project Name**: CLAWCOM
- **Type**: Full-stack web application (Kanban board)
- **Core Functionality**: A kanban board for task management with drag-and-drop, filtering, and REST API for AI integration
- **Target Users**: Developers, teams, and AI agents managing tasks

## 2. Tech Stack

- **Frontend**: React 18 + Vite
- **Backend**: Express.js + better-sqlite3
- **Database**: SQLite
- **Styling**: CSS Modules / Custom CSS with CSS Variables
- **Drag & Drop**: @dnd-kit/core, @dnd-kit/sortable

## 3. UI/UX Specification

### Layout Structure

- **Header**: Fixed top bar (60px height) with logo, search, and filter controls
- **Main Content**: Horizontal scrollable kanban board with 4 columns
- **Columns**: Fixed width (320px), scrollable vertically
- **Cards**: Full column width with consistent padding

### Responsive Breakpoints

- **Desktop** (>1200px): Full 4-column layout
- **Tablet** (768-1200px): 2-3 columns visible, horizontal scroll
- **Mobile** (<768px): Single column view with column selector tabs

### Visual Design

#### Color Palette (Dark Theme - Linear/Notion vibes)

```css
--bg-primary: #0d0d0f;        /* Main background */
--bg-secondary: #18181b;      /* Column background */
--bg-tertiary: #27272a;      /* Card background */
--bg-hover: #3f3f46;         /* Hover states */
--border: #3f3f46;           /* Borders */
--border-subtle: #27272a;    /* Subtle borders */

--text-primary: #fafafa;     /* Primary text */
--text-secondary: #a1a1aa;   /* Secondary text */
--text-muted: #71717a;       /* Muted text */

--accent: #6366f1;           /* Primary accent (indigo) */
--accent-hover: #818cf8;     /* Accent hover */

--priority-low: #22c55e;     /* Green */
--priority-medium: #eab308;  /* Yellow */
--priority-high: #f97316;    /* Orange */
--priority-urgent: #ef4444;  /* Red */

--tag-colors: #8b5cf6, #06b6d4, #10b981, #f59e0b, #ec4899, #6366f1;
```

#### Typography

- **Font Family**: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif
- **Headings**:
  - H1: 24px, weight 600
  - H2: 18px, weight 600
  - H3: 14px, weight 600
- **Body**: 14px, weight 400
- **Small**: 12px, weight 400

#### Spacing System

- Base unit: 4px
- xs: 4px, sm: 8px, md: 12px, lg: 16px, xl: 24px, 2xl: 32px

#### Visual Effects

- Card shadow: `0 1px 3px rgba(0,0,0,0.3)`
- Card hover: slight lift with `transform: translateY(-2px)`
- Transitions: 150ms ease for all interactive elements
- Border radius: 8px for cards, 6px for buttons/inputs

### Components

#### Header
- Logo (left): "CLAWCOM" text with claw emblem
- Search input (center): with search icon
- Filter dropdowns (right): Priority, Label

#### Column
- Header with title and card count
- Add card button (+ icon)
- Droppable area for cards
- Scrollable card list

#### Card
- Priority indicator (colored left border)
- Title (truncated if long)
- Description preview (2 lines max)
- Labels/tags (colored chips)
- Due date (with icon, red if overdue)
- Drag handle on hover

#### Modal (Add/Edit Card)
- Overlay with blur backdrop
- Form fields: Title, Description (textarea), Priority (select), Labels (multi-select), Due Date
- Save/Cancel buttons
- Delete button (edit mode only)

#### Filter Bar
- Search input
- Priority dropdown (All, Low, Medium, High, Urgent)
- Label multi-select

## 4. Database Schema

```sql
CREATE TABLE cards (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium',
  labels TEXT, -- JSON array
  due_date TEXT,
  created_date TEXT NOT NULL,
  column_id TEXT DEFAULT 'backlog',
  position INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE labels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL
);
```

## 5. API Specification

### Base URL: `/api`

#### Cards

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/cards` | Get all cards (supports query params: column, priority, label, search) |
| GET | `/cards/:id` | Get single card |
| POST | `/cards` | Create new card |
| PUT | `/cards/:id` | Update card |
| DELETE | `/cards/:id` | Delete card |
| PUT | `/cards/:id/move` | Move card to column/position |

#### Labels

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/labels` | Get all labels |
| POST | `/labels` | Create label |
| DELETE | `/labels/:id` | Delete label |

### Query Parameters for GET /cards

- `column`: Filter by column (backlog, in-progress, review, done)
- `priority`: Filter by priority (low, medium, high, urgent)
- `label`: Filter by label name
- `search`: Search in title and description

## 6. Sample Data (First Run)

```javascript
const sampleCards = [
  {
    title: "Set up project infrastructure",
    description: "Initialize the repository with proper structure and dependencies",
    priority: "high",
    labels: ["setup", "devops"],
    column_id: "done",
    due_date: "2026-02-15"
  },
  {
    title: "Design system components",
    description: "Create reusable UI components following the design spec",
    priority: "medium",
    labels: ["design", "frontend"],
    column_id: "review",
    due_date: "2026-02-20"
  },
  {
    title: "Implement drag and drop",
    description: "Add dnd-kit for smooth card dragging between columns",
    priority: "high",
    labels: ["frontend", "feature"],
    column_id: "in-progress",
    due_date: "2026-02-25"
  },
  {
    title: "REST API endpoints",
    description: "Build Express API for CRUD operations and filtering",
    priority: "urgent",
    labels: ["backend", "api"],
    column_id: "in-progress",
    due_date: "2026-02-22"
  },
  {
    title: "Add unit tests",
    description: "Write tests for critical business logic",
    priority: "low",
    labels: ["testing"],
    column_id: "backlog",
    due_date: "2026-03-01"
  },
  {
    title: "Documentation",
    description: "Write README with API docs and setup instructions",
    priority: "medium",
    labels: ["docs"],
    column_id: "backlog",
    due_date: "2026-03-05"
  }
];

const sampleLabels = [
  { name: "frontend", color: "#8b5cf6" },
  { name: "backend", color: "#06b6d4" },
  { name: "design", color: "#ec4899" },
  { name: "devops", color: "#10b981" },
  { name: "api", color: "#f59e0b" },
  { name: "testing", color: "#22c55e" },
  { name: "docs", color: "#6366f1" },
  { name: "feature", color: "#8b5cf6" }
];
```

## 7. Acceptance Criteria

### Functional
- [ ] Kanban board displays 4 columns: Backlog, In Progress, Review, Done
- [ ] Cards can be dragged and dropped between columns
- [ ] Cards can be created via modal with all fields
- [ ] Cards can be edited via modal
- [ ] Cards can be deleted
- [ ] Search filters cards by title/description
- [ ] Priority filter works correctly
- [ ] Label filter works correctly
- [ ] Due date shows and is editable
- [ ] Overdue dates are highlighted in red

### UI/UX
- [ ] Dark theme applied consistently
- [ ] Responsive on mobile, tablet, desktop
- [ ] Loading states shown during API calls
- [ ] Error states handled gracefully
- [ ] Smooth drag and drop animations

### API
- [ ] All REST endpoints functional
- [ ] Query parameters work for filtering
- [ ] Proper error responses with status codes
- [ ] CORS enabled for development

### Production
- [ ] No console errors
- [ ] Proper error handling
- [ ] Sample data loaded on first run
- [ ] README with API documentation
