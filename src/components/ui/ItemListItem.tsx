import { memo, useEffect, useRef } from 'react';
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
  const prefetchTimerRef = useRef<number | null>(null);
  const metricValue = signal ? signal.value : item.fluctuation;
  const metricTone = signal?.tone ?? (metricValue === null ? 'neutral' : metricValue > 0 ? 'positive' : metricValue < 0 ? 'negative' : 'neutral');

  const cancelPrefetch = () => {
    if (prefetchTimerRef.current === null) return;
    window.clearTimeout(prefetchTimerRef.current);
    prefetchTimerRef.current = null;
  };

  const schedulePrefetch = () => {
    if (prefetchTimerRef.current !== null) return;

    // Moving across a dense list should not start one full detail request per row.
    prefetchTimerRef.current = window.setTimeout(() => {
      prefetchTimerRef.current = null;
      queryClient.prefetchQuery({
        queryKey: ['searchItem', 'Korea', item.id],
        queryFn: ({ signal: requestSignal }) => fetchKoreaDCData(item.id, requestSignal),
        staleTime: 300000, // 5 minutes
      });
    }, 120);
  };

  useEffect(() => () => {
    if (prefetchTimerRef.current !== null) {
      window.clearTimeout(prefetchTimerRef.current);
    }
  }, []);

  const handleMouseEnter = () => {
    schedulePrefetch();
  };

  const handleMouseLeave = () => {
    cancelPrefetch();
  };

  const handleFocus = () => {
    schedulePrefetch();
  };

  const handleBlur = () => {
    cancelPrefetch();
  };

  const handleClick = () => {
    cancelPrefetch();
    navigate(`/item/${item.id}`);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      cancelPrefetch();
      navigate(`/item/${item.id}`);
    }
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="link"
      tabIndex={0}
      aria-label={`${item.name} 시세 상세 보기`}
      className="flex animate-fade-in cursor-pointer items-center justify-between border-b border-[var(--app-hairline)] px-3 py-4 transition-colors last:border-0 hover:bg-[var(--app-surface-subtle)] sm:px-6 sm:py-[18px]"
    >
      <div className="flex min-w-0 flex-1 items-center space-x-2 sm:space-x-4">
        <div className="hidden sm:block">
          <FavoriteButton itemId={item.id} />
        </div>
        <div className="relative h-10 w-10 flex-shrink-0 rounded-full bg-[var(--app-surface-subtle)] p-[2px] sm:h-[42px] sm:w-[42px]">
          <img 
            src={getIconUrl(item.icon)} 
            alt={item.name} 
            loading="lazy"
            className="h-full w-full rounded-full bg-[var(--app-canvas)] object-cover" 
          />
          <div className="absolute -bottom-1 -right-2 z-10 sm:hidden">
            <FavoriteButton
              itemId={item.id}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full bg-[var(--app-surface)]/95 p-1 shadow-sm transition-[background-color,transform] hover:bg-[var(--app-surface-subtle)] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
            />
          </div>
        </div>
        <div className="min-w-0 flex-1 truncate">
          <span className="block truncate text-[15px] font-bold leading-tight text-[var(--app-ink)] sm:text-[16px]">
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

      <div className="ml-1 flex flex-shrink-0 items-center space-x-2 sm:ml-2 sm:space-x-6 md:space-x-12">
        <div className="flex w-16 flex-col items-end justify-center text-right sm:w-28">
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
        <div className="w-14 text-right sm:w-24">
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
