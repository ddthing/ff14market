import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from 'recharts';
import { useThemeStore } from '../../store/useThemeStore';

interface ChartProps {
  history: { pricePerUnit: number; timestamp: number }[];
}

export const PriceChart = ({ history }: ChartProps) => {
  const { theme } = useThemeStore();
  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

  if (!history || history.length === 0) {
    return <div className="text-gray-500 dark:text-[#9ea4aa] text-[13px] font-medium text-center py-6 bg-gray-50 dark:bg-[#101112] rounded-xl">최근 판매 기록이 없습니다.</div>;
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
    <div className="h-[100px] w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
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
              backgroundColor: isDark ? 'rgba(38, 40, 43, 0.95)' : 'rgba(255, 255, 255, 0.95)'
            }}
            itemStyle={{ color: isDark ? '#f2f4f6' : '#111827' }}
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
    </div>
  );
};
