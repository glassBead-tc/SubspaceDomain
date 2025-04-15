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
export const defaultClientConfig: ClientStartupConfig = {
  claude: {
    command: 'claude-desktop',
    args: ['--mcp'],
    env: {
      NODE_ENV: 'production',
      MCP_CLIENT_TYPE: 'claude'
    },
    autoStart: true,
    startupTimeoutMs: 30000,
    maxRetries: 3,
    retryDelayMs: 5000,
    healthCheck: {
      enabled: true,
      intervalMs: 30000,
      timeoutMs: 5000
    }
  },
  cline: {
    command: 'cline',
    args: ['--mcp-mode'],
    env: {
      NODE_ENV: 'production',
      MCP_CLIENT_TYPE: 'cline'
    },
    autoStart: true,
    startupTimeoutMs: 30000,
    maxRetries: 3,
    retryDelayMs: 5000,
    healthCheck: {
      enabled: true,
      intervalMs: 30000,
      timeoutMs: 5000
    }
  }
};

/**
 * Get startup options for a client type
 */
export function getClientStartupOptions(
  clientType: string,
  config: ClientStartupConfig = defaultClientConfig
): ClientStartupOptions | null {
  const clientConfig = config[clientType];
  if (!clientConfig) return null;

  return {
    command: clientConfig.command,
    args: clientConfig.args,
    env: clientConfig.env,
    cwd: clientConfig.cwd,
    timeout: clientConfig.startupTimeoutMs
  };
}

/**
 * Validate client startup configuration
 */
export function validateClientConfig(config: ClientStartupConfig): string[] {
  const errors: string[] = [];

  for (const [clientType, clientConfig] of Object.entries(config)) {
    if (!clientConfig.command) {
      errors.push(`Missing command for client type: ${clientType}`);
    }

    if (clientConfig.startupTimeoutMs && clientConfig.startupTimeoutMs < 1000) {
      errors.push(`Invalid startup timeout for ${clientType}: must be at least 1000ms`);
    }

    if (clientConfig.maxRetries && clientConfig.maxRetries < 0) {
      errors.push(`Invalid max retries for ${clientType}: must be non-negative`);
    }

    if (clientConfig.retryDelayMs && clientConfig.retryDelayMs < 100) {
      errors.push(`Invalid retry delay for ${clientType}: must be at least 100ms`);
    }

    if (clientConfig.healthCheck?.enabled) {
      if (clientConfig.healthCheck.intervalMs && clientConfig.healthCheck.intervalMs < 1000) {
        errors.push(`Invalid health check interval for ${clientType}: must be at least 1000ms`);
      }
      if (clientConfig.healthCheck.timeoutMs && clientConfig.healthCheck.timeoutMs < 100) {
        errors.push(`Invalid health check timeout for ${clientType}: must be at least 100ms`);
      }
    }
  }

  return errors;
}

/**
 * Load client configuration from environment
 */
export function loadClientConfigFromEnv(): Partial<ClientStartupConfig> {
  const config: Partial<ClientStartupConfig> = {};

  // Look for environment variables in the format:
  // MCP_CLIENT_[TYPE]_[OPTION]
  // e.g., MCP_CLIENT_CLAUDE_COMMAND="claude-desktop"
  for (const [key, value] of Object.entries(process.env)) {
    const match = key.match(/^MCP_CLIENT_([A-Z]+)_([A-Z]+)$/);
    if (!match) continue;

    const [, clientType, option] = match;
    const type = clientType.toLowerCase();
    const opt = option.toLowerCase();

    if (!config[type]) {
      // Initialize with required command property to satisfy TypeScript
      config[type] = { command: '' };
    }

    // Ensure config[type] exists and value is defined
    if (config[type] && value) {
      switch (opt) {
        case 'command':
          config[type].command = value;
          break;
        case 'args':
          config[type].args = value.split(',');
          break;
        case 'autostart':
          config[type].autoStart = value.toLowerCase() === 'true';
          break;
        case 'timeout':
          config[type].startupTimeoutMs = parseInt(value, 10);
          break;
        case 'retries':
          config[type].maxRetries = parseInt(value, 10);
          break;
        case 'delay':
          config[type].retryDelayMs = parseInt(value, 10);
          break;
      }
    }
  }

  return config;
}
