export class StateManager {
    clients;
    tasks;
    config;
    cleanupInterval;
    constructor(config) {
        this.clients = new Map();
        this.tasks = new Map();
        this.config = config;
        // Start cleanup interval
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, config.cleanupIntervalMs);
    }
    /**
     * Register a new client connection
     */
    registerClient(clientInfo) {
        this.clients.set(clientInfo.id, {
            ...clientInfo,
            connected: true,
            lastSeen: new Date()
        });
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
    disconnectClient(clientId) {
        const client = this.clients.get(clientId);
        if (client) {
            client.connected = false;
            client.lastSeen = new Date();
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
    cleanup() {
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
            }
        }
    }
    /**
     * Stop the cleanup interval
     */
    dispose() {
        clearInterval(this.cleanupInterval);
    }
}
//# sourceMappingURL=stateManager.js.map