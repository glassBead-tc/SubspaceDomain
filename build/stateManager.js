import { ConnectionState } from './types.js';
import { ClientStorage } from './storage/clientStorage.js';
import { join } from 'path';
export class StateManager {
    constructor(config) {
        this.clientStorage = null;
        this.clients = new Map();
        this.tasks = new Map();
        this.config = config;
        // Initialize client storage if persistence is enabled
        if (config.persistence?.enabled) {
            const storageDir = config.persistence.storageDir || join(process.cwd(), 'data', 'clients');
            this.clientStorage = new ClientStorage({ storageDir });
        }
        // Start cleanup interval
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, config.cleanupIntervalMs);
    }
    /**
     * Initialize state manager
     * Loads persisted clients if enabled
     */
    async initialize() {
        // Initialize client storage
        if (this.clientStorage) {
            try {
                await this.clientStorage.initialize();
                // Load persisted clients
                const clients = await this.clientStorage.listClients();
                for (const client of clients) {
                    // Only register clients that were connected
                    if (client.connected) {
                        // Mark as disconnected since we're just starting up
                        client.connected = false;
                        client.state = ConnectionState.DISCONNECTED;
                        this.clients.set(client.id, client);
                    }
                }
                console.log(`Loaded ${clients.length} clients from storage`);
            }
            catch (error) {
                console.error('Failed to initialize client storage:', error);
            }
        }
    }
    /**
     * Register a new client connection
     */
    async registerClient(clientInfo) {
        const client = {
            ...clientInfo,
            connected: true,
            lastSeen: new Date()
        };
        this.clients.set(client.id, client);
        // Persist client if storage is enabled
        if (this.clientStorage) {
            try {
                await this.clientStorage.saveClient(client);
            }
            catch (error) {
                console.error(`Failed to persist client ${client.id}:`, error);
            }
        }
    }
    /**
     * Get a specific client by ID
     */
    getClient(clientId) {
        return this.clients.get(clientId);
    }
    /**
     * Update client's state
     */
    async updateClientState(clientId, state) {
        const client = this.clients.get(clientId);
        if (client) {
            client.state = state;
            client.lastSeen = new Date();
            // Persist client if storage is enabled
            if (this.clientStorage) {
                try {
                    await this.clientStorage.saveClient(client);
                }
                catch (error) {
                    console.error(`Failed to persist client ${client.id} state:`, error);
                }
            }
        }
    }
    /**
     * Update client's information
     */
    async updateClient(client) {
        const updatedClient = {
            ...client,
            lastSeen: new Date()
        };
        this.clients.set(updatedClient.id, updatedClient);
        // Persist client if storage is enabled
        if (this.clientStorage) {
            try {
                await this.clientStorage.saveClient(updatedClient);
            }
            catch (error) {
                console.error(`Failed to persist client ${updatedClient.id} update:`, error);
            }
        }
    }
    /**
     * Update client's last seen timestamp
     */
    updateClientLastSeen(clientId) {
        const client = this.clients.get(clientId);
        if (client) {
            client.lastSeen = new Date();
        }
    }
    /**
     * Mark a client as disconnected
     */
    async disconnectClient(clientId) {
        const client = this.clients.get(clientId);
        if (client) {
            client.connected = false;
            client.state = ConnectionState.DISCONNECTED;
            client.lastSeen = new Date();
            // Persist client if storage is enabled
            if (this.clientStorage) {
                try {
                    await this.clientStorage.saveClient(client);
                }
                catch (error) {
                    console.error(`Failed to persist client ${client.id} disconnection:`, error);
                }
            }
        }
    }
    /**
     * Get all connected clients of a specific type
     */
    getConnectedClientsByType(type) {
        return Array.from(this.clients.values())
            .filter(client => client.type === type && client.connected);
    }
    /**
     * Create a new task state
     */
    createTask(taskId, clientId, maxAttempts) {
        const task = {
            id: taskId,
            clientId,
            status: 'pending',
            attempts: 0,
            maxAttempts,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.tasks.set(taskId, task);
        return task;
    }
    /**
     * Update task state
     */
    updateTask(taskId, updates) {
        const task = this.tasks.get(taskId);
        if (!task)
            return null;
        const updatedTask = {
            ...task,
            ...updates,
            updatedAt: new Date()
        };
        this.tasks.set(taskId, updatedTask);
        return updatedTask;
    }
    /**
     * Increment task attempts and update status
     */
    incrementTaskAttempts(taskId) {
        const task = this.tasks.get(taskId);
        if (!task)
            return null;
        const attempts = task.attempts + 1;
        const status = attempts >= task.maxAttempts ? 'failed' : 'pending';
        const updatedTask = {
            ...task,
            attempts,
            status,
            updatedAt: new Date()
        };
        this.tasks.set(taskId, updatedTask);
        return updatedTask;
    }
    /**
     * Get task state
     */
    getTask(taskId) {
        return this.tasks.get(taskId) || null;
    }
    /**
     * Get all tasks for a client
     */
    getClientTasks(clientId) {
        return Array.from(this.tasks.values())
            .filter(task => task.clientId === clientId);
    }
    /**
     * Cleanup expired tasks and disconnected clients
     */
    async cleanup() {
        const now = new Date().getTime();
        // Cleanup expired tasks
        for (const [taskId, task] of this.tasks.entries()) {
            if (now - task.updatedAt.getTime() > this.config.taskExpirationMs) {
                this.tasks.delete(taskId);
            }
        }
        // Cleanup disconnected clients
        for (const [clientId, client] of this.clients.entries()) {
            if (!client.connected &&
                now - client.lastSeen.getTime() > this.config.taskExpirationMs) {
                this.clients.delete(clientId);
                // Remove from storage if persistence is enabled
                if (this.clientStorage) {
                    try {
                        await this.clientStorage.deleteClient(clientId);
                    }
                    catch (error) {
                        console.error(`Failed to delete client ${clientId} from storage:`, error);
                    }
                }
            }
        }
    }
    /**
     * Stop the cleanup interval
     */
    dispose() {
        clearInterval(this.cleanupInterval);
    }
    /**
     * Recover client connections
     * Attempts to reconnect to clients that were previously connected
     */
    async recoverConnections() {
        if (!this.clientStorage) {
            return [];
        }
        try {
            // Get all clients that were previously connected
            const clients = await this.clientStorage.listClients();
            const recoveredClients = [];
            for (const client of clients) {
                // Skip clients that are already connected
                if (this.clients.has(client.id) && this.clients.get(client.id).connected) {
                    continue;
                }
                // Try to reconnect based on transport type
                if (client.transport === 'unix-socket' && client.socketPath) {
                    // For unix socket clients, we just mark them as reconnectable
                    // The actual reconnection will be handled by the transport layer
                    client.connected = false;
                    client.state = ConnectionState.DISCOVERING;
                    this.clients.set(client.id, client);
                    recoveredClients.push(client);
                }
            }
            return recoveredClients;
        }
        catch (error) {
            console.error('Failed to recover client connections:', error);
            return [];
        }
    }
}
//# sourceMappingURL=stateManager.js.map