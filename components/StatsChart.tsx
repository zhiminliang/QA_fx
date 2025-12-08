import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { LogStats } from '../types';

interface StatsChartProps {
  stats: LogStats;
}

const StatsChart: React.FC<StatsChartProps> = ({ stats }) => {
  const data = [
    { name: 'Error', value: stats.error, color: '#EF4444' }, // red-500
    { name: 'Warning', value: stats.warning, color: '#F59E0B' }, // amber-500
    { name: 'Info', value: stats.info, color: '#3B82F6' }, // blue-500
    { name: 'Debug', value: stats.debug, color: '#6B7280' }, // gray-500
  ].filter(item => item.value > 0);

  if (data.length === 0) {
    return <div className="flex items-center justify-center h-48 text-gray-500 text-sm">暂无数据</div>;
  }

  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={40}
            outerRadius={60}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }}
            itemStyle={{ color: '#f3f4f6' }}
          />
          <Legend iconSize={10} verticalAlign="bottom" height={36}/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StatsChart;
