import { randomUUID } from 'crypto';
import { ConnectionState } from '../types.js';
import { Logger } from '../utils/logger.js';
/**
 * Registration message types
 */
export var RegistrationMessageType;
(function (RegistrationMessageType) {
    RegistrationMessageType["REGISTER"] = "register";
    RegistrationMessageType["REGISTER_RESPONSE"] = "register_response";
    RegistrationMessageType["HEARTBEAT"] = "heartbeat";
    RegistrationMessageType["HEARTBEAT_RESPONSE"] = "heartbeat_response";
    RegistrationMessageType["DISCONNECT"] = "disconnect";
})(RegistrationMessageType || (RegistrationMessageType = {}));
/**
 * Registration status
 */
export var RegistrationStatus;
(function (RegistrationStatus) {
    RegistrationStatus["SUCCESS"] = "success";
    RegistrationStatus["ERROR"] = "error";
})(RegistrationStatus || (RegistrationStatus = {}));
/**
 * Registration protocol handler
 */
export class RegistrationProtocol {
    constructor() {
        this.logger = new Logger({ prefix: 'RegistrationProtocol' });
    }
    /**
     * Parse registration message
     */
    parseMessage(message) {
        try {
            const parsed = JSON.parse(message);
            // Validate message
            if (!parsed.type || !parsed.timestamp) {
                this.logger.error('Invalid registration message:', message);
                return null;
            }
            return parsed;
        }
        catch (error) {
            this.logger.error('Failed to parse registration message:', error);
            return null;
        }
    }
    /**
     * Create register message
     */
    createRegisterMessage(clientType, capabilities, transport, clientId, socketPath) {
        return {
            type: RegistrationMessageType.REGISTER,
            timestamp: new Date().toISOString(),
            clientId,
            clientType,
            capabilities,
            transport,
            socketPath
        };
    }
    /**
     * Create register response message
     */
    createRegisterResponseMessage(status, clientId, error, serverCapabilities) {
        return {
            type: RegistrationMessageType.REGISTER_RESPONSE,
            timestamp: new Date().toISOString(),
            status,
            clientId,
            error,
            serverCapabilities
        };
    }
    /**
     * Create heartbeat message
     */
    createHeartbeatMessage(clientId) {
        return {
            type: RegistrationMessageType.HEARTBEAT,
            timestamp: new Date().toISOString(),
            clientId
        };
    }
    /**
     * Create heartbeat response message
     */
    createHeartbeatResponseMessage(status, error) {
        return {
            type: RegistrationMessageType.HEARTBEAT_RESPONSE,
            timestamp: new Date().toISOString(),
            status,
            error
        };
    }
    /**
     * Create disconnect message
     */
    createDisconnectMessage(clientId, reason) {
        return {
            type: RegistrationMessageType.DISCONNECT,
            timestamp: new Date().toISOString(),
            clientId,
            reason
        };
    }
    /**
     * Handle register message
     */
    handleRegisterMessage(message) {
        this.logger.info(`Handling register message for client type: ${message.clientType}`);
        // Generate client ID if not provided
        const clientId = message.clientId || `${message.clientType}-${randomUUID()}`;
        // Create client info
        const clientInfo = {
            id: clientId,
            type: message.clientType,
            transport: message.transport,
            connected: true,
            lastSeen: new Date(),
            state: ConnectionState.CONNECTED,
            capabilities: message.capabilities,
            socketPath: message.socketPath
        };
        return clientInfo;
    }
    /**
     * Handle heartbeat message
     */
    handleHeartbeatMessage(message, client) {
        this.logger.debug(`Handling heartbeat message for client: ${message.clientId}`);
        // Update last seen
        return {
            ...client,
            lastSeen: new Date()
        };
    }
    /**
     * Handle disconnect message
     */
    handleDisconnectMessage(message, client) {
        this.logger.info(`Handling disconnect message for client: ${message.clientId}, reason: ${message.reason || 'none'}`);
        // Update client state
        return {
            ...client,
            connected: false,
            state: ConnectionState.DISCONNECTED,
            lastSeen: new Date()
        };
    }
    /**
     * Serialize message to string
     */
    serializeMessage(message) {
        return JSON.stringify(message);
    }
}
//# sourceMappingURL=registrationProtocol.js.map