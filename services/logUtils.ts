
import { LogEntry, LogLevel, LogSource, PerformanceMetric, InterfaceMetric } from '../types';

export const parseLogFile = (content: string, fileName: string): LogEntry[] => {
  const lines = content.split(/\r?\n/);
  const entries: LogEntry[] = [];
  
  let detectedSource = LogSource.UNKNOWN;
  if (fileName.toLowerCase().includes('ios') || fileName.includes('.syslog')) {
    detectedSource = LogSource.IOS;
  } else if (fileName.toLowerCase().includes('android') || fileName.includes('logcat')) {
    detectedSource = LogSource.ANDROID;
  } else if (fileName.toLowerCase().includes('wechat') || fileName.includes('miniprogram')) {
    detectedSource = LogSource.WECHAT;
  }

  lines.forEach((line, index) => {
    if (!line.trim()) return;
    let level = LogLevel.UNKNOWN;
    let timestamp = '';
    let message = line;
    let source = detectedSource;

    if (source === LogSource.ANDROID || source === LogSource.UNKNOWN) {
        if (line.match(/[A-Z]\/.*:/) || line.includes('AndroidRuntime')) {
            source = LogSource.ANDROID;
            if (line.includes(' E/') || line.startsWith('E/')) level = LogLevel.ERROR;
            else if (line.includes(' W/') || line.startsWith('W/')) level = LogLevel.WARNING;
            else if (line.includes(' D/') || line.startsWith('D/')) level = LogLevel.DEBUG;
            else level = LogLevel.INFO;
            const timeMatch = line.match(/\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\.\d{3}/);
            if (timeMatch) timestamp = timeMatch[0];
        }
    }

    if (source === LogSource.IOS || (source === LogSource.UNKNOWN && !timestamp)) {
        if (line.match(/[A-Za-z]{3}\s+\d+\s\d{2}:\d{2}:\d{2}/)) {
            source = LogSource.IOS;
            const timeMatch = line.match(/[A-Za-z]{3}\s+\d+\s\d{2}:\d{2}:\d{2}/);
            if (timeMatch) timestamp = timeMatch[0];
            if (line.toLowerCase().includes('error')) level = LogLevel.ERROR;
            else if (line.toLowerCase().includes('warning')) level = LogLevel.WARNING;
            else level = LogLevel.INFO;
        }
    }

    if (level === LogLevel.UNKNOWN) {
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('error') || lowerLine.includes('fail')) level = LogLevel.ERROR;
        else if (lowerLine.includes('warn')) level = LogLevel.WARNING;
        else level = LogLevel.INFO;
    }

    entries.push({
      id: `${Date.now()}-${index}`,
      timestamp: timestamp || 'N/A',
      level,
      source,
      message,
      raw: line
    });
  });

  return entries;
};

export const extractPerformanceMetrics = (logs: LogEntry[]): PerformanceMetric[] => {
  const metrics: PerformanceMetric[] = [];
  const patterns = [
    { type: 'latency', regex: /(\d+(?:\.\d+)?)\s*(ms|milliseconds)/i, unit: 'ms', label: '响应耗时' },
    { type: 'fps', regex: /(\d+(?:\.\d+)?)\s*fps/i, unit: 'fps', label: '帧率' },
    { type: 'memory', regex: /(\d+(?:\.\d+)?)\s*(MB|MiB|KB)/i, unit: 'MB', label: '内存占用' },
    { type: 'cpu', regex: /(\d+(?:\.\d+)?)\s*%/i, unit: '%', label: 'CPU使用率' }
  ];

  logs.forEach(log => {
    patterns.forEach(p => {
      const match = log.message.match(p.regex);
      if (match) {
        let value = parseFloat(match[1]);
        if (p.unit === 'MB' && match[2].toUpperCase() === 'KB') value = value / 1024;
        metrics.push({ timestamp: log.timestamp, type: p.type as any, value: parseFloat(value.toFixed(2)), unit: p.unit, label: p.label });
      }
    });
  });
  return metrics;
};

/**
 * 提取接口性能指标
 * 匹配模式如: "GET /api/v1/user 200 45ms", "POST http://host.com/path status:200 took:120ms"
 */
export const extractInterfaceMetrics = (logs: LogEntry[]): InterfaceMetric[] => {
  const metrics: InterfaceMetric[] = [];
  // 匹配常见的网络日志格式
  const interfaceRegex = /(GET|POST|PUT|DELETE|PATCH)\s+([^\s?]+)(?:\?\S+)?.*?(200|201|400|401|403|404|500|502).*?(\d+(?:\.\d+)?)\s*ms/i;

  logs.forEach((log, index) => {
    const match = log.message.match(interfaceRegex);
    if (match) {
      metrics.push({
        id: `api-${index}`,
        method: match[1].toUpperCase(),
        url: match[2],
        status: match[3],
        duration: parseFloat(match[4]),
        timestamp: log.timestamp
      });
    }
  });
  return metrics;
};

export const exportLogs = (logs: LogEntry[], format: 'txt' | 'csv' | 'json') => {
  let content = '';
  if (format === 'json') content = JSON.stringify(logs, null, 2);
  else if (format === 'csv') content = 'Timestamp,Level,Message\n' + logs.map(l => `"${l.timestamp}","${l.level}","${l.message}"`).join('\n');
  else content = logs.map(l => l.raw).join('\n');
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `logs.${format}`;
  a.click();
};
