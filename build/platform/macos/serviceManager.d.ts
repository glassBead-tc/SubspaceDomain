import { MacOSConfig } from '../../types.js';
/**
 * Service status
 */
export declare enum ServiceStatus {
    RUNNING = "running",
    STOPPED = "stopped",
    NOT_INSTALLED = "not_installed",
    UNKNOWN = "unknown"
}
/**
 * Service error types
 */
export declare enum ServiceErrorType {
    INSTALLATION_FAILED = "installation_failed",
    UNINSTALLATION_FAILED = "uninstallation_failed",
    START_FAILED = "start_failed",
    STOP_FAILED = "stop_failed",
    STATUS_CHECK_FAILED = "status_check_failed"
}
/**
 * Service error
 */
export declare class ServiceError extends Error {
    type: ServiceErrorType;
    metadata?: any | undefined;
    constructor(type: ServiceErrorType, message: string, metadata?: any | undefined);
}
/**
 * macOS Service Manager
 * Handles installation and management of macOS LaunchAgent service
 */
export declare class MacOSServiceManager {
    private directoryManager;
    private config;
    constructor(config?: MacOSConfig);
    /**
     * Initialize service manager
     */
    initialize(): Promise<void>;
    /**
     * Install service as LaunchAgent
     * @param execPath Path to the executable
     */
    install(execPath: string): Promise<void>;
    /**
     * Uninstall service
     */
    uninstall(): Promise<void>;
    /**
     * Start service
     */
    start(): Promise<void>;
    /**
     * Stop service
     */
    stop(): Promise<void>;
    /**
     * Restart service
     */
    restart(): Promise<void>;
    /**
     * Get service status
     */
    getStatus(): Promise<ServiceStatus>;
    /**
     * Generate LaunchAgent plist content
     * @param execPath Path to the executable
     */
    private generateLaunchAgentPlist;
}
export declare const macOSServiceManager: MacOSServiceManager;
