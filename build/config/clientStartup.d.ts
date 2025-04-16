import { ClientStartupOptions } from '../types.js';
/**
 * Client startup configuration by client type
 */
export interface ClientStartupConfig {
    [clientType: string]: {
        command: string;
        args?: string[];
        env?: Record<string, string>;
        cwd?: string;
        autoStart?: boolean;
        startupTimeoutMs?: number;
        maxRetries?: number;
        retryDelayMs?: number;
        healthCheck?: {
            enabled: boolean;
            intervalMs?: number;
            timeoutMs?: number;
            command?: string;
        };
    };
}
/**
 * Default client startup configuration
 * This would typically be loaded from a config file
 */
export declare const defaultClientConfig: ClientStartupConfig;
/**
 * Get startup options for a client type
 */
export declare function getClientStartupOptions(clientType: string, config?: ClientStartupConfig): ClientStartupOptions | null;
/**
 * Validate client startup configuration
 */
export declare function validateClientConfig(config: ClientStartupConfig): string[];
/**
 * Load client configuration from environment
 */
export declare function loadClientConfigFromEnv(): Partial<ClientStartupConfig>;
