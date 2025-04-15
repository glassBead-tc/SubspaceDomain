/**
 * Monitoring system types for MCP Bridge Server
 */

/**
 * Metric types
 */
export enum MetricType {
  COUNTER = 'counter',
  GAUGE = 'gauge',
  HISTOGRAM = 'histogram'
}

/**
 * Metric value
 */
export type MetricValue = number | {
  count: number;
  sum: number;
  min: number;
  max: number;
  buckets: { [key: number]: number };
};

/**
 * Metric labels
 */
export interface MetricLabels {
  [key: string]: string;
}

/**
 * Metric
 */
export interface Metric {
  name: string;
  type: MetricType;
  help: string;
  value: MetricValue;
  labels?: MetricLabels;
  timestamp: Date;
}

/**
 * Health status
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy'
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  status: HealthStatus;
  message?: string;
  details?: any;
  timestamp: Date;
}

/**
 * Health check
 */
export interface HealthCheck {
  name: string;
  check(): Promise<HealthCheckResult>;
}

/**
 * Log level
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Log entry
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  context?: {
    component?: string;
    operation?: string;
    requestId?: string;
    userId?: string;
    clientId?: string;
    machineId?: string;
    [key: string]: any;
  };
  error?: Error;
}

/**
 * Log formatter
 */
export interface LogFormatter {
  format(entry: LogEntry): string;
}

/**
 * Log transport
 */
export interface LogTransport {
  log(entry: LogEntry): Promise<void>;
}

/**
 * Monitoring error types
 */
export enum MonitoringErrorType {
  METRIC_INVALID = 'METRIC_INVALID',
  HEALTH_CHECK_FAILED = 'HEALTH_CHECK_FAILED',
  LOG_FAILED = 'LOG_FAILED',
  TRANSPORT_ERROR = 'TRANSPORT_ERROR'
}

/**
 * Monitoring error
 */
export class MonitoringError extends Error {
  constructor(
    public type: MonitoringErrorType,
    message: string,
    public metadata?: any
  ) {
    super(message);
    this.name = 'MonitoringError';
  }
}

/**
 * Monitoring configuration
 */
export interface MonitoringConfig {
  enabled: boolean;
  metrics?: {
    enabled: boolean;
    interval?: number;
    prefix?: string;
    labels?: MetricLabels;
  };
  health?: {
    enabled: boolean;
    interval?: number;
    timeout?: number;
  };
  logging?: {
    enabled: boolean;
    level: LogLevel;
    format?: 'json' | 'text';
    transports?: {
      type: 'console' | 'file';
      options?: any;
    }[];
  };
}

/**
 * Metric collector
 */
export interface MetricCollector {
  collect(): Promise<Metric[]>;
}

/**
 * System metrics
 */
export interface SystemMetrics {
  cpu: {
    usage: number;
    load: number[];
  };
  memory: {
    total: number;
    used: number;
    free: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    connectionsActive: number;
  };
  process: {
    uptime: number;
    memory: number;
    cpu: number;
    threads: number;
    handles: number;
  };
}

/**
 * Status report
 */
export interface StatusReport {
  status: HealthStatus;
  version: string;
  uptime: number;
  metrics: SystemMetrics;
  checks: {
    [key: string]: HealthCheckResult;
  };
  timestamp: Date;
}

/**
 * Status reporter
 */
export interface StatusReporter {
  getStatus(): Promise<StatusReport>;
}
