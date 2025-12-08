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
  tag?: string; // Component or Process name
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
