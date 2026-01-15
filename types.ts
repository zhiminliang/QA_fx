
export enum LogLevel {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  DEBUG = 'DEBUG',
  UNKNOWN = 'UNKNOWN'
}

export enum LogSource {
  IOS = 'iOS',
  ANDROID = 'Android',
  WECHAT = 'WeChat',
  UNKNOWN = 'Unknown'
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: LogLevel;
  source: LogSource;
  tag?: string;
  message: string;
  raw: string;
}

export interface LogStats {
  info: number;
  warning: number;
  error: number;
  debug: number;
  total: number;
}

export interface PerformanceMetric {
  timestamp: string;
  type: 'latency' | 'fps' | 'memory' | 'cpu';
  value: number;
  unit: string;
  label: string;
}

export interface InterfaceMetric {
  id: string;
  url: string;
  method: string;
  status: string;
  duration: number; // in ms
  timestamp: string;
}
