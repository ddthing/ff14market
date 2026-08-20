import { memo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
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

export const ItemListItem = memo(({ item, signal }: {
  item: EnrichedItem;
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

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="flex animate-fade-in items-center border-b border-[var(--app-hairline)] px-3 py-4 transition-colors last:border-0 hover:bg-[var(--app-surface-subtle)] sm:px-6 sm:py-[18px]"
    >
      <div className="hidden shrink-0 sm:block">
        <FavoriteButton itemId={item.id} />
      </div>

      <Link
        to={`/item/${item.id}`}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={cancelPrefetch}
        aria-label={`${item.name} 시세 상세 보기`}
        className="flex min-w-0 flex-1 items-start gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-accent)]/60 focus-visible:ring-inset sm:items-center sm:gap-4"
      >
        <div className="mt-0.5 h-10 w-10 shrink-0 rounded-full bg-[var(--app-surface-subtle)] p-[2px] sm:mt-0 sm:h-[42px] sm:w-[42px]">
          <img
            src={getIconUrl(item.icon)}
            alt={item.name}
            loading="lazy"
            className="h-full w-full rounded-full bg-[var(--app-canvas)] object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="min-w-0 sm:flex sm:items-center">
            <div className="min-w-0 overflow-hidden sm:flex-1">
              <span className="block truncate text-[15px] font-bold leading-tight text-[var(--app-ink)] sm:text-[16px]">
                {item.name}
              </span>
              <span className="mt-[2px] flex items-center space-x-2 truncate text-[12px] font-medium text-[var(--app-ink-muted)]">
                <span className="shrink-0">{item.category}</span>
                <span className="h-[3px] w-[3px] shrink-0 rounded-full bg-[var(--app-hairline)]"></span>
                <span className="inline-flex min-w-0 items-center truncate text-xs text-[var(--app-ink-muted)]">
                  최근 판매속도 {formatSaleVelocity(item.volume)}건/일 {item.volume >= 50 && <Twemoji options={{ folder: 'svg', ext: '.svg' }} className="ml-1 inline-flex">🔥</Twemoji>}
                </span>
              </span>
            </div>

            <div className="mt-1 flex shrink-0 items-center justify-end gap-2 sm:ml-2 sm:mt-0 sm:gap-6 md:gap-12">
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
                  <span className={`whitespace-nowrap text-[12px] font-medium sm:text-[15px] ${
                    metricTone === 'positive' ? 'text-red-500' :
                    metricTone === 'negative' ? 'text-blue-600 dark:text-blue-400' : 'text-[var(--app-ink-muted)]'
                  }`}>
                    {signal?.format ? signal.format(metricValue) : formatMarketPriceGap(metricValue)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </Link>

      <div className="ml-1 shrink-0 sm:hidden">
        <FavoriteButton
          itemId={item.id}
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md transition-[background-color,transform] hover:bg-[var(--app-surface-subtle)] active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/60"
        />
      </div>
    </div>
  );
});
