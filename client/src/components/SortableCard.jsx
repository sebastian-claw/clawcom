import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { memo } from 'react';
import Card from './Card';

const SortableCard = memo(function SortableCard({ card, onEdit, jobs, collapsed, onToggleCollapse, unreadCount }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={isDragging ? 'dragging' : ''}
    >
      <Card
        card={card}
        onEdit={onEdit}
        jobs={jobs}
        collapsed={collapsed}
        onToggleCollapse={onToggleCollapse}
        unreadCount={unreadCount}
      />
    </div>
  );
});

export default SortableCard;
