import React from 'react';
import { Heart } from 'lucide-react';
import { useFavoriteStore } from '../../store/useFavoriteStore';
import { useToastStore } from '../../store/useToastStore';

interface FavoriteButtonProps {
  itemId: number;
  className?: string;
}

const defaultButtonClassName = '-ml-1.5 inline-flex min-h-11 min-w-11 flex-shrink-0 items-center justify-center rounded-lg p-1.5 transition-[background-color,transform] hover:bg-[var(--app-surface-subtle)] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60';

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({ itemId, className = defaultButtonClassName }) => {
  const { favoriteIds, toggleFavorite } = useFavoriteStore();
  const { addToast } = useToastStore();
  const isFavorite = favoriteIds.includes(itemId);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleFavorite(itemId);
    
    // Provide tactile feedback for mobile
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    if (!isFavorite) {
      addToast("관심 아이템에 추가되었어요!");
    } else {
      addToast("관심 아이템에서 삭제되었어요.");
    }
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={className}
      aria-label={isFavorite ? '관심 아이템에서 제거' : '관심 아이템에 추가'}
      aria-pressed={isFavorite}
    >
      <Heart 
        className={`h-[18px] w-[18px] transition-colors duration-200 ${
          isFavorite 
            ? 'text-red-500 fill-red-500' 
            : 'text-[var(--app-hairline)] hover:text-red-400'
        }`} 
      />
    </button>
  );
};
