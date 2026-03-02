import { useState, useEffect, memo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import SortableCard from './SortableCard';

const Column = memo(function Column({ column, cards, onAddCard, onEditCard, jobs, unreadComments, onCardExpand }) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  });

  const isDoneColumn = column.id === 'done';

  // Track collapsed state for each card in the Done column
  const [collapsedCards, setCollapsedCards] = useState(() => {
    const initial = {};
    cards.forEach(card => {
      initial[card.id] = true; // Default to collapsed
    });
    return initial;
  });

  // Update collapsedCards when cards change (e.g., new card added)
  useEffect(() => {
    setCollapsedCards(prev => {
      const updated = { ...prev };
      cards.forEach(card => {
        if (!(card.id in updated)) {
          updated[card.id] = true; // New cards default to collapsed
        }
      });
      return updated;
    });
  }, [cards]);

  const handleToggleCollapse = (cardId) => {
    setCollapsedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  // Expand all cards when dragged out of Done column
  const handleCardExpand = (cardId) => {
    if (isDoneColumn && collapsedCards[cardId]) {
      handleToggleCollapse(cardId);
    }
  };

  return (
    <div className="column">
      <div className="column-header">
        <div className="column-title">
          <h2>{column.title}</h2>
          <span className="column-count">{cards.length}</span>
        </div>
        <button className="column-add-btn" onClick={() => onAddCard()}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            width="16"
            height="16"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4.5v15m7.5-7.5h-15"
            />
          </svg>
        </button>
      </div>

      <div
        ref={setNodeRef}
        className={`column-cards ${isOver ? 'drag-over' : ''}`}
      >
        {cards.length === 0 ? (
          <div className="empty-column">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"
              />
            </svg>
            <p>No tasks yet</p>
          </div>
        ) : (
          cards.map((card) => (
            <SortableCard
              key={card.id}
              card={card}
              onEdit={() => onEditCard(card)}
              jobs={jobs}
              collapsed={isDoneColumn && collapsedCards[card.id]}
              onToggleCollapse={isDoneColumn ? () => handleToggleCollapse(card.id) : undefined}
              unreadCount={unreadComments[card.id] || 0}
            />
          ))
        )}
      </div>
    </div>
  );
});

export default Column;
