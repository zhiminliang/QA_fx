
import React, { useState, useMemo, useRef } from 'react';
import { Upload, FileText, Download, Search, Activity, Cpu, MessageSquare, Menu, XCircle, BarChart2, TrendingUp, Globe, Camera, ImageIcon } from 'lucide-react';
import { LogEntry, LogLevel, LogSource, PerformanceMetric, InterfaceMetric } from './types';
import { parseLogFile, exportLogs, extractPerformanceMetrics, extractInterfaceMetrics } from './services/logUtils';
import { analyzeLogEntry, generateSummary, analyzePerformance, analyzeScreenshotForPerformance } from './services/geminiService';
import StatsChart from './components/StatsChart';
import PerformanceReport from './components/PerformanceReport';

const LevelBadge: React.FC<{ level: LogLevel }> = ({ level }) => {
  const colors = {
    [LogLevel.ERROR]: 'bg-red-500/10 text-red-500 border-red-500/20',
    [LogLevel.WARNING]: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    [LogLevel.INFO]: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    [LogLevel.DEBUG]: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
    [LogLevel.UNKNOWN]: 'bg-gray-700/10 text-gray-500 border-gray-700/20',
  };
  return <span className={`px-2 py-0.5 text-xs font-medium rounded border ${colors[level]}`}>{level}</span>;
};

const SourceBadge: React.FC<{ source: LogSource }> = ({ source }) => {
   const colors = { [LogSource.ANDROID]: 'text-green-400', [LogSource.IOS]: 'text-gray-200', [LogSource.WECHAT]: 'text-emerald-400', [LogSource.UNKNOWN]: 'text-gray-500' };
   return <span className={`flex items-center text-xs font-semibold ${colors[source]}`}>{source}</span>;
};

