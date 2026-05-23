import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Share2, ArrowLeft } from 'lucide-react';
import itemsData from '../data/items.json';
import { fetchKoreaDCData } from '../api/universalis';
import { PriceChart } from '../components/common/PriceChart';
import { getIconUrl } from '../utils/icon';

export const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isCopied, setIsCopied] = useState(false);

  const itemId = id ? parseInt(id) : 0;
  const item = itemsData.find(i => i.id === itemId);

  const { data, isLoading } = useQuery({
    queryKey: ['searchItem', 'Korea', itemId],
    queryFn: () => fetchKoreaDCData(itemId),
    enabled: !!itemId,
    staleTime: 60000,
  });

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">아이템을 찾을 수 없습니다</h2>
        <button 
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors"
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  const itemData = data;
  const globalMinPrice = itemData?.minPrice || 0;
  const netPrice = Math.floor(globalMinPrice * 0.95);
  
  const serverPrices = ['초코보', '모그리', '카벙클', '톤베리', '펜리르'].map(serverName => {
    const serverListings = itemData?.listings?.filter(l => l.worldName === serverName) || [];
    const minPrice = serverListings.length > 0 ? Math.min(...serverListings.map(l => l.pricePerUnit)) : 0;
    return { serverName, minPrice };
  });

  const validPrices = serverPrices.filter(s => s.minPrice > 0).map(s => s.minPrice);
  const absoluteMin = validPrices.length > 0 ? Math.min(...validPrices) : 0;

  const handleShare = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 500);
  };

  return (
    <div className="max-w-md mx-auto py-8 px-2 sm:px-4 animate-fade-in">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center space-x-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100 mb-6 font-medium transition-colors"
      >
        <ArrowLeft className="w-5 h-5" />
        <span>뒤로 가기</span>
      </button>

      <div className="relative w-full bg-white dark:bg-[#26282b] rounded-xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="absolute top-6 right-6 flex items-center space-x-2">
          <button 
            onClick={handleShare} 
            className="flex items-center space-x-1 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-gray-500 dark:text-[#9ea4aa] hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            {isCopied ? (
              <span className="text-[13px] font-bold text-blue-600 dark:text-blue-400">복사됨!</span>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span className="text-[13px] font-bold">공유</span>
              </>
            )}
          </button>
        </div>
        
        <div className="flex flex-col items-center pt-8 pb-8">
          <img 
            src={getIconUrl(item.icon)} 
            alt={item.name} 
            loading="lazy"
            className="w-[100px] h-[100px] rounded-full mb-5 bg-gray-50 dark:bg-[#101112] p-[3px] shadow-sm" 
          />
          <h2 className="text-[24px] font-bold text-gray-900 dark:text-white text-center leading-tight">
            {item.name}
          </h2>
          <p className="text-gray-500 dark:text-[#9ea4aa] mt-2 text-[15px] font-medium">
            {isLoading ? '한국 DC 통합 시세 조회 중...' : `한국 DC 실시간 시세`}
          </p>
        </div>
        
        <div className="bg-gray-50 dark:bg-[#101112] rounded-xl p-5 space-y-5">
          {/* Chart Section */}
          <div className="w-full">
            <div className="flex justify-between items-end mb-2">
              <span className="text-[14px] font-bold text-gray-700 dark:text-gray-300">한국 전체 최저가</span>
              {isLoading ? (
                <div className="w-24 h-6 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
              ) : (
                <div className="text-right">
                  <div className="text-[20px] font-bold text-gray-900 dark:text-white leading-none">
                    {globalMinPrice > 0 ? `${globalMinPrice.toLocaleString()} G` : '매물 없음'}
                  </div>
                  {globalMinPrice > 0 && (
                    <div className="text-[12px] font-medium text-blue-500 dark:text-blue-400 mt-1">
                      (수수료 5% 제외: {netPrice.toLocaleString()} G)
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Daily Sales Announcement */}
            {!isLoading && itemData?.regularSaleVelocity !== undefined && (
              <div className="w-full bg-blue-50/50 dark:bg-blue-900/10 rounded-lg py-2 px-3 mb-3 border border-blue-100 dark:border-blue-800/30 flex items-center justify-between">
                <span className="text-[13px] font-medium text-blue-600 dark:text-blue-400 flex items-center">
                  {Math.round(itemData.regularSaleVelocity) >= 50 ? '🔥 ' : ''}오늘 하루 동안 총 {Math.round(itemData.regularSaleVelocity).toLocaleString()}개의 매물이 거래되었습니다.
                </span>
              </div>
            )}
            
            {isLoading ? (
              <div className="h-[100px] w-full bg-gray-200 dark:bg-gray-800 rounded-lg animate-pulse mt-3" />
            ) : (
              <PriceChart history={itemData?.recentHistory || []} />
            )}
          </div>

          {/* DC Comparison Section */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-800/60">
            <span className="text-[13px] font-bold text-gray-500 dark:text-[#9ea4aa] mb-3 block">서버별 최저가 비교</span>
            <div className="space-y-2">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-full h-8 bg-gray-200 dark:bg-gray-800 rounded animate-pulse" />
                ))
              ) : (
                serverPrices.map(s => {
                  const isLowest = s.minPrice > 0 && s.minPrice === absoluteMin;
                  return (
                    <div key={s.serverName} className={`flex justify-between items-center p-2 rounded-lg transition-colors ${isLowest ? 'bg-blue-50 dark:bg-blue-900/20' : 'hover:bg-gray-100 dark:hover:bg-gray-800/50'}`}>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[14px] font-bold ${isLowest ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {s.serverName}
                        </span>
                        {isLowest && (
                          <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-600 dark:text-blue-300 text-[10px] font-bold rounded-md">
                            최저가
                          </span>
                        )}
                      </div>
                      <span className={`text-[14px] font-medium ${isLowest ? 'text-blue-600 dark:text-blue-400 font-bold' : 'text-gray-900 dark:text-white'}`}>
                        {s.minPrice > 0 ? `${s.minPrice.toLocaleString()} G` : '-'}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
        
        <button 
          onClick={() => navigate('/')}
          className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-[16px] rounded-xl transition-colors text-[17px]"
        >
          장터 둘러보기
        </button>
      </div>
    </div>
  );
};
