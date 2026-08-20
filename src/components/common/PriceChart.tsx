import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { useEffect, useRef, useState } from 'react';
import { useThemeStore } from '../../store/useThemeStore';

interface ChartProps {
  history: { pricePerUnit: number; timestamp: number }[];
}

export const PriceChart = ({ history }: ChartProps) => {
  const { theme } = useThemeStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateWidth = () => {
      setContainerWidth(container.getBoundingClientRect().width);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  if (!history || history.length === 0) {
    return <div className="rounded-xl bg-[var(--app-surface-subtle)] py-6 text-center text-[13px] font-medium text-[var(--app-ink-muted)]">최근 판매 기록이 없습니다.</div>;
  }

  // Sort by timestamp ascending, take last 7
  const sortedHistory = [...history]
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-7);
  
  const firstPrice = sortedHistory[0].pricePerUnit;
  const lastPrice = sortedHistory[sortedHistory.length - 1].pricePerUnit;
  const isUp = lastPrice >= firstPrice;
  const strokeColor = isUp ? '#ef4444' : '#3b82f6';

  return (
    <div ref={containerRef} className="h-[100px] w-full pt-2">
      {containerWidth > 0 ? (
        <ResponsiveContainer width={containerWidth} height={100} minWidth={0} minHeight={100}>
          <LineChart data={sortedHistory}>
            <YAxis domain={['auto', 'auto']} hide />
            <Tooltip 
              formatter={(value: unknown) => [`${Number(value).toLocaleString()} G`, '판매가']}
              labelFormatter={() => ''}
              contentStyle={{ 
                borderRadius: '10px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', 
                fontSize: '14px', 
                fontWeight: 'bold',
                backgroundColor: isDark ? 'rgba(52, 52, 52, 0.95)' : 'rgba(255, 255, 255, 0.95)'
              }}
              itemStyle={{ color: isDark ? '#fafafa' : '#171717' }}
            />
            <Line 
              type="monotone" 
              dataKey="pricePerUnit" 
              stroke={strokeColor} 
              strokeWidth={3.5}
              dot={false}
              activeDot={{ r: 6, fill: strokeColor, strokeWidth: 0 }}
              isAnimationActive={true}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : null}
    </div>
  );
};
