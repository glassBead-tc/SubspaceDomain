#!/usr/bin/env node
import { randomUUID } from 'crypto';
import { createConnection } from 'net';
import { RegistrationProtocol, RegistrationMessageType, RegistrationStatus } from '../discovery/registrationProtocol.js';
/**
 * Test client for MCP Bridge Server
 * Simulates a client connecting to the bridge server
 */
class TestClient {
    constructor(options) {
        this.socket = null;
        this.connected = false;
        this.clientType = options.clientType;
        this.socketPath = options.socketPath;
        this.clientId = options.clientId || `${this.clientType}-${randomUUID()}`;
        this.protocol = new RegistrationProtocol();
    }
    /**
     * Connect to the bridge server
     */
    async connect() {
        return new Promise((resolve, reject) => {
            console.log(`Connecting to bridge server at ${this.socketPath}...`);
            this.socket = createConnection(this.socketPath);
            this.socket.on('connect', () => {
                console.log('Connected to bridge server');
                this.connected = true;
                // Send registration message
                this.sendRegistration()
                    .then(() => resolve())
                    .catch(reject);
            });
            this.socket.on('data', (data) => {
                this.handleMessage(data.toString());
            });
            this.socket.on('error', (error) => {
                console.error('Socket error:', error);
                reject(error);
            });
            this.socket.on('close', () => {
                console.log('Connection closed');
                this.connected = false;
            });
        });
    }
    /**
     * Send registration message
     */
    async sendRegistration() {
        if (!this.socket || !this.connected) {
            throw new Error('Not connected to bridge server');
        }
        console.log(`Registering as ${this.clientType} client with ID ${this.clientId}`);
        // Create registration message
        const message = this.protocol.createRegisterMessage(this.clientType, {
            supportedMethods: ['tools/call', 'tools/discover_client'],
            supportedTransports: ['unix-socket'],
            maxConcurrentTasks: 5,
            targetType: this.clientType,
            features: {
                autoStart: true,
                reconnect: true,
                healthCheck: true
            }
        }, 'unix-socket', this.clientId);
        // Send message
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket not initialized'));
                return;
            }
            this.socket.write(JSON.stringify(message) + '\n', (error) => {
                if (error) {
                    reject(error);
                }
                else {
                    console.log('Registration message sent');
                    resolve();
                }
            });
        });
    }
    /**
     * Handle incoming message
     */
    handleMessage(message) {
        try {
            console.log('Received message:', message);
            // Parse message
            const parsedMessage = this.protocol.parseMessage(message);
            if (!parsedMessage) {
                console.error('Failed to parse message');
                return;
            }
            // Handle registration response
            if (parsedMessage.type === RegistrationMessageType.REGISTER_RESPONSE) {
                const responseMsg = parsedMessage; // Type assertion to access properties
                if (responseMsg.status === RegistrationStatus.SUCCESS) {
                    console.log(`Registration successful, assigned client ID: ${responseMsg.clientId}`);
                    this.clientId = responseMsg.clientId;
                    // Start sending heartbeats
                    this.startHeartbeats();
                }
                else {
                    console.error(`Registration failed: ${responseMsg.error}`);
                }
            }
            // Handle heartbeat response
            if (parsedMessage.type === RegistrationMessageType.HEARTBEAT_RESPONSE) {
                const responseMsg = parsedMessage; // Type assertion to access properties
                if (responseMsg.status === RegistrationStatus.SUCCESS) {
                    console.log('Heartbeat acknowledged');
                }
                else {
                    console.error(`Heartbeat failed: ${responseMsg.error}`);
                }
            }
        }
        catch (error) {
            console.error('Error handling message:', error);
        }
    }
    /**
     * Start sending heartbeats
     */
    startHeartbeats() {
        setInterval(() => {
            if (this.connected) {
                this.sendHeartbeat().catch(console.error);
            }
        }, 30000); // Every 30 seconds
    }
    /**
     * Send heartbeat message
     */
    async sendHeartbeat() {
        if (!this.socket || !this.connected) {
            return;
        }
        console.log('Sending heartbeat...');
        // Create heartbeat message
        const message = this.protocol.createHeartbeatMessage(this.clientId);
        // Send message
        return new Promise((resolve, reject) => {
            if (!this.socket) {
                reject(new Error('Socket not initialized'));
                return;
            }
            this.socket.write(JSON.stringify(message) + '\n', (error) => {
                if (error) {
                    reject(error);
                }
                else {
                    console.log('Heartbeat sent');
                    resolve();
                }
            });
        });
    }
    /**
     * Disconnect from the bridge server
     */
    async disconnect() {
        if (!this.socket || !this.connected) {
            return;
        }
        console.log('Disconnecting from bridge server...');
        // Create disconnect message
        const message = this.protocol.createDisconnectMessage(this.clientId, 'Client initiated disconnect');
        // Send message
        return new Promise((resolve) => {
            if (!this.socket) {
                resolve();
                return;
            }
            this.socket.write(JSON.stringify(message) + '\n', () => {
                this.socket?.end(() => {
                    this.socket = null;
                    this.connected = false;
                    console.log('Disconnected from bridge server');
                    resolve();
                });
            });
        });
    }
}
/**
 * Main function
 */
async function main() {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const clientType = args[0] || 'claude';
    const socketPath = args[1] || '/tmp/mcp-bridge.sock';
    // Create test client
    const client = new TestClient({
        clientType,
        socketPath
    });
    // Handle process termination
    process.on('SIGINT', async () => {
        console.log('Received SIGINT, shutting down...');
        await client.disconnect();
        process.exit(0);
    });
    // Connect to bridge server
    try {
        await client.connect();
        console.log('Test client running, press Ctrl+C to exit');
    }
    catch (error) {
        console.error('Failed to connect:', error);
        process.exit(1);
    }
}
// Run main function
main().catch(console.error);
//# sourceMappingURL=test-client.js.map