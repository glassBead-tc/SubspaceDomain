import { BridgeServerConfig, RouterConfig, StateManagerConfig, MacOSConfig } from '../types.js';
/**
 * Configuration manager
 * Handles loading, saving, and updating configuration
 */
export declare class ConfigManager {
    private configPath;
    private config;
    private directoryManager?;
    constructor(configPath?: string);
    /**
     * Initialize configuration
     * Loads config from file or creates default
     */
    initialize(): Promise<void>;
    /**
     * Save configuration to file
     */
    save(): Promise<void>;
    /**
     * Get server configuration
     */
    getServerConfig(): BridgeServerConfig;
    /**
     * Get router configuration
     */
    getRouterConfig(): RouterConfig;
    /**
     * Get state manager configuration
     */
    getStateManagerConfig(): StateManagerConfig;
    /**
     * Get macOS configuration
     */
    getMacOSConfig(): MacOSConfig | undefined;
    /**
     * Update server configuration
     */
    updateServerConfig(config: Partial<BridgeServerConfig>): Promise<void>;
    /**
     * Update router configuration
     */
    updateRouterConfig(config: Partial<RouterConfig>): Promise<void>;
    /**
     * Update state manager configuration
     */
    updateStateManagerConfig(config: Partial<StateManagerConfig>): Promise<void>;
    /**
     * Update macOS configuration
     */
    updateMacOSConfig(config: Partial<MacOSConfig>): Promise<void>;
}
export declare const configManager: ConfigManager;
