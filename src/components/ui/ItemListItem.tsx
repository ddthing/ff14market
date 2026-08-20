import { memo } from 'react';
import type { NavigateFunction } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import type { EnrichedItem } from '../../hooks/useItemData';
import { fetchKoreaDCData } from '../../api/universalis';
import { FavoriteButton } from './FavoriteButton';
import { getIconUrl } from '../../utils/icon';
import { formatMarketPriceGap, formatSaleVelocity } from '../../utils/marketMetrics';
import { formatFreshness } from '../../utils/time';
// @ts-expect-error react-twemoji lacks types
import _Twemoji from 'react-twemoji';
const Twemoji = (_Twemoji as { default?: React.ElementType }).default || _Twemoji;

type SignalMetric = {
  label: string;
  value: number | null;
  title: string;
  format?: (value: number) => string;
  tone?: 'positive' | 'negative' | 'neutral';
};

export const ItemListItem = memo(({ item, navigate, signal }: {
  item: EnrichedItem;
  navigate: NavigateFunction;
  signal?: SignalMetric;
}) => {
  const queryClient = useQueryClient();
  const metricValue = signal ? signal.value : item.fluctuation;
  const metricTone = signal?.tone ?? (metricValue === null ? 'neutral' : metricValue > 0 ? 'positive' : metricValue < 0 ? 'negative' : 'neutral');

  const handleMouseEnter = () => {
    queryClient.prefetchQuery({
      queryKey: ['searchItem', 'Korea', item.id],
      queryFn: () => fetchKoreaDCData(item.id),
      staleTime: 300000, // 5 minutes
    });
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onClick={() => navigate(`/item/${item.id}`)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          navigate(`/item/${item.id}`);
        }
      }}
      role="link"
      tabIndex={0}
      aria-label={`${item.name} 시세 상세 보기`}
      className="flex animate-fade-in cursor-pointer items-center justify-between border-b border-[var(--app-hairline)] px-4 py-[18px] transition-colors last:border-0 hover:bg-[var(--app-surface-subtle)] sm:px-6"
    >
      <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
        <FavoriteButton itemId={item.id} />
        <div className="h-[42px] w-[42px] flex-shrink-0 rounded-full bg-[var(--app-surface-subtle)] p-[2px]">
          <img 
            src={getIconUrl(item.icon)} 
            alt={item.name} 
            loading="lazy"
            className="h-full w-full rounded-full bg-[var(--app-canvas)] object-cover" 
          />
        </div>
        <div className="flex flex-col truncate">
          <span className="truncate text-[15px] font-bold leading-tight text-[var(--app-ink)] sm:text-[16px]">
            {item.name}
          </span>
          <span className="mt-[2px] flex items-center space-x-2 text-[12px] font-medium text-[var(--app-ink-muted)]">
            <span>{item.category}</span>
            <span className="h-[3px] w-[3px] rounded-full bg-[var(--app-hairline)]"></span>
            <span className="inline-flex items-center text-xs text-[var(--app-ink-muted)]">
               최근 판매속도 {formatSaleVelocity(item.volume)}건/일 {item.volume >= 50 && <Twemoji options={{ folder: 'svg', ext: '.svg' }} className="ml-1 inline-flex">🔥</Twemoji>}
            </span>
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-4 sm:space-x-6 md:space-x-12 ml-2 flex-shrink-0">
        <div className="text-right w-20 sm:w-28 flex flex-col items-end justify-center">
          <span className="mb-[3px] text-[10px] font-medium leading-none text-[var(--app-ink-muted)]">
            최저 매물가
          </span>
          <span className="whitespace-nowrap text-[15px] font-bold leading-tight text-[var(--app-ink)] sm:text-[16px]">
            {item.price > 0 ? `${item.price.toLocaleString()} G` : '데이터 없음'}
          </span>
          {item.price > 0 && item.lastUploadTime !== undefined && (
            <span className="mt-[3px] whitespace-nowrap text-[10px] font-normal leading-none text-[var(--app-ink-muted)]">
              {formatFreshness(item.lastUploadTime)}
            </span>
          )}
        </div>
        <div className="text-right w-16 sm:w-24">
          <span className="mb-[3px] block text-[10px] font-medium leading-none text-[var(--app-ink-muted)]">
            {signal?.label ?? '매물-판매'}
          </span>
          {metricValue === null ? (
            <span className="text-[10px] font-medium text-[var(--app-ink-muted)] sm:text-[12px]" title={signal?.title ?? '현재 평균 매물가와 최근 평균 판매가가 모두 있어야 비교할 수 있습니다.'}>
              비교 불가
            </span>
          ) : (
            <span className={`font-medium text-[12px] sm:text-[15px] whitespace-nowrap ${
              metricTone === 'positive' ? 'text-red-500' :
              metricTone === 'negative' ? 'text-blue-600 dark:text-blue-400' : 'text-[var(--app-ink-muted)]'
            }`}>
              {signal?.format ? signal.format(metricValue) : formatMarketPriceGap(metricValue)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
