import { MacOSConfig } from '../../types.js';
/**
 * Default macOS directory paths
 */
export declare const DEFAULT_MACOS_PATHS: {
    baseDir: string;
    cacheDir: string;
    logsDir: string;
    socketPath: string;
    launchAgentDir: string;
    launchAgentName: string;
};
/**
 * macOS Directory Manager
 * Handles creation and management of macOS-specific directories
 */
export declare class MacOSDirectoryManager {
    private config;
    constructor(config?: MacOSConfig);
    /**
     * Initialize directory structure
     * Creates all required directories for macOS service
     */
    initialize(): Promise<void>;
    /**
     * Create all required directories
     */
    private createDirectories;
    /**
     * Get base directory path
     */
    getBaseDir(): string;
    /**
     * Get cache directory path
     */
    getCacheDir(): string;
    /**
     * Get logs directory path
     */
    getLogsDir(): string;
    /**
     * Get socket path
     */
    getSocketPath(): string;
    /**
     * Get LaunchAgent directory path
     */
    getLaunchAgentDir(): string;
    /**
     * Get LaunchAgent file path
     */
    getLaunchAgentPath(): string;
    /**
     * Get config file path
     */
    getConfigPath(): string;
    /**
     * Get client registration storage path
     */
    getClientStoragePath(): string;
    /**
     * Get log file path
     */
    getLogFilePath(): string;
    /**
     * Check if directories exist
     */
    checkDirectories(): Promise<boolean>;
    /**
     * Clean up directories
     * @param removeData Whether to remove data directory
     */
    cleanup(removeData?: boolean): Promise<void>;
}
export declare const macOSDirectoryManager: MacOSDirectoryManager;
