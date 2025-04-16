/**
 * Client type
 */
export type ClientType = 'claude' | 'cline' | 'generic';
/**
 * Client config format
 */
export type ConfigFormat = 'json' | 'env' | 'args';
/**
 * Client config options
 */
export interface ClientConfigOptions {
    clientId?: string;
    clientType: ClientType;
    socketPath?: string;
    autoConnect?: boolean;
    reconnect?: boolean;
    outputPath?: string;
}
/**
 * Client config generator
 * Generates configuration files for different client types
 */
export declare class ClientConfigGenerator {
    private logger;
    private directoryManager;
    constructor();
    /**
     * Generate client configuration
     */
    generateConfig(options: ClientConfigOptions, format?: ConfigFormat): Promise<string>;
    /**
     * Generate JSON configuration
     */
    private generateJsonConfig;
    /**
     * Generate environment variable configuration
     */
    private generateEnvConfig;
    /**
     * Generate command-line arguments configuration
     */
    private generateArgsConfig;
    /**
     * Save configuration to file
     */
    private saveConfig;
    /**
     * Generate Claude client configuration
     */
    generateClaudeConfig(outputPath?: string, options?: Partial<ClientConfigOptions>): Promise<string>;
    /**
     * Generate Cline client configuration
     */
    generateClineConfig(outputPath?: string, options?: Partial<ClientConfigOptions>): Promise<string>;
    /**
     * Generate generic client configuration
     */
    generateGenericConfig(outputPath?: string, options?: Partial<ClientConfigOptions>): Promise<string>;
}
