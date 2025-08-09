export declare enum RegistrationMessageType {
    REGISTER = "REGISTER",
    REGISTER_RESPONSE = "REGISTER_RESPONSE",
    HEARTBEAT = "HEARTBEAT",
    HEARTBEAT_RESPONSE = "HEARTBEAT_RESPONSE"
}
export declare enum RegistrationStatus {
    SUCCESS = "SUCCESS",
    ERROR = "ERROR"
}
export interface RegistrationCapabilities {
    supportedMethods: string[];
    supportedTransports: Array<'stdio' | 'http' | 'unix-socket'>;
    maxConcurrentTasks?: number;
    targetType?: 'claude' | 'cline';
    features?: {
        autoStart?: boolean;
        reconnect?: boolean;
        healthCheck?: boolean;
    };
}
export interface RegisterMessage {
    type: RegistrationMessageType.REGISTER;
    clientType: 'claude' | 'cline' | 'other';
    capabilities: RegistrationCapabilities;
    transport: 'stdio' | 'http' | 'unix-socket';
    clientId: string;
    socketPath?: string;
}
export interface HeartbeatMessage {
    type: RegistrationMessageType.HEARTBEAT;
    clientId: string;
}
export interface DisconnectMessage {
    type: 'DISCONNECT';
    clientId: string;
    reason?: string;
}
export type RegistrationMessage = RegisterMessage | HeartbeatMessage | DisconnectMessage | Record<string, any>;
export declare class RegistrationProtocol {
    createRegisterMessage(clientType: 'claude' | 'cline' | 'other', capabilities: RegistrationCapabilities, transport: 'stdio' | 'http' | 'unix-socket', clientId: string, socketPath?: string): RegisterMessage;
    createHeartbeatMessage(clientId: string): HeartbeatMessage;
    createDisconnectMessage(clientId: string, reason?: string): DisconnectMessage;
    parseMessage(message: string): RegistrationMessage | null;
}
