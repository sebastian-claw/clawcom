import { useState, useEffect, useRef, memo } from 'react';
import SettingsModal from './components/SettingsModal';
import { useToast } from './components/Toast';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import { io } from 'socket.io-client';
import Header from './components/Header';
import Column from './components/Column';
import Card from './components/Card';
import CardModal from './components/CardModal';
import JobsModal from './components/JobsModal';
import GlobalChat from './components/GlobalChat';
import ActivityPanel from './components/ActivityPanel';
import DashboardModal from './components/DashboardModal';
import { fetchCards, fetchLabels, fetchJobs, updateCardPosition, fetchComments, createComment, deleteComment } from './api';

const ColumnMemo = memo(Column);

const DEFAULT_SETTINGS = {
  bgPrimary: '#0d0d0f',
  bgTertiary: '#27272a',
  priorityLow: '#22c55e',
  priorityMedium: '#eab308',
  priorityHigh: '#f97316',
  priorityUrgent: '#ef4444',
};

const COLUMNS = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'in-progress', title: 'In Progress' },
  { id: 'review', title: 'Review' },
  { id: 'done', title: 'Done' },
];

function App() {
  const { showCardMoved, showCardCreated, showCardDeleted, showNewComment, ToastContainer } = useToast();
  const cardsRef = useRef([]);
  const [cards, setCards] = useState([]);
  const [labels, setLabels] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [currentJob, setCurrentJob] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCard, setActiveCard] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [jobsModalOpen, setJobsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    priority: '',
    label: '',
    assigned_to: '',
  });
  const [socket, setSocket] = useState(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [globalComments, setGlobalComments] = useState([]);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [notificationPermission, setNotificationPermission] = useState(Notification.permission);
  const [doneColumnKey, setDoneColumnKey] = useState(0);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [socketInstance, setSocketInstance] = useState(null);
  const [unreadComments, setUnreadComments] = useState({}); // { cardId: count }
  const [openCardId, setOpenCardId] = useState(null); // Track which card is currently open in modal
  const openCardIdRef = useRef(null); // Ref to track open card ID without causing re-renders

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Keep cardsRef in sync with cards state
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const socket = io('http://' + window.location.hostname + ':3001');
    setSocketInstance(socket);
    setSocket(socket);

    socket.on('card:created', (newCard) => {
      setCards((prev) => [...prev, newCard]);
      showCardCreated(newCard.title);
    });

    socket.on('card:updated', (updatedCard) => {
      setCards((prev) =>
        prev.map((c) => (c.id === updatedCard.id ? updatedCard : c))
      );
    });

    socket.on('card:moved', (movedCard) => {
      setCards((prev) =>
        prev.map((c) => (c.id === movedCard.id ? movedCard : c))
      );

      // Always show in-app toast notification
      showCardMoved(movedCard.title, movedCard.column_id);

      // Show browser notification only if document is not focused
      if (!document.hasFocus()) {
        const columnNames = {
          'backlog': 'Backlog',
          'in-progress': 'In Progress',
          'review': 'Review',
          'done': 'Done'
        };
        const newColumnName = columnNames[movedCard.column_id] || movedCard.column_id;

        if (Notification.permission === 'granted') {
          const notification = new Notification(`${movedCard.title} moved to ${newColumnName}`, {
            body: `Task moved to ${newColumnName}`,
            icon: '/favicon.ico',
            tag: 'card-moved',
          });

          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        }
      }
    });

    socket.on('card:deleted', ({ id }) => {
      // Get card title before removing for toast notification (using ref to avoid stale closure)
      const card = cardsRef.current.find((c) => c.id === id);
      const cardTitle = card?.title || 'Task';
      showCardDeleted(cardTitle);
      setCards((prev) => prev.filter((c) => c.id !== id));
    });

    // Comment events for global chat and card comments
    socket.on('comment:created', (comment) => {
      if (!comment.card_id) {
        // Global chat comment
        setGlobalComments((prev) => [...prev, comment]);

        // If chat is closed or tab is not focused, increment unread count and show notification
        if (!chatOpen || !document.hasFocus()) {
          setUnreadChatCount((prev) => prev + 1);

          // Show browser notification if permission granted
          if (Notification.permission === 'granted') {
            const notification = new Notification(`${comment.author} sent a message`, {
              body: comment.message.substring(0, 100),
              icon: '/favicon.ico',
              tag: 'global-chat',
            });

            notification.onclick = () => {
              window.focus();
              setChatOpen(true);
              setUnreadChatCount(0);
              notification.close();
            };
          }
        }
      } else {
        // Card comment - check if the card modal is currently open
        const cardId = String(comment.card_id);
        const isCardOpen = openCardIdRef.current && String(openCardIdRef.current) === cardId;
        const card = cardsRef.current.find(c => String(c.id) === cardId);
        const cardTitle = card?.title || 'Task';

        if (!isCardOpen) {
          // Card is not open - increment unread count
          setUnreadComments(prev => ({
            ...prev,
            [cardId]: (prev[cardId] || 0) + 1
          }));

          // Always show in-app toast notification
          showNewComment(cardTitle, comment.author);

          // Show browser notification if tab is not focused
          if (!document.hasFocus() && Notification.permission === 'granted') {
            const notification = new Notification(`New comment on "${cardTitle}"`, {
              body: `${comment.author}: ${comment.message.substring(0, 100)}`,
              icon: '/favicon.ico',
              tag: `card-comment-${cardId}`,
            });

            notification.onclick = () => {
              window.focus();
              // Find and open the card
              const targetCard = cardsRef.current.find(c => String(c.id) === cardId);
              if (targetCard) {
                setEditingCard(targetCard);
                setModalOpen(true);
              }
              notification.close();
            };
          }
        }
      }
    });

    socket.on('comment:deleted', ({ id }) => {
      setGlobalComments((prev) => prev.filter((c) => c.id !== id));
    });

    return () => {
      socket.disconnect();
    };
  }, [showCardMoved, showCardCreated, showCardDeleted, showNewComment, chatOpen]);

  // Load global comments on mount
  useEffect(() => {
    loadGlobalComments();
  }, []);

  // Request notification permission on first app open
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        setNotificationPermission(permission);
      });
    }
  }, []);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('mission-control-settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        applySettings(parsed);
      } catch (e) {
        console.error('Failed to parse saved settings:', e);
      }
    }
  }, []);

  // Apply settings to CSS variables
  const applySettings = (settings) => {
    const root = document.documentElement;
    root.style.setProperty('--bg-primary', settings.bgPrimary);
    root.style.setProperty('--bg-tertiary', settings.bgTertiary);
    root.style.setProperty('--priority-low', settings.priorityLow);
    root.style.setProperty('--priority-medium', settings.priorityMedium);
    root.style.setProperty('--priority-high', settings.priorityHigh);
    root.style.setProperty('--priority-urgent', settings.priorityUrgent);
  };

  // Handle saving settings
  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    localStorage.setItem('mission-control-settings', JSON.stringify(newSettings));
    applySettings(newSettings);
  };

  // Handle resetting settings to defaults
  const handleResetSettings = () => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.setItem('mission-control-settings', JSON.stringify(DEFAULT_SETTINGS));
    applySettings(DEFAULT_SETTINGS);
  };

  const loadGlobalComments = async () => {
    try {
      const data = await fetchComments('null');
      setGlobalComments(data);
    } catch (err) {
      console.error('Failed to load global comments:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadCards();
  }, [filters, currentJob]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [cardsData, labelsData, jobsData] = await Promise.all([
        fetchCards(),
        fetchLabels(),
        fetchJobs(),
      ]);
      setCards(cardsData);
      setLabels(labelsData);
      setJobs(jobsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadCards = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.label) params.append('label', filters.label);
      if (filters.assigned_to) params.append('assigned_to', filters.assigned_to);
      if (currentJob && currentJob !== 'all') params.append('job_id', currentJob);

      const query = params.toString();
      const cardsData = await fetchCards(query ? `?${query}` : '');
      setCards(cardsData);
    } catch (err) {
      console.error('Failed to load cards:', err);
    }
  };

  const getCardsByColumn = (columnId) => {
    return cards
      .filter((card) => card.column_id === columnId)
      .sort((a, b) => a.position - b.position);
  };

  const handleDragStart = (event) => {
    const { active } = event;
    const card = cards.find((c) => c.id === active.id);
    setActiveCard(card);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveCard(null);

    if (!over) return;

    const activeCard = cards.find((c) => c.id === active.id);
    if (!activeCard) return;

    let overColumnId = over.id;
    let overPosition = 0;

    // Check if dropping over a card
    if (COLUMNS.find((c) => c.id === over.id)) {
      // Dropping on a column - add to end
      overColumnId = over.id;
      const columnCards = getCardsByColumn(overColumnId);
      overPosition = columnCards.length;
    } else {
      // Dropping on a card
      const overCard = cards.find((c) => c.id === over.id);
      if (overCard) {
        overColumnId = overCard.column_id;
        const columnCards = getCardsByColumn(overColumnId);
        const overIndex = columnCards.findIndex((c) => c.id === over.id);
        overPosition = overIndex;
      }
    }

    // Track if card is moving from Done to another column
    const isMovingFromDone = activeCard.column_id === 'done' && overColumnId !== 'done';

    if (activeCard.column_id === overColumnId) {
      const columnCards = getCardsByColumn(overColumnId);
      const oldIndex = columnCards.findIndex((c) => c.id === active.id);
      const newIndex = columnCards.findIndex((c) => c.id === over.id);

      if (oldIndex !== newIndex && newIndex !== -1) {
        const reordered = arrayMove(columnCards, oldIndex, newIndex);
        // Update positions locally
        const updatedCards = cards.map((c) => {
          if (c.column_id === overColumnId) {
            const idx = reordered.findIndex((r) => r.id === c.id);
            return { ...c, position: idx };
          }
          return c;
        });
        setCards(updatedCards);

        // Persist to server
        try {
          await updateCardPosition(activeCard.id, {
            column_id: overColumnId,
            position: newIndex,
          });
        } catch (err) {
          console.error('Failed to update position:', err);
          loadCards();
        }
      }
    } else {
      // Moving to different column
      const sourceColumnCards = getCardsByColumn(activeCard.column_id);
      const destColumnCards = getCardsByColumn(overColumnId);

      // Update positions locally
      const updatedCards = cards
        .map((c) => {
          if (c.id === activeCard.id) {
            return { ...c, column_id: overColumnId, position: overPosition };
          }
          if (c.column_id === overColumnId && c.position >= overPosition) {
            return { ...c, position: c.position + 1 };
          }
          if (
            c.column_id === activeCard.column_id &&
            c.position > sourceColumnCards.find((cc) => cc.id === c.id)?.position
          ) {
            return { ...c, position: c.position - 1 };
          }
          return c;
        })
        .sort((a, b) => a.position - b.position);

      setCards(updatedCards);

      // Persist to server
      try {
        await updateCardPosition(activeCard.id, {
          column_id: overColumnId,
          position: overPosition,
        });
      } catch (err) {
        console.error('Failed to update position:', err);
        loadCards();
      }

      // Force re-render of Done column to expand the card
      if (isMovingFromDone) {
        setDoneColumnKey(prev => prev + 1);
      }
    }
  };

  const handleAddCard = (columnId) => {
    setEditingCard({
      column_id: columnId,
      title: '',
      description: '',
      priority: 'medium',
      labels: [],
      due_date: '',
    });
    setModalOpen(true);
  };

  const handleEditCard = (card) => {
    setEditingCard(card);
    setOpenCardId(card.id);
    openCardIdRef.current = card.id;
    // Clear unread comments for this card when modal opens
    setUnreadComments(prev => {
      const updated = { ...prev };
      delete updated[card.id];
      return updated;
    });
    setModalOpen(true);
  };

  const handleDeleteCard = () => {
    setEditingCard(null);
    setOpenCardId(null);
    openCardIdRef.current = null;
    setModalOpen(false);
    loadCards();
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="spinner" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error-message">Error: {error}</div>
      </div>
    );
  }

  const handleJobChange = (jobId) => {
    setCurrentJob(jobId);
  };

  const handleToggleChat = () => {
    const newChatOpen = !chatOpen;
    setChatOpen(newChatOpen);
    // Clear unread count when opening chat
    if (!chatOpen) {
      setUnreadChatCount(0);
    }
  };

  const handleJobsUpdate = () => {
    loadData();
  };

  return (
    <div className="app">
      <Header
        filters={filters}
        onFilterChange={handleFilterChange}
        labels={labels}
        jobs={jobs}
        currentJob={currentJob}
        onJobChange={handleJobChange}
        onOpenJobsModal={() => setJobsModalOpen(true)}
        onToggleChat={handleToggleChat}
        onOpenSettings={() => setSettingsModalOpen(true)}
        onOpenDashboard={() => setDashboardOpen(true)}
        chatOpen={chatOpen}
        unreadChatCount={unreadChatCount}
      />

      <ActivityPanel
        socket={socketInstance}
        isOpen={activityOpen}
        onToggle={() => setActivityOpen(prev => !prev)}
      />

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="kanban-board">
          {COLUMNS.map((column) => (
            <SortableContext
              key={column.id}
              items={getCardsByColumn(column.id).map((c) => c.id)}
              strategy={horizontalListSortingStrategy}
            >
              <ColumnMemo
                key={column.id === 'done' ? `done-${doneColumnKey}` : column.id}
                column={column}
                cards={getCardsByColumn(column.id)}
                onAddCard={() => handleAddCard(column.id)}
                onEditCard={handleEditCard}
                jobs={jobs}
                unreadComments={unreadComments}
              />
            </SortableContext>
          ))}
        </div>

        <DragOverlay>
          {activeCard ? (
            <Card card={activeCard} isOverlay jobs={jobs} />
          ) : null}
        </DragOverlay>
      </DndContext>

      {modalOpen && (
        <CardModal
          card={editingCard}
          labels={labels}
          jobs={jobs}
          currentJob={currentJob}
          socket={socket}
          onClose={() => {
            setOpenCardId(null);
            openCardIdRef.current = null;
            setModalOpen(false);
            setEditingCard(null);
          }}
          onSave={() => {
            setOpenCardId(null);
            openCardIdRef.current = null;
            setModalOpen(false);
            setEditingCard(null);
            loadCards();
          }}
          onDelete={handleDeleteCard}
        />
      )}

      {jobsModalOpen && (
        <JobsModal
          jobs={jobs}
          onClose={() => setJobsModalOpen(false)}
          onSave={handleJobsUpdate}
        />
      )}

      {chatOpen && (
        <GlobalChat
          socket={socket}
          comments={globalComments}
          onClose={() => setChatOpen(false)}
        />
      )}

      {settingsModalOpen && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setSettingsModalOpen(false)}
          onReset={handleResetSettings}
        />
      )}


      {dashboardOpen && (
        <DashboardModal
          isOpen={dashboardOpen}
          onClose={() => setDashboardOpen(false)}
          jobs={jobs}
        />
      )}
      <ToastContainer />
    </div>
  );
}

export default App;
