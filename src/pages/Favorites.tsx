import { useFavoriteStore } from '../store/useFavoriteStore';
import { useItemData } from '../hooks/useItemData';
import { Heart } from 'lucide-react';
import { Link } from 'react-router-dom';
import { FavoriteButton } from '../components/ui/FavoriteButton';
import { SkeletonRow } from '../components/ui/SkeletonRow';
import { formatFreshness } from '../utils/time';

export const Favorites = () => {
  const { favoriteIds } = useFavoriteStore();
  const { enrichedItems, isLoading } = useItemData();
  
  const favoriteItemsList = enrichedItems.filter(item => favoriteIds.includes(item.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-2 mb-2">
        <h2 className="text-[1.3rem] font-bold tracking-tight">내 관심템</h2>
        <span className="text-sm font-medium text-gray-500 dark:text-[#9ea4aa]">
          {isLoading ? '-' : favoriteItemsList.length}개
        </span>
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-[#26282b] rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none border border-transparent dark:border-gray-800 overflow-hidden">
          {Array.from({ length: 3 }).map((_, idx) => <SkeletonRow key={`fav-skel-${idx}`} />)}
        </div>
      ) : favoriteItemsList.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-[50vh] text-gray-500 dark:text-[#9ea4aa] bg-white dark:bg-[#26282b] rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none border border-transparent dark:border-gray-800">
          <Heart className="w-12 h-12 mb-4 text-gray-300 dark:text-gray-600" />
          <p className="font-medium text-gray-900 dark:text-white">관심 아이템이 없습니다.</p>
          <p className="mt-2 text-[14px]">시세 목록에서 하트(♡)를 눌러 아이템을 추가해보세요.</p>
          <Link to="/" className="mt-6 px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors">
            홈으로 가기
          </Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#26282b] rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none border border-transparent dark:border-gray-800 overflow-hidden">
          {favoriteItemsList.map((item, idx) => {
            return (
              <div 
                key={`fav-${item.id}`} 
                className={`flex items-center justify-between py-[18px] px-4 sm:px-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-[#252836] transition-colors ${idx !== favoriteItemsList.length - 1 ? 'border-b border-gray-100 dark:border-gray-800/60' : ''}`}
              >
                {/* 좌측: 하트 + 아이콘 + 아이템명 */}
                <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                  <FavoriteButton itemId={item.id} />
                  <img 
                    src={item.icon} 
                    alt={item.name} 
                    className="w-[42px] h-[42px] rounded-full object-cover bg-gray-50 dark:bg-[#101112] p-[2px] flex-shrink-0" 
                  />
                  <span className="font-bold text-[15px] sm:text-[16px] leading-tight text-gray-900 dark:text-white truncate ml-1">
                    {item.name}
                  </span>
                </div>

                {/* 중앙 및 우측 (가격, 등락률, 거래량) */}
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
                  <div className="text-right w-16 sm:w-20">
                    <span className={`font-medium text-[14px] sm:text-[15px] whitespace-nowrap ${
                      item.fluctuation > 0 ? 'text-red-500' : 
                      item.fluctuation < 0 ? 'text-blue-500' : 'text-gray-500'
                    }`}>
                      {item.fluctuation > 0 ? '+' : ''}{item.fluctuation.toFixed(1)}%
                    </span>
                  </div>
                  <div className="text-right w-12 sm:w-16">
                    <span className="text-[13px] sm:text-[14px] font-normal text-gray-500 dark:text-[#9ea4aa] whitespace-nowrap">
                      {item.volume.toLocaleString()}건
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
