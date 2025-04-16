/**
 * Monitoring system types for MCP Bridge Server
 */
/**
 * Metric types
 */
export var MetricType;
(function (MetricType) {
    MetricType["COUNTER"] = "counter";
    MetricType["GAUGE"] = "gauge";
    MetricType["HISTOGRAM"] = "histogram";
})(MetricType || (MetricType = {}));
/**
 * Health status
 */
export var HealthStatus;
(function (HealthStatus) {
    HealthStatus["HEALTHY"] = "healthy";
    HealthStatus["DEGRADED"] = "degraded";
    HealthStatus["UNHEALTHY"] = "unhealthy";
})(HealthStatus || (HealthStatus = {}));
/**
 * Log level
 */
export var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "debug";
    LogLevel["INFO"] = "info";
    LogLevel["WARN"] = "warn";
    LogLevel["ERROR"] = "error";
})(LogLevel || (LogLevel = {}));
/**
 * Monitoring error types
 */
export var MonitoringErrorType;
(function (MonitoringErrorType) {
    MonitoringErrorType["METRIC_INVALID"] = "METRIC_INVALID";
    MonitoringErrorType["HEALTH_CHECK_FAILED"] = "HEALTH_CHECK_FAILED";
    MonitoringErrorType["LOG_FAILED"] = "LOG_FAILED";
    MonitoringErrorType["TRANSPORT_ERROR"] = "TRANSPORT_ERROR";
})(MonitoringErrorType || (MonitoringErrorType = {}));
/**
 * Monitoring error
 */
export class MonitoringError extends Error {
    constructor(type, message, metadata) {
        super(message);
        this.type = type;
        this.metadata = metadata;
        this.name = 'MonitoringError';
    }
}
//# sourceMappingURL=types.js.map