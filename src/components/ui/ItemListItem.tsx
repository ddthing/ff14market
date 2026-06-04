import { memo } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import type { EnrichedItem } from '../../hooks/useItemData';
import { fetchKoreaDCData } from '../../api/universalis';
import { FavoriteButton } from './FavoriteButton';
import { getIconUrl } from '../../utils/icon';
import { formatFreshness } from '../../utils/time';
// @ts-expect-error react-twemoji lacks types
import _Twemoji from 'react-twemoji';
const Twemoji = (_Twemoji as { default?: React.ElementType }).default || _Twemoji;

export const ItemListItem = memo(({ item, navigate }: { item: EnrichedItem, navigate: NavigateFunction }) => {
  const queryClient = useQueryClient();

  const handleMouseEnter = () => {
    queryClient.prefetchQuery({
      queryKey: ['searchItem', 'Korea', item.id],
      queryFn: () => fetchKoreaDCData(item.id),
      staleTime: 300000, // 5 minutes
    });
  };

  return (
    <motion.div 
      layout
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2 }}
      onMouseEnter={handleMouseEnter}
      onClick={() => navigate(`/item/${item.id}`)}
      className="flex items-center justify-between py-[18px] px-4 sm:px-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#252836] transition-colors border-b border-gray-100 dark:border-gray-800/60 last:border-0"
    >
      <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
        <FavoriteButton itemId={item.id} />
        <div className="w-[42px] h-[42px] rounded-full bg-gray-100 dark:bg-gray-800 p-[2px] flex-shrink-0">
          <img 
            src={getIconUrl(item.icon)} 
            alt={item.name} 
            loading="lazy"
            className="w-full h-full rounded-full object-cover bg-gray-50 dark:bg-[#101112]" 
          />
        </div>
        <div className="flex flex-col truncate">
          <span className="font-bold text-[15px] sm:text-[16px] leading-tight text-gray-900 dark:text-white truncate">
            {item.name}
          </span>
          <span className="text-[12px] font-medium text-gray-400 dark:text-[#9ea4aa] mt-[2px] flex items-center space-x-2">
            <span>{item.category}</span>
            <span className="w-[3px] h-[3px] rounded-full bg-gray-300 dark:bg-gray-600"></span>
            <span className="text-gray-400 text-xs inline-flex items-center">
              일일 판매 {item.volume.toLocaleString()}건 {item.volume >= 50 && <Twemoji options={{ folder: 'svg', ext: '.svg' }} className="ml-1 inline-flex">🔥</Twemoji>}
            </span>
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4 sm:space-x-6 md:space-x-12 ml-2 flex-shrink-0">
        <div className="text-right w-20 sm:w-28 flex flex-col items-end justify-center">
          <span className="font-bold text-[15px] sm:text-[16px] text-gray-900 dark:text-white whitespace-nowrap leading-tight">
            {item.price > 0 ? `${item.price.toLocaleString()} G` : '데이터 없음'}
          </span>
          {item.price > 0 && item.lastUploadTime !== undefined && (
            <span className="text-[10px] font-normal text-gray-400 dark:text-[#9ea4aa] mt-[3px] leading-none whitespace-nowrap">
              {formatFreshness(item.lastUploadTime)}
            </span>
          )}
        </div>
        <div className="text-right w-16 sm:w-20 hidden sm:block">
          <span className={`font-medium text-[14px] sm:text-[15px] whitespace-nowrap ${
            item.fluctuation > 0 ? 'text-red-500' : 
            item.fluctuation < 0 ? 'text-blue-500' : 'text-gray-500'
          }`}>
            {item.fluctuation > 0 ? '+' : ''}{item.fluctuation.toFixed(1)}%
          </span>
        </div>
      </div>
    </motion.div>
  );
});
