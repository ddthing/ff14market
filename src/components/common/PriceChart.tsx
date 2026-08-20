import { useState } from 'react';

interface ChartProps {
  history: { pricePerUnit: number; timestamp: number }[];
}

const WIDTH = 320;
const HEIGHT = 112;
const PADDING_X = 12;
const PADDING_Y = 12;

const formatPrice = (price: number) => `${Math.round(price).toLocaleString()} G`;

const formatSaleTime = (timestamp: number) => {
  const milliseconds = timestamp > 10_000_000_000 ? timestamp : timestamp * 1000;
  return new Intl.DateTimeFormat('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(milliseconds));
};

export const PriceChart = ({ history }: ChartProps) => {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const sortedHistory = [...history]
    .filter(({ pricePerUnit, timestamp }) => Number.isFinite(pricePerUnit) && pricePerUnit > 0 && Number.isFinite(timestamp))
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-7);

  if (sortedHistory.length === 0) {
    return <div className="rounded-xl bg-[var(--app-surface-subtle)] py-6 text-center text-[13px] font-medium text-[var(--app-ink-muted)]">최근 판매 기록이 없습니다.</div>;
  }

  const prices = sortedHistory.map(({ pricePerUnit }) => pricePerUnit);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = Math.max(maxPrice - minPrice, maxPrice * 0.05, 1);
  const chartMin = Math.max(0, minPrice - priceRange * 0.15);
  const chartMax = maxPrice + priceRange * 0.15;
  const firstPrice = prices[0];
  const lastPrice = prices[prices.length - 1];
  const isUp = lastPrice >= firstPrice;
  const strokeColor = isUp ? '#ef4444' : '#3b82f6';
  const plotWidth = WIDTH - PADDING_X * 2;
  const plotHeight = HEIGHT - PADDING_Y * 2;
  const points = sortedHistory.map((entry, index) => ({
    ...entry,
    x: sortedHistory.length === 1
      ? WIDTH / 2
      : PADDING_X + (index / (sortedHistory.length - 1)) * plotWidth,
    y: PADDING_Y + ((chartMax - entry.pricePerUnit) / (chartMax - chartMin)) * plotHeight,
  }));
  const activePoint = activeIndex === null ? null : points[activeIndex];

  return (
    <div className="w-full" aria-label="최근 판매 가격 흐름">
      <svg
        className="h-[112px] w-full overflow-visible"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="최근 7건 판매 가격 차트"
      >
        <title>최근 7건 판매 가격 차트</title>
        {[0, 0.5, 1].map((ratio) => {
          const y = PADDING_Y + ratio * plotHeight;
          return <line key={ratio} x1={PADDING_X} x2={WIDTH - PADDING_X} y1={y} y2={y} stroke="var(--app-hairline)" strokeWidth="1" strokeDasharray="2 4" />;
        })}
        <polyline
          fill="none"
          points={points.map(({ x, y }) => `${x},${y}`).join(' ')}
          stroke={strokeColor}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        {points.map((point, index) => {
          const isActive = activeIndex === index;
          return (
            <g key={`${point.timestamp}-${index}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r="11"
                fill="transparent"
                tabIndex={0}
                role="button"
                aria-label={`${formatSaleTime(point.timestamp)} ${formatPrice(point.pricePerUnit)}`}
                onPointerEnter={() => setActiveIndex(index)}
                onPointerLeave={() => setActiveIndex(null)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex(null)}
                onClick={() => setActiveIndex(isActive ? null : index)}
              >
                <title>{`${formatSaleTime(point.timestamp)} · ${formatPrice(point.pricePerUnit)}`}</title>
              </circle>
              <circle cx={point.x} cy={point.y} r={isActive ? 5 : 3.5} fill={isActive ? strokeColor : 'var(--app-surface)'} stroke={strokeColor} strokeWidth="2" pointerEvents="none" />
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex min-h-5 items-center justify-between text-[10px] font-medium text-[var(--app-ink-muted)]">
        <span>최저 {formatPrice(minPrice)}</span>
        <span aria-live="polite">{activePoint ? `${formatSaleTime(activePoint.timestamp)} · ${formatPrice(activePoint.pricePerUnit)}` : `최고 ${formatPrice(maxPrice)}`}</span>
      </div>
    </div>
  );
};