function App() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [filename, setFilename] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSource, setFilterSource] = useState<LogSource | 'ALL'>('ALL');
  const [filterLevel, setFilterLevel] = useState<LogLevel | 'ALL'>('ALL');

  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [analyzing, setAnalyzing] = useState(false);
  
  const [showSummary, setShowSummary] = useState(false);
  const [summaryText, setSummaryText] = useState('');

  // Performance State
  const [showPerformance, setShowPerformance] = useState(false);
  const [perfMetrics, setPerfMetrics] = useState<PerformanceMetric[]>([]);
  const [interfaceMetrics, setInterfaceMetrics] = useState<InterfaceMetric[]>([]);
  const [perfReport, setPerfReport] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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

  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) || log.raw.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesSource = filterSource === 'ALL' || log.source === filterSource;
      const matchesLevel = filterLevel === 'ALL' || log.level === filterLevel;
      return matchesSearch && matchesSource && matchesLevel;
    });
  }, [logs, searchTerm, filterSource, filterLevel]);

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
      setSelectedLog(null);
      setShowSummary(false);
      setShowPerformance(false);
    };
    reader.readAsText(file);
  };

  const handleScreenshotUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setAnalyzing(true);
    setShowPerformance(true);
    setPerfReport("");
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      try {
        const result = await analyzeScreenshotForPerformance(base64);
        setInterfaceMetrics(prev => [...result.metrics, ...prev]);
        setPerfReport(result.report);
      } catch (err) {
        alert("图片识别失败，请检查网络或 API 配置。");
      } finally {
        setAnalyzing(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateSummary = async () => {
    if (logs.length === 0) return;
    setAnalyzing(true);
    setShowSummary(true);
    setShowPerformance(false);
    const result = await generateSummary(logs);
    setSummaryText(result);
    setAnalyzing(false);
  };

  const handleGeneratePerformance = async () => {
    if (logs.length === 0 && interfaceMetrics.length === 0) return;
    setAnalyzing(true);
    setShowPerformance(true);
    setShowSummary(false);
    setSelectedLog(null);
    
    const sysMetrics = extractPerformanceMetrics(logs);
    const apiMetrics = extractInterfaceMetrics(logs);
    
    // Merge only if new logs are present
    if (apiMetrics.length > 0) {
      setInterfaceMetrics(apiMetrics);
    }
    setPerfMetrics(sysMetrics);
    
    const result = await analyzePerformance(sysMetrics, interfaceMetrics.length > 0 ? interfaceMetrics : apiMetrics, logs);
    setPerfReport(result);
    setAnalyzing(false);
  };

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-800 flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center"><FileText className="text-white w-5 h-5" /></div>
          <h1 className="text-lg font-bold tracking-tight">LogSight</h1>
        </div>
        
        <div className="p-4 space-y-2">
          <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".txt,.log,.json" />
          <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium">
            <Upload className="w-4 h-4" />导入日志文件
          </button>
          
          <input type="file" ref={imageInputRef} onChange={handleScreenshotUpload} className="hidden" accept="image/*" />
          <button onClick={() => imageInputRef.current?.click()} className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md transition-colors text-sm font-medium">
            <Camera className="w-4 h-4" />上传截图诊断
          </button>
        </div>

        <div className="px-4 py-2 flex-1 overflow-y-auto space-y-4">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">诊断概览</h3>
          <StatsChart stats={stats} />
          <div className="space-y-2">
             <button onClick={handleGenerateSummary} className="w-full border border-gray-700 hover:bg-gray-800 text-gray-300 text-xs py-2 px-3 rounded flex items-center gap-2 transition-colors">
               <BarChart2 className="w-3 h-3" />生成 AI 诊断简报
             </button>
             <button onClick={handleGeneratePerformance} className="w-full bg-emerald-600/10 border border-emerald-500/30 hover:bg-emerald-600/20 text-emerald-400 text-xs py-2 px-3 rounded flex items-center gap-2 transition-colors">
               <Globe className="w-3 h-3" />生成接口性能报告
             </button>
          </div>
        </div>
        <div className="p-4 border-t border-gray-800 text-xs text-gray-600 italic">Gemini 3 Multimodal Ready</div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <header className="h-16 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input type="text" placeholder="搜索日志内容..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full bg-gray-950 border border-gray-700 text-gray-200 pl-9 pr-3 py-1.5 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
            </div>
            <div className="flex items-center gap-2 bg-gray-850 px-3 py-1 rounded border border-gray-700">
               <Activity className="w-3.5 h-3.5 text-blue-500" />
               <span className="text-xs font-mono text-gray-400">当前活跃数据: {logs.length} 条日志 / {interfaceMetrics.length} 个接口</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowPerformance(false)} className={`text-sm px-3 py-1.5 rounded-md transition-all ${!showPerformance ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'}`}>日志视图</button>
            <button onClick={() => setShowPerformance(true)} className={`text-sm px-3 py-1.5 rounded-md transition-all ${showPerformance ? 'bg-emerald-600 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-800'}`}>性能视图</button>
            <div className="w-px h-6 bg-gray-800 mx-2"></div>
            <button onClick={() => exportLogs(filteredLogs, 'json')} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 px-3 py-1.5 rounded-md text-sm">
              <Download className="w-4 h-4" />导出
            </button>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {showPerformance ? (
             <div className="flex-1 overflow-hidden">
               <PerformanceReport metrics={perfMetrics} interfaceMetrics={interfaceMetrics} aiReport={perfReport} loading={analyzing} />
             </div>
          ) : (
            <>
              <div className={`flex-1 flex flex-col border-r border-gray-800 bg-gray-950 ${selectedLog ? 'w-2/3' : 'w-full'} transition-all`}>
                 <div className="flex-1 overflow-auto font-mono text-sm relative">
                   {loading && <div className="absolute inset-0 flex items-center justify-center bg-gray-950/80 z-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div></div>}
                   {logs.length === 0 && !loading && (
                     <div className="flex flex-col items-center justify-center h-full text-gray-600 space-y-4">
                       <ImageIcon className="w-12 h-12 opacity-20" />
                       <p className="text-sm">暂无数据，请导入日志文件或上传性能截图</p>
                     </div>
                   )}
                   <table className="w-full text-left">
                     <tbody>
                       {filteredLogs.map((log) => (
                         <tr key={log.id} onClick={() => { setSelectedLog(log); setAiAnalysis(''); }} className={`border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer ${selectedLog?.id === log.id ? 'bg-blue-900/20' : ''}`}>
                           <td className="py-1.5 px-3 text-gray-500 w-32 text-xs">{log.timestamp.split(' ')[1] || log.timestamp}</td>
                           <td className="py-1.5 px-2 w-20"><LevelBadge level={log.level} /></td>
                           <td className="py-1.5 px-3 text-gray-300 break-all leading-snug font-mono text-[13px]"><SourceBadge source={log.source} /> {log.message}</td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
              </div>

              {selectedLog && (
                <div className="w-[450px] bg-gray-900 flex flex-col border-l border-gray-800 shadow-2xl animate-in slide-in-from-right duration-300">
                  <div className="p-4 border-b border-gray-800 flex justify-between bg-gray-850">
                    <h2 className="text-sm font-bold">日志详情</h2>
                    <button onClick={() => setSelectedLog(null)} className="text-gray-500 hover:text-white"><XCircle className="w-5 h-5" /></button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    <div className="space-y-4">
                       <div><label className="text-xs text-gray-500">原始消息</label><pre className="mt-1 p-3 bg-gray-950 rounded border border-gray-800 text-xs whitespace-pre-wrap font-mono text-blue-300">{selectedLog.raw}</pre></div>
                    </div>
                    <div className="pt-4 border-t border-gray-800">
                      <h3 className="text-sm font-bold text-purple-400 mb-3 flex items-center gap-2"><Cpu className="w-4 h-4" />Gemini 智能分析</h3>
                      {analyzing ? (
                        <div className="p-4 bg-gray-800/50 rounded-lg flex flex-col items-center gap-2"><div className="animate-spin h-5 w-5 border-b-2 border-purple-500"></div><span className="text-xs">AI 正在思考...</span></div>
                      ) : aiAnalysis ? (
                        <div className="bg-purple-900/10 border border-purple-500/30 rounded-lg p-4 text-xs text-gray-300 leading-relaxed whitespace-pre-wrap">{aiAnalysis}</div>
                      ) : (
                        <button onClick={() => { setAnalyzing(true); analyzeLogEntry(selectedLog, []).then(res => { setAiAnalysis(res); setAnalyzing(false); }); }} className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs py-2 rounded font-bold shadow-lg shadow-purple-900/20 transition-all">开始 AI 诊断</button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {showSummary && (
            <div className="w-[450px] bg-gray-900 flex flex-col border-l border-gray-800 shadow-2xl absolute right-0 top-0 bottom-0 z-50 animate-in slide-in-from-right duration-300">
               <div className="p-4 border-b border-gray-800 flex justify-between bg-gray-850">
                 <h2 className="text-sm font-bold flex items-center gap-2"><BarChart2 className="w-4 h-4 text-blue-400"/>全局诊断报告</h2>
                 <button onClick={() => setShowSummary(false)} className="text-gray-500 hover:text-white"><XCircle className="w-5 h-5" /></button>
               </div>
               <div className="flex-1 overflow-y-auto p-4">
                 {analyzing ? <div className="flex flex-col items-center pt-12 gap-3"><div className="animate-spin h-8 w-8 border-b-2 border-blue-500"></div><span className="text-sm font-mono animate-pulse">正在利用 Gemini 分析全局上下文...</span></div> : <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap prose prose-invert">{summaryText}</div>}
               </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
