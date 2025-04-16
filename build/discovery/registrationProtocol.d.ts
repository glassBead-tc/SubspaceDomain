import { ClientInfo, ClientCapabilities } from '../types.js';
/**
 * Registration message types
 */
export declare enum RegistrationMessageType {
    REGISTER = "register",
    REGISTER_RESPONSE = "register_response",
    HEARTBEAT = "heartbeat",
    HEARTBEAT_RESPONSE = "heartbeat_response",
    DISCONNECT = "disconnect"
}
/**
 * Registration status
 */
export declare enum RegistrationStatus {
    SUCCESS = "success",
    ERROR = "error"
}
/**
 * Base registration message
 */
export interface RegistrationMessage {
    type: RegistrationMessageType;
    timestamp: string;
}
/**
 * Register message
 */
export interface RegisterMessage extends RegistrationMessage {
    type: RegistrationMessageType.REGISTER;
    clientId?: string;
    clientType: 'claude' | 'cline' | 'other';
    capabilities: ClientCapabilities;
    transport: 'stdio' | 'http' | 'unix-socket';
    socketPath?: string;
}
/**
 * Register response message
 */
export interface RegisterResponseMessage extends RegistrationMessage {
    type: RegistrationMessageType.REGISTER_RESPONSE;
    status: RegistrationStatus;
    clientId: string;
    error?: string;
    serverCapabilities?: {
        supportedMethods: string[];
        supportedTransports: ('stdio' | 'http' | 'unix-socket')[];
    };
}
/**
 * Heartbeat message
 */
export interface HeartbeatMessage extends RegistrationMessage {
    type: RegistrationMessageType.HEARTBEAT;
    clientId: string;
}
/**
 * Heartbeat response message
 */
export interface HeartbeatResponseMessage extends RegistrationMessage {
    type: RegistrationMessageType.HEARTBEAT_RESPONSE;
    status: RegistrationStatus;
    error?: string;
}
/**
 * Disconnect message
 */
export interface DisconnectMessage extends RegistrationMessage {
    type: RegistrationMessageType.DISCONNECT;
    clientId: string;
    reason?: string;
}
/**
 * Registration protocol handler
 */
export declare class RegistrationProtocol {
    private logger;
    constructor();
    /**
     * Parse registration message
     */
    parseMessage(message: string): RegistrationMessage | null;
    /**
     * Create register message
     */
    createRegisterMessage(clientType: 'claude' | 'cline' | 'other', capabilities: ClientCapabilities, transport: 'stdio' | 'http' | 'unix-socket', clientId?: string, socketPath?: string): RegisterMessage;
    /**
     * Create register response message
     */
    createRegisterResponseMessage(status: RegistrationStatus, clientId: string, error?: string, serverCapabilities?: {
        supportedMethods: string[];
        supportedTransports: ('stdio' | 'http' | 'unix-socket')[];
    }): RegisterResponseMessage;
    /**
     * Create heartbeat message
     */
    createHeartbeatMessage(clientId: string): HeartbeatMessage;
    /**
     * Create heartbeat response message
     */
    createHeartbeatResponseMessage(status: RegistrationStatus, error?: string): HeartbeatResponseMessage;
    /**
     * Create disconnect message
     */
    createDisconnectMessage(clientId: string, reason?: string): DisconnectMessage;
    /**
     * Handle register message
     */
    handleRegisterMessage(message: RegisterMessage): ClientInfo;
    /**
     * Handle heartbeat message
     */
    handleHeartbeatMessage(message: HeartbeatMessage, client: ClientInfo): ClientInfo;
    /**
     * Handle disconnect message
     */
    handleDisconnectMessage(message: DisconnectMessage, client: ClientInfo): ClientInfo;
    /**
     * Serialize message to string
     */
    serializeMessage(message: RegistrationMessage): string;
}
