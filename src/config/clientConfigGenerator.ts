import { promises as fs } from 'fs';
import { join } from 'path';
import { Logger } from '../utils/logger.js';
import { MacOSDirectoryManager } from '../platform/macos/directoryManager.js';

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
export class ClientConfigGenerator {
  private logger: Logger;
  private directoryManager: MacOSDirectoryManager;
  
  constructor() {
    this.logger = new Logger({ prefix: 'ClientConfigGenerator' });
    this.directoryManager = new MacOSDirectoryManager();
  }
  
  /**
   * Generate client configuration
   */
  public async generateConfig(
    options: ClientConfigOptions,
    format: ConfigFormat = 'json'
  ): Promise<string> {
    this.logger.info(`Generating ${format} config for ${options.clientType} client`);
    
    // Set default socket path if not provided
    const socketPath = options.socketPath || this.directoryManager.getSocketPath();
    
    // Generate client ID if not provided
    const clientId = options.clientId || `${options.clientType}-${Date.now()}`;
    
    // Generate config based on format
    let config: string;
    switch (format) {
      case 'json':
        config = this.generateJsonConfig(clientId, options.clientType, socketPath, options);
        break;
      case 'env':
        config = this.generateEnvConfig(clientId, options.clientType, socketPath, options);
        break;
      case 'args':
        config = this.generateArgsConfig(clientId, options.clientType, socketPath, options);
        break;
      default:
        throw new Error(`Unsupported config format: ${format}`);
    }
    
    // Save config if output path is provided
    if (options.outputPath) {
      await this.saveConfig(config, options.outputPath, format);
    }
    
    return config;
  }
  
  /**
   * Generate JSON configuration
   */
  private generateJsonConfig(
    clientId: string,
    clientType: ClientType,
    socketPath: string,
    options: ClientConfigOptions
  ): string {
    const config = {
      bridge: {
        socketPath,
        autoConnect: options.autoConnect !== false,
        reconnect: options.reconnect !== false
      },
      client: {
        id: clientId,
        type: clientType
      }
    };
    
    return JSON.stringify(config, null, 2);
  }
  
  /**
   * Generate environment variable configuration
   */
  private generateEnvConfig(
    clientId: string,
    clientType: ClientType,
    socketPath: string,
    options: ClientConfigOptions
  ): string {
    return [
      `MCP_BRIDGE_SOCKET=${socketPath}`,
      `MCP_CLIENT_ID=${clientId}`,
      `MCP_CLIENT_TYPE=${clientType}`,
      `MCP_AUTO_CONNECT=${options.autoConnect !== false ? 'true' : 'false'}`,
      `MCP_RECONNECT=${options.reconnect !== false ? 'true' : 'false'}`
    ].join('\n');
  }
  
  /**
   * Generate command-line arguments configuration
   */
  private generateArgsConfig(
    clientId: string,
    clientType: ClientType,
    socketPath: string,
    options: ClientConfigOptions
  ): string {
    return [
      `--mcp-bridge-socket=${socketPath}`,
      `--mcp-client-id=${clientId}`,
      `--mcp-client-type=${clientType}`,
      `--mcp-auto-connect=${options.autoConnect !== false ? 'true' : 'false'}`,
      `--mcp-reconnect=${options.reconnect !== false ? 'true' : 'false'}`
    ].join(' ');
  }
  
  /**
   * Save configuration to file
   */
  private async saveConfig(
    config: string,
    outputPath: string,
    format: ConfigFormat
  ): Promise<void> {
    try {
      // Determine file extension
      let extension: string;
      switch (format) {
        case 'json':
          extension = '.json';
          break;
        case 'env':
          extension = '.env';
          break;
        case 'args':
          extension = '.txt';
          break;
        default:
          extension = '.txt';
      }
      
      // Ensure path has extension
      const path = outputPath.endsWith(extension)
        ? outputPath
        : `${outputPath}${extension}`;
      
      // Create directory if it doesn't exist
      const dir = path.substring(0, path.lastIndexOf('/'));
      await fs.mkdir(dir, { recursive: true });
      
      // Write config to file
      await fs.writeFile(path, config, 'utf-8');
      
      this.logger.info(`Config saved to ${path}`);
    } catch (error) {
      this.logger.error('Failed to save config:', error);
      throw error;
    }
  }
  
  /**
   * Generate Claude client configuration
   */
  public async generateClaudeConfig(
    outputPath?: string,
    options: Partial<ClientConfigOptions> = {}
  ): Promise<string> {
    return this.generateConfig({
      clientType: 'claude',
      autoConnect: true,
      reconnect: true,
      outputPath,
      ...options
    });
  }
  
  /**
   * Generate Cline client configuration
   */
  public async generateClineConfig(
    outputPath?: string,
    options: Partial<ClientConfigOptions> = {}
  ): Promise<string> {
    return this.generateConfig({
      clientType: 'cline',
      autoConnect: true,
      reconnect: true,
      outputPath,
      ...options
    });
  }
  
  /**
   * Generate generic client configuration
   */
  public async generateGenericConfig(
    outputPath?: string,
    options: Partial<ClientConfigOptions> = {}
  ): Promise<string> {
    return this.generateConfig({
      clientType: 'generic',
      autoConnect: true,
      reconnect: true,
      outputPath,
      ...options
    });
  }
}
