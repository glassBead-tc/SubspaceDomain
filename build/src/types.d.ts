/**
 * Types for MCP Bridge Server
 */
export interface ClientInfo {
    id: string;
    type: 'claude' | 'cline' | 'other';
    transport: 'stdio' | 'http';
    connected: boolean;
    lastSeen: Date;
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
    type: 'request' | 'response' | 'error';
    method: string;
    sourceClientId: string;
    targetClientId?: string;
    payload: any;
    timestamp: Date;
}
export interface BridgeServerConfig {
    maxTaskAttempts: number;
    taskTimeoutMs: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
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
}
