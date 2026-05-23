import React from 'react';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { useFavoriteStore } from '../../store/useFavoriteStore';

interface FavoriteButtonProps {
  itemId: number;
}

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({ itemId }) => {
  const { favoriteIds, toggleFavorite } = useFavoriteStore();
  const isFavorite = favoriteIds.includes(itemId);

  return (
    <motion.div
      whileTap={{ scale: 0.8 }}
      animate={isFavorite ? { scale: [1, 1.25, 1] } : { scale: 1 }}
      transition={{ 
        type: "spring", 
        stiffness: 500, 
        damping: 15,
        duration: 0.2
      }}
      onClick={(e) => {
        e.stopPropagation();
        toggleFavorite(itemId);
      }}
      className="p-1.5 -ml-1.5 flex-shrink-0 cursor-pointer"
    >
      <Heart 
        className={`w-[18px] h-[18px] transition-colors duration-200 ${
          isFavorite 
            ? 'text-red-500 fill-red-500' 
            : 'text-gray-300 dark:text-gray-600 hover:text-red-400'
        }`} 
      />
    </motion.div>
  );
};
