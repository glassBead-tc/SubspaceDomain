import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { BridgeServerConfig, RouterConfig, StateManagerConfig, MacOSConfig } from '../types.js';
import { MacOSDirectoryManager } from '../platform/macos/directoryManager.js';

/**
 * Configuration manager
 * Handles loading, saving, and updating configuration
 */
export class ConfigManager {
  private configPath: string;
  private config: {
    server: BridgeServerConfig;
    router: RouterConfig;
    stateManager: StateManagerConfig;
  };
  private directoryManager?: MacOSDirectoryManager;

  constructor(configPath?: string) {
    // If on macOS and no config path provided, use macOS default
    if (!configPath && process.platform === 'darwin') {
      this.directoryManager = new MacOSDirectoryManager();
      this.configPath = this.directoryManager.getConfigPath();
    } else {
      this.configPath = configPath || join(process.cwd(), 'config.json');
    }

    // Default configuration
    this.config = {
      server: {
        maxTaskAttempts: 3,
        taskTimeoutMs: 30000,
        logLevel: 'info',
        clientStartupTimeoutMs: 30000,
        handshakeTimeoutMs: 10000,
        reconnectIntervalMs: 5000
      },
      router: {
        defaultTargetType: 'claude',
        routingRules: {
          'tools/optimize_code': {
            targetType: 'claude',
            priority: 1
          },
          'tools/execute_command': {
            targetType: 'cline',
            priority: 1
          }
        }
      },
      stateManager: {
        cleanupIntervalMs: 60000,
        taskExpirationMs: 300000,
        clientTimeoutMs: 60000,
        maxReconnectAttempts: 3,
        persistence: {
          enabled: true
        }
      }
    };
  }

  /**
   * Initialize configuration
   * Loads config from file or creates default
   */
  public async initialize(): Promise<void> {
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(dirname(this.configPath), { recursive: true });

      // Try to load existing config
      try {
        const configData = await fs.readFile(this.configPath, 'utf-8');
        const loadedConfig = JSON.parse(configData);

        // Merge with defaults
        this.config = {
          server: { ...this.config.server, ...loadedConfig.server },
          router: { ...this.config.router, ...loadedConfig.router },
          stateManager: { ...this.config.stateManager, ...loadedConfig.stateManager }
        };

        console.log(`Configuration loaded from ${this.configPath}`);
      } catch (error) {
        // If file doesn't exist, create it with defaults
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
          await this.save();
          console.log(`Default configuration created at ${this.configPath}`);
        } else {
          console.error('Error loading configuration:', error);
          throw error;
        }
      }

      // If on macOS, set up platform-specific config
      if (process.platform === 'darwin' && this.directoryManager) {
        // Set up macOS-specific paths if not already configured
        if (!this.config.server.platform?.macOS) {
          this.config.server.platform = {
            macOS: {
              baseDir: this.directoryManager.getBaseDir(),
              cacheDir: this.directoryManager.getCacheDir(),
              logsDir: this.directoryManager.getLogsDir(),
              socketPath: this.directoryManager.getSocketPath(),
              autoStart: true,
              keepAlive: true,
              runAtLoad: true
            }
          };
        }

        // Set up persistence storage dir
        if (!this.config.stateManager.persistence) {
          this.config.stateManager.persistence = {
            enabled: true,
            storageDir: this.directoryManager.getClientStoragePath()
          };
        } else if (!this.config.stateManager.persistence.storageDir) {
          this.config.stateManager.persistence.storageDir = this.directoryManager.getClientStoragePath();
        }

        // Set up unix socket transport if not configured
        if (!this.config.server.transport) {
          this.config.server.transport = {
            type: 'unix-socket',
            socketPath: this.directoryManager.getSocketPath()
          };
        }

        // Save updated config
        await this.save();
      }
    } catch (error) {
      console.error('Failed to initialize configuration:', error);
      throw error;
    }
  }

  /**
   * Save configuration to file
   */
  public async save(): Promise<void> {
    try {
      await fs.writeFile(
        this.configPath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Failed to save configuration:', error);
      throw error;
    }
  }

  /**
   * Get server configuration
   */
  public getServerConfig(): BridgeServerConfig {
    return this.config.server;
  }

  /**
   * Get router configuration
   */
  public getRouterConfig(): RouterConfig {
    return this.config.router;
  }

  /**
   * Get state manager configuration
   */
  public getStateManagerConfig(): StateManagerConfig {
    return this.config.stateManager;
  }

  /**
   * Get macOS configuration
   */
  public getMacOSConfig(): MacOSConfig | undefined {
    return this.config.server.platform?.macOS;
  }

  /**
   * Update server configuration
   */
  public async updateServerConfig(config: Partial<BridgeServerConfig>): Promise<void> {
    this.config.server = { ...this.config.server, ...config };
    await this.save();
  }

  /**
   * Update router configuration
   */
  public async updateRouterConfig(config: Partial<RouterConfig>): Promise<void> {
    this.config.router = { ...this.config.router, ...config };
    await this.save();
  }

  /**
   * Update state manager configuration
   */
  public async updateStateManagerConfig(config: Partial<StateManagerConfig>): Promise<void> {
    this.config.stateManager = { ...this.config.stateManager, ...config };
    await this.save();
  }

  /**
   * Update macOS configuration
   */
  public async updateMacOSConfig(config: Partial<MacOSConfig>): Promise<void> {
    if (!this.config.server.platform) {
      this.config.server.platform = { macOS: config };
    } else {
      this.config.server.platform.macOS = {
        ...this.config.server.platform.macOS,
        ...config
      };
    }
    await this.save();
  }
}

// Export singleton instance
export const configManager = new ConfigManager();
