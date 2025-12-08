import { LogEntry, LogLevel, LogSource } from '../types';

/**
 * Heuristic function to detect log source and parse content
 */
export const parseLogFile = (content: string, fileName: string): LogEntry[] => {
  const lines = content.split(/\r?\n/);
  const entries: LogEntry[] = [];
  
  // Basic detection based on filename or content markers
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
    let tag = '';
    let message = line;
    let source = detectedSource;

    // --- Android Logcat Parsing (simplified) ---
    // Format: 2023-10-27 10:00:00.123 123-456/com.package D/Tag: Message
    // OR: I/Tag(PID): Message
    if (source === LogSource.ANDROID || source === LogSource.UNKNOWN) {
        if (line.match(/[A-Z]\/.*:/) || line.includes('AndroidRuntime')) {
            source = LogSource.ANDROID;
            if (line.includes(' E/') || line.startsWith('E/')) level = LogLevel.ERROR;
            else if (line.includes(' W/') || line.startsWith('W/')) level = LogLevel.WARNING;
            else if (line.includes(' D/') || line.startsWith('D/')) level = LogLevel.DEBUG;
            else level = LogLevel.INFO;
            
            // Extract Timestamp if present (simple regex)
            const timeMatch = line.match(/\d{2}-\d{2}\s\d{2}:\d{2}:\d{2}\.\d{3}/);
            if (timeMatch) timestamp = timeMatch[0];
        }
    }

    // --- iOS Syslog Parsing ---
    // Format: Oct 27 10:00:00 iPhone Process[PID] <Notice>: Message
    if (source === LogSource.IOS || (source === LogSource.UNKNOWN && !timestamp)) {
        if (line.match(/[A-Za-z]{3}\s+\d+\s\d{2}:\d{2}:\d{2}/)) {
            source = LogSource.IOS;
            const timeMatch = line.match(/[A-Za-z]{3}\s+\d+\s\d{2}:\d{2}:\d{2}/);
            if (timeMatch) timestamp = timeMatch[0];

            if (line.toLowerCase().includes('<error>') || line.toLowerCase().includes(' error:')) level = LogLevel.ERROR;
            else if (line.toLowerCase().includes('<warning>') || line.toLowerCase().includes(' warning:')) level = LogLevel.WARNING;
            else if (line.toLowerCase().includes('<debug>')) level = LogLevel.DEBUG;
            else level = LogLevel.INFO;
        }
    }

    // --- WeChat/Generic Parsing ---
    // Often JSON or [INFO] format
    if (source === LogSource.WECHAT || (source === LogSource.UNKNOWN && !timestamp)) {
        if (line.startsWith('{') && line.endsWith('}')) {
             source = LogSource.WECHAT;
             try {
                 const json = JSON.parse(line);
                 message = json.message || json.msg || line;
                 if (json.level) {
                     const l = json.level.toLowerCase();
                     if (l === 'error') level = LogLevel.ERROR;
                     else if (l === 'warn') level = LogLevel.WARNING;
                     else level = LogLevel.INFO;
                 }
                 timestamp = json.time || json.timestamp || '';
             } catch (e) {
                 // Not valid json, treat as text
             }
        } else if (line.match(/^\[(INFO|ERR|WARN)\]/)) {
            source = LogSource.WECHAT;
             if (line.includes('[ERR')) level = LogLevel.ERROR;
             else if (line.includes('[WARN')) level = LogLevel.WARNING;
             else level = LogLevel.INFO;
        }
    }

    // Fallback Level Detection if generic
    if (level === LogLevel.UNKNOWN) {
        const lowerLine = line.toLowerCase();
        if (lowerLine.includes('error') || lowerLine.includes('exception') || lowerLine.includes('fail')) level = LogLevel.ERROR;
        else if (lowerLine.includes('warn')) level = LogLevel.WARNING;
        else if (lowerLine.includes('debug')) level = LogLevel.DEBUG;
        else level = LogLevel.INFO;
    }

    entries.push({
      id: `${Date.now()}-${index}-${Math.random()}`,
      timestamp: timestamp || 'N/A',
      level,
      source: source === LogSource.UNKNOWN ? LogSource.UNKNOWN : source,
      message,
      tag,
      raw: line
    });
  });

  return entries;
};

export const exportLogs = (logs: LogEntry[], format: 'txt' | 'csv' | 'json') => {
  let content = '';
  const mimeType = format === 'json' ? 'application/json' : 'text/plain';

  if (format === 'json') {
    content = JSON.stringify(logs, null, 2);
  } else if (format === 'csv') {
    content = 'Timestamp,Source,Level,Message\n' + logs.map(l => 
      `"${l.timestamp}","${l.source}","${l.level}","${l.message.replace(/"/g, '""')}"`
    ).join('\n');
  } else {
    // TXT
    content = logs.map(l => l.raw).join('\n');
  }

  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `logs_export_${new Date().toISOString()}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
