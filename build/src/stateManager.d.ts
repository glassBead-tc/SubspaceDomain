import { ClientInfo, TaskState, StateManagerConfig } from './types.js';
export declare class StateManager {
    private clients;
    private tasks;
    private config;
    private cleanupInterval;
    constructor(config: StateManagerConfig);
    /**
     * Register a new client connection
     */
    registerClient(clientInfo: ClientInfo): void;
    /**
     * Update client's last seen timestamp
     */
    updateClientLastSeen(clientId: string): void;
    /**
     * Mark a client as disconnected
     */
    disconnectClient(clientId: string): void;
    /**
     * Get all connected clients of a specific type
     */
    getConnectedClientsByType(type: 'claude' | 'cline' | 'other'): ClientInfo[];
    /**
     * Create a new task state
     */
    createTask(taskId: string, clientId: string, maxAttempts: number): TaskState;
    /**
     * Update task state
     */
    updateTask(taskId: string, updates: Partial<TaskState>): TaskState | null;
    /**
     * Increment task attempts and update status
     */
    incrementTaskAttempts(taskId: string): TaskState | null;
    /**
     * Get task state
     */
    getTask(taskId: string): TaskState | null;
    /**
     * Get all tasks for a client
     */
    getClientTasks(clientId: string): TaskState[];
    /**
     * Cleanup expired tasks and disconnected clients
     */
    private cleanup;
    /**
     * Stop the cleanup interval
     */
    dispose(): void;
}
