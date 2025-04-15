/**
 * Types for MCP Bridge Server
 */

export enum ConnectionState {
  DISCOVERING = 'discovering',
  CONNECTING = 'connecting',
  HANDSHAKING = 'handshaking',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  ERROR = 'error'
}

export interface ClientCapabilities {
  supportedMethods: string[];
  supportedTransports: ('stdio' | 'http')[];
  maxConcurrentTasks?: number;
  targetType?: 'claude' | 'cline';
  features?: {
    autoStart?: boolean;
    reconnect?: boolean;
    healthCheck?: boolean;
  };
}

export interface ClientInfo {
  id: string;
  type: 'claude' | 'cline' | 'other';
  transport: 'stdio' | 'http';
  connected: boolean;
  lastSeen: Date;
  state: ConnectionState;
  capabilities?: ClientCapabilities;
  processId?: number;  // For locally started clients
}

export interface TaskState {
  id: string;
  clientId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
}

export interface Message {
  id: string;
  type: 'request' | 'response' | 'error' | 'handshake';
  method: string;
  sourceClientId: string;
  targetClientId?: string;
  payload: any;
  timestamp: Date;
}

export interface HandshakeMessage extends Message {
  type: 'handshake';
  method: 'initiate' | 'request' | 'accept' | 'established';
  payload: {
    capabilities: ClientCapabilities;
    connectionId?: string;
  };
}

export interface BridgeServerConfig {
  maxTaskAttempts: number;
  taskTimeoutMs: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  clientStartupTimeoutMs?: number;
  handshakeTimeoutMs?: number;
  reconnectIntervalMs?: number;
}

export interface RouterConfig {
  defaultTargetType?: 'claude' | 'cline';
  routingRules?: {
    [methodName: string]: {
      targetType: 'claude' | 'cline';
      priority?: number;
    };
  };
}

export interface StateManagerConfig {
  cleanupIntervalMs: number;
  taskExpirationMs: number;
  clientTimeoutMs?: number;
  maxReconnectAttempts?: number;
}

export interface ClientStartupOptions {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
  timeout?: number;
}

export interface ClientDiscoveryResult {
  found: boolean;
  client?: ClientInfo;
  error?: string;
  startupAttempted?: boolean;
  startupSuccessful?: boolean;
}
