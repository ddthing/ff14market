import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useItemData } from '../hooks/useItemData';
import { ItemListItem } from '../components/ui/ItemListItem';
import { SkeletonRow } from '../components/ui/SkeletonRow';
import { AnimatePresence, motion } from 'framer-motion';
// @ts-expect-error react-twemoji lacks types
import _Twemoji from 'react-twemoji';
const Twemoji = (_Twemoji as { default?: React.ElementType }).default || _Twemoji;

type TabType = 'volume' | 'drop' | 'price';

export const HotIssues = () => {
  const { enrichedItems, isLoading } = useItemData();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('volume');

  const sortedItems = useMemo(() => {
    // enrichedItems is already sorted by volume descending by default, but let's be explicit
    const items = [...enrichedItems];
    
    switch (activeTab) {
      case 'volume':
        return items.sort((a, b) => b.volume - a.volume);
      case 'drop':
        // Sort by fluctuation ascending (most negative first)
        return items.sort((a, b) => a.fluctuation - b.fluctuation);
      case 'price':
        // Sort by price descending
        return items.sort((a, b) => b.price - a.price);
      default:
        return items;
    }
  }, [enrichedItems, activeTab]);

  return (
    <div className="space-y-6 animate-fade-in w-full">
      <div className="flex flex-col space-y-4">
        <h1 className="text-[22px] font-bold text-gray-900 dark:text-white px-2">
          실시간 랭킹
        </h1>
        
        {/* Tabs */}
        <div className="flex space-x-2 px-2 overflow-x-auto scrollbar-hide pb-2">
          <TabButton 
            active={activeTab === 'volume'} 
            onClick={() => setActiveTab('volume')}
            icon="📈"
            label="거래량 급증"
          />
          <TabButton 
            active={activeTab === 'drop'} 
            onClick={() => setActiveTab('drop')}
            icon="📉"
            label="가격 급락"
          />
          <TabButton 
            active={activeTab === 'price'} 
            onClick={() => setActiveTab('price')}
            icon="💎"
            label="최고가 품목"
          />
        </div>
      </div>

      <div className="flex flex-col space-y-6">
        {isLoading ? (
          <div className="bg-white dark:bg-[#26282b] rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none border border-transparent dark:border-gray-800 overflow-hidden relative">
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/70 dark:bg-[#26282b]/70 backdrop-blur-sm rounded-xl">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mb-4"></div>
              <Twemoji options={{ folder: 'svg', ext: '.svg' }}>
                <p className="text-[15px] font-bold text-gray-800 dark:text-gray-200 mb-1">실시간 데이터를 집계 중입니다... 📊</p>
              </Twemoji>
            </div>
            <div className="opacity-40">
              {Array.from({ length: 10 }).map((_, idx) => <SkeletonRow key={`skel-${idx}`} />)}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-[#26282b] rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none border border-transparent dark:border-gray-800 overflow-hidden">
            <AnimatePresence mode="popLayout">
              {sortedItems.slice(0, 50).map((item, index) => (
                <motion.div
                  key={`${activeTab}-${item.id}`}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: index * 0.02 }}
                >
                  <ItemListItem 
                    item={item} 
                    navigate={navigate} 
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: string, label: string }) => (
  <button
    onClick={onClick}
    className={`flex-shrink-0 px-4 py-2 rounded-full text-[14px] font-bold transition-all duration-200 flex items-center space-x-1.5
      ${active 
        ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-md' 
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-[#26282b] dark:text-gray-300 dark:hover:bg-gray-800'
      }
    `}
  >
    <Twemoji options={{ folder: 'svg', ext: '.svg' }} className="inline-flex w-4 h-4">
      {icon}
    </Twemoji>
    <span>{label}</span>
  </button>
);
