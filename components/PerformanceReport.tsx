
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell, PieChart, Pie, Legend } from 'recharts';
import { PerformanceMetric, InterfaceMetric } from '../types';
import { Cpu, Zap, Activity, ShieldAlert, Globe, Clock, AlertTriangle, FileText, ClipboardCheck } from 'lucide-react';

interface PerformanceReportProps {
  metrics: PerformanceMetric[];
  interfaceMetrics: InterfaceMetric[];
  aiReport: string;
  loading: boolean;
}

const PerformanceReport: React.FC<PerformanceReportProps> = ({ metrics, interfaceMetrics, aiReport, loading }) => {
  const latencyData = metrics.filter(m => m.type === 'latency').map(m => ({
    time: m.timestamp.split(' ')[1] || 'N/A',
    value: m.value
  }));

  // 接口耗时排行 Top 5
  const topSlowApis = [...interfaceMetrics]
    .sort((a, b) => b.duration - a.duration)
    .slice(0, 5)
    .map(m => ({
      name: m.url.split('/').pop() || m.url,
      duration: m.duration,
      fullUrl: m.url
    }));

  // 状态码分布
  const statusCounts = interfaceMetrics.reduce((acc: any, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {});

  const statusData = Object.keys(statusCounts).map(status => ({
    name: `Status ${status}`,
    value: statusCounts[status],
    color: status.startsWith('2') ? '#10B981' : (status.startsWith('4') ? '#F59E0B' : '#EF4444')
  }));

  return (
    <div className="flex flex-col h-full overflow-y-auto bg-gray-950 p-6 space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between border-b border-gray-800 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <Globe className="text-blue-500 w-7 h-7" />
            接口性能工程化诊断报告
          </h2>
          <p className="text-gray-500 text-sm mt-1">分析引擎：Gemini 3 Pro + LogSight Heuristics v2.0</p>
        </div>
        <div className="bg-blue-600/10 border border-blue-500/20 px-4 py-2 rounded-lg text-blue-400 text-xs font-mono">
          PRO ANALYSIS ACTIVE
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* KPI Summary Cards */}
        <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
               <span className="text-xs text-gray-500 block">平均请求响应 (Avg)</span>
               <span className="text-2xl font-bold text-emerald-400">
                 {interfaceMetrics.length ? (interfaceMetrics.reduce((a,b)=>a+b.duration,0)/interfaceMetrics.length).toFixed(1) : 0}ms
               </span>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
               <span className="text-xs text-gray-500 block">峰值延迟 (Max)</span>
               <span className="text-2xl font-bold text-amber-500">
                 {interfaceMetrics.length ? Math.max(...interfaceMetrics.map(m=>m.duration)) : 0}ms
               </span>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
               <span className="text-xs text-gray-500 block">请求成功率</span>
               <span className="text-2xl font-bold text-blue-400">
                 {interfaceMetrics.length ? ((interfaceMetrics.filter(m=>m.status.startsWith('2')).length / interfaceMetrics.length)*100).toFixed(1) : 0}%
               </span>
            </div>
            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl">
               <span className="text-xs text-gray-500 block">高延迟请求 (>500ms)</span>
               <span className="text-2xl font-bold text-red-400">
                 {interfaceMetrics.filter(m=>m.duration > 500).length}
               </span>
            </div>
        </div>

        {/* API Latency Top 5 */}
        <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 col-span-1 lg:col-span-2 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-300 mb-6 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            高危接口排行 (Worst 5 Latency)
          </h3>
          <div className="h-60 w-full">
            {topSlowApis.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topSlowApis} layout="vertical">
                  <XAxis type="number" stroke="#4B5563" fontSize={10} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={10} width={120} axisLine={false} tickLine={false} />
                  <Tooltip 
                    cursor={{fill: 'rgba(255,255,255,0.02)'}}
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b', borderRadius: '8px' }}
                  />
                  <Bar dataKey="duration" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={24}>
                     {topSlowApis.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={entry.duration > 1000 ? '#ef4444' : (entry.duration > 500 ? '#f59e0b' : '#3b82f6')} />
                     ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-700 text-xs italic">无采样数据</div>
            )}
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-gray-900 p-5 rounded-xl border border-gray-800 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-300 mb-6 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-emerald-500" />
            HTTP 状态模式分析
          </h3>
          <div className="h-60 w-full">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={statusData} innerRadius={50} outerRadius={80} paddingAngle={8} dataKey="value" stroke="none">
                    {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '8px' }} />
                  <Legend iconSize={10} wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-700 text-xs italic">无状态采样</div>
            )}
          </div>
        </div>
      </div>

      {/* AI Engineering Analysis Report */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-blue-400 flex items-center gap-2 px-1">
          <ClipboardCheck className="w-5 h-5" />
          专业工程化深度评估报告
        </h3>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="bg-blue-600/5 px-5 py-3 border-b border-gray-800 flex items-center justify-between">
            <span className="text-xs font-mono text-blue-400/80 uppercase tracking-widest">Diagnostic Output</span>
            {loading && <div className="flex gap-1.5"><div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce"></div><div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-100"></div><div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-200"></div></div>}
          </div>
          <div className="p-8 min-h-[400px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 space-y-6">
                <div className="relative">
                    <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full"></div>
                    <Activity className="w-12 h-12 text-blue-500 animate-pulse relative" />
                </div>
                <div className="text-center">
                    <p className="text-blue-400 font-mono text-sm animate-pulse">SYSTEM_THINKING: MODELING_INTERFACE_BEHAVIOR...</p>
                    <p className="text-gray-500 text-xs mt-2">Gemini 3 Pro 正在进行多维度关联分析与隐藏风险建模</p>
                </div>
              </div>
            ) : (
              <article className="prose prose-invert prose-blue max-w-none">
                <div className="text-gray-300 font-sans text-base leading-relaxed space-y-4 whitespace-pre-wrap">
                  {aiReport || "请录入包含网络请求数据的日志或上传接口面板截图。分析将覆盖：响应时间分布、长尾效应、雪崩风险及架构优化建议。"}
                </div>
              </article>
            )}
          </div>
          <div className="px-5 py-3 bg-gray-950 border-t border-gray-800 text-[10px] text-gray-600 flex justify-between items-center">
            <span>CONFIDENTIAL - LOGSIGHT PERFORMANCE ADVISORY</span>
            <span>REPORT_GEN_TS: {new Date().toISOString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceReport;
