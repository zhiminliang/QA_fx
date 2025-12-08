import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Upload, FileText, Download, Play, Search, AlertTriangle, Info, Bug, XCircle, BarChart2, Cpu, MessageSquare, Menu } from 'lucide-react';
import { LogEntry, LogLevel, LogSource } from './types';
import { parseLogFile, exportLogs } from './services/logUtils';
import { analyzeLogEntry, generateSummary } from './services/geminiService';
import StatsChart from './components/StatsChart';

// --- Helper Components ---

const LevelBadge: React.FC<{ level: LogLevel }> = ({ level }) => {
  const colors = {
    [LogLevel.ERROR]: 'bg-red-500/10 text-red-500 border-red-500/20',
    [LogLevel.WARNING]: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    [LogLevel.INFO]: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    [LogLevel.DEBUG]: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    [LogLevel.UNKNOWN]: 'bg-gray-700/10 text-gray-500 border-gray-700/20',
  };
  
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded border ${colors[level] || colors[LogLevel.UNKNOWN]}`}>
      {level}
    </span>
  );
};

const SourceBadge: React.FC<{ source: LogSource }> = ({ source }) => {
   const icons = {
     [LogSource.ANDROID]: <Bug className="w-3 h-3 mr-1" />,
     [LogSource.IOS]: <Cpu className="w-3 h-3 mr-1" />,
     [LogSource.WECHAT]: <MessageSquare className="w-3 h-3 mr-1" />,
     [LogSource.UNKNOWN]: <Info className="w-3 h-3 mr-1" />,
   };

   const colors = {
    [LogSource.ANDROID]: 'text-green-400',
    [LogSource.IOS]: 'text-gray-200',
    [LogSource.WECHAT]: 'text-emerald-400',
    [LogSource.UNKNOWN]: 'text-gray-500',
   };

   return (
     <span className={`flex items-center text-xs font-semibold ${colors[source] || colors[LogSource.UNKNOWN]}`}>
       {icons[source] || icons[LogSource.UNKNOWN]}
       {source}
     </span>
   );
};

// --- Main Component ---

function App() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filename, setFilename] = useState<string>('');
  
  // Filtering State
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<LogSource | 'ALL'>('ALL');
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'ALL'>('ALL');

  // AI & Detail View State
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryText, setSummaryText] = useState('');

  // Refs for auto-scroll or file input
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Stats Calculation
  const stats = useMemo(() => {
    return logs.reduce((acc, log) => {
      acc.total++;
      if (log.level === LogLevel.ERROR) acc.error++;
      if (log.level === LogLevel.WARNING) acc.warning++;
      if (log.level === LogLevel.INFO) acc.info++;
      if (log.level === LogLevel.DEBUG) acc.debug++;
      return acc;
    }, { total: 0, error: 0, warning: 0, info: 0, debug: 0 });
  }, [logs]);

  // Filter Logic
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            log.raw.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSource = filterSource === 'ALL' || log.source === filterSource;
      const matchesLevel = filterLevel === 'ALL' || log.level === filterLevel;
      return matchesSearch && matchesSource && matchesLevel;
    });
  }, [logs, searchTerm, filterSource, filterLevel]);

  // Handlers
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setFilename(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const parsedLogs = parseLogFile(content, file.name);
      setLogs(parsedLogs);
      setLoading(false);
      // Reset views
      setSelectedLog(null);
      setAiAnalysis('');
      setShowSummary(false);
    };
    reader.readAsText(file);
  };

  const handleExport = (format: 'txt' | 'csv' | 'json') => {
    if (filteredLogs.length === 0) return;
    exportLogs(filteredLogs, format);
  };

  const handleAnalyzeLog = async (entry: LogEntry) => {
    setAnalyzing(true);
    setAiAnalysis('');
    
    // Find context (previous 3 logs)
    const index = logs.findIndex(l => l.id === entry.id);
    const context = index >= 3 ? logs.slice(index - 3, index) : [];
    
    const result = await analyzeLogEntry(entry, context);
    setAiAnalysis(result);
    setAnalyzing(false);
  };

  const handleGenerateSummary = async () => {
    if (logs.length === 0) return;
    setAnalyzing(true);
    setShowSummary(true);
    const result = await generateSummary(logs);
    setSummaryText(result);
    setAnalyzing(false);
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800 flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <FileText className="text-white w-5 h-5" />
          </div>
          <h1 className="text-lg font-bold tracking-tight">LogSight</h1>
        </div>

        {/* Upload Section */}
        <div className="p-4">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".txt,.log,.json"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors font-medium text-sm"
          >
            <Upload className="w-4 h-4" />
            导入日志文件
          </button>
          {filename && (
            <div className="mt-2 text-xs text-gray-500 break-all px-1">
              当前文件: {filename}
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="px-4 py-2 flex-1 overflow-y-auto">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">日志概览</h3>
          <StatsChart stats={stats} />
          
          <div className="grid grid-cols-2 gap-2 mt-4 text-sm">
             <div className="bg-gray-800 p-2 rounded border border-gray-700">
                <div className="text-gray-500 text-xs">Total</div>
                <div className="font-mono font-bold">{stats.total}</div>
             </div>
             <div className="bg-red-900/20 p-2 rounded border border-red-900/30">
                <div className="text-red-400 text-xs">Errors</div>
                <div className="font-mono font-bold text-red-400">{stats.error}</div>
             </div>
          </div>
          
          <div className="mt-6">
             <button 
               onClick={handleGenerateSummary}
               className="w-full border border-gray-700 hover:bg-gray-800 text-gray-300 text-xs py-2 px-3 rounded flex items-center justify-center gap-2 transition-colors"
             >
               <BarChart2 className="w-3 h-3" />
               生成 AI 诊断简报
             </button>
          </div>
        </div>

        <div className="p-4 border-t border-gray-800 text-xs text-gray-600">
          v1.0.0 | React + Gemini
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        
        {/* Toolbar */}
        <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shadow-sm z-10">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                type="text" 
                placeholder="搜索日志内容 (Regex)..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-950 border border-gray-700 text-gray-200 pl-9 pr-3 py-1.5 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <select 
              value={filterSource} 
              onChange={(e) => setFilterSource(e.target.value as LogSource | 'ALL')}
              className="bg-gray-950 border border-gray-700 text-gray-300 py-1.5 px-3 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">所有来源</option>
              <option value={LogSource.IOS}>iOS</option>
              <option value={LogSource.ANDROID}>Android</option>
              <option value={LogSource.WECHAT}>小程序</option>
            </select>

            <select 
              value={filterLevel} 
              onChange={(e) => setFilterLevel(e.target.value as LogLevel | 'ALL')}
              className="bg-gray-950 border border-gray-700 text-gray-300 py-1.5 px-3 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">所有级别</option>
              <option value={LogLevel.ERROR}>Error</option>
              <option value={LogLevel.WARNING}>Warning</option>
              <option value={LogLevel.INFO}>Info</option>
              <option value={LogLevel.DEBUG}>Debug</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="dropdown relative group">
              <button className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 px-3 py-1.5 rounded-md text-sm transition-colors">
                <Download className="w-4 h-4" />
                导出
              </button>
              <div className="absolute right-0 mt-1 w-32 bg-gray-800 border border-gray-700 rounded-md shadow-lg opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-all duration-100 z-50">
                <button onClick={() => handleExport('txt')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">TXT 文本</button>
                <button onClick={() => handleExport('csv')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">CSV 表格</button>
                <button onClick={() => handleExport('json')} className="block w-full text-left px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">JSON 数据</button>
              </div>
            </div>
          </div>
        </header>

        {/* Log Viewer & Detail Split */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Log List */}
          <div className={`flex-1 flex flex-col border-r border-gray-800 bg-gray-950 ${selectedLog ? 'w-2/3' : 'w-full'} transition-all duration-300`}>
             <div className="flex items-center justify-between px-4 py-2 bg-gray-900/50 border-b border-gray-800 text-xs text-gray-500">
               <span>显示 {filteredLogs.length} 条日志</span>
               <span>Time / Level / Message</span>
             </div>
             
             <div ref={logsContainerRef} className="flex-1 overflow-auto p-0 font-mono text-sm relative">
               {loading && (
                 <div className="absolute inset-0 flex items-center justify-center bg-gray-950/80 z-20">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                 </div>
               )}
               
               {filteredLogs.length === 0 && !loading && (
                 <div className="flex flex-col items-center justify-center h-full text-gray-500">
                   <Menu className="w-12 h-12 mb-2 opacity-20" />
                   <p>暂无日志显示</p>
                   <p className="text-xs opacity-60">请导入文件或调整过滤条件</p>
                 </div>
               )}

               <table className="w-full text-left border-collapse">
                 <tbody>
                   {filteredLogs.map((log) => (
                     <tr 
                      key={log.id} 
                      onClick={() => { setSelectedLog(log); setAiAnalysis(''); setShowSummary(false); }}
                      className={`
                        border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer transition-colors
                        ${selectedLog?.id === log.id ? 'bg-blue-900/20' : ''}
                        ${log.level === LogLevel.ERROR ? 'bg-red-950/10' : ''}
                      `}
                    >
                       <td className="py-1.5 px-3 whitespace-nowrap text-gray-500 w-32 align-top text-xs">{log.timestamp.split(' ')[1] || log.timestamp}</td>
                       <td className="py-1.5 px-2 w-20 align-top">
                          <LevelBadge level={log.level} />
                       </td>
                       <td className="py-1.5 px-3 text-gray-300 break-all leading-snug">
                         {/* Highlight potential component tags */}
                         {log.source !== LogSource.UNKNOWN && (
                           <span className="inline-block mr-2 opacity-50 text-xs">[{log.source}]</span>
                         )}
                         {log.message}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>

          {/* Details / AI Panel */}
          {selectedLog && (
            <div className="w-[450px] bg-gray-900 flex flex-col border-l border-gray-800 shadow-2xl z-20">
              <div className="p-4 border-b border-gray-800 flex justify-between items-start bg-gray-850">
                <div>
                   <h2 className="text-sm font-bold text-gray-100">日志详情</h2>
                   <div className="text-xs text-gray-500 mt-1 font-mono">{selectedLog.id}</div>
                </div>
                <button onClick={() => setSelectedLog(null)} className="text-gray-500 hover:text-white">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Basic Info */}
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                     <div>
                       <label className="text-xs text-gray-500 uppercase">时间戳</label>
                       <div className="text-sm font-mono text-gray-300">{selectedLog.timestamp}</div>
                     </div>
                     <div>
                       <label className="text-xs text-gray-500 uppercase">来源</label>
                       <div className="mt-1"><SourceBadge source={selectedLog.source} /></div>
                     </div>
                  </div>
                  
                  <div>
                    <label className="text-xs text-gray-500 uppercase">原始消息</label>
                    <div className="mt-1 p-3 bg-gray-950 rounded border border-gray-800 font-mono text-xs text-gray-300 whitespace-pre-wrap break-all max-h-60 overflow-y-auto">
                      {selectedLog.raw}
                    </div>
                  </div>
                </div>

                {/* AI Action Area */}
                <div className="pt-4 border-t border-gray-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold flex items-center gap-2 text-purple-400">
                      <Cpu className="w-4 h-4" />
                      Gemini 智能分析
                    </h3>
                  </div>
                  
                  {analyzing ? (
                     <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-700 flex flex-col items-center justify-center gap-3">
                       <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-500"></div>
                       <span className="text-xs text-purple-300">AI 正在思考中...</span>
                     </div>
                  ) : aiAnalysis ? (
                    <div className="bg-purple-900/10 border border-purple-500/30 rounded-lg p-4">
                       <div className="prose prose-invert prose-sm max-w-none text-xs leading-relaxed text-gray-300">
                         <pre className="whitespace-pre-wrap font-sans">{aiAnalysis}</pre>
                       </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 bg-gray-800/30 rounded-lg border border-gray-800 border-dashed">
                      <p className="text-xs text-gray-500 mb-3">点击下方按钮，请求 AI 解释该日志并提供解决方案</p>
                      <button 
                        onClick={() => handleAnalyzeLog(selectedLog)}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-4 py-2 rounded shadow-lg shadow-purple-900/20 transition-all"
                      >
                        开始分析此日志
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Global Summary View (Overlay or Panel) */}
          {showSummary && !selectedLog && (
            <div className="w-[450px] bg-gray-900 flex flex-col border-l border-gray-800 shadow-2xl z-20 absolute right-0 top-16 bottom-0">
               <div className="p-4 border-b border-gray-800 flex justify-between items-start bg-gray-850">
                <div>
                   <h2 className="text-sm font-bold text-gray-100 flex items-center gap-2">
                     <BarChart2 className="w-4 h-4 text-blue-400"/>
                     全局诊断报告
                   </h2>
                </div>
                <button onClick={() => setShowSummary(false)} className="text-gray-500 hover:text-white">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                 {analyzing ? (
                    <div className="flex flex-col items-center justify-center h-48 gap-3">
                       <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                       <span className="text-sm text-gray-400">正在分析所有错误日志...</span>
                    </div>
                 ) : (
                    <div className="prose prose-invert prose-sm text-sm text-gray-300">
                      <pre className="whitespace-pre-wrap font-sans">{summaryText}</pre>
                    </div>
                 )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default App;
