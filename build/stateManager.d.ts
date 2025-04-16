import { ClientInfo, TaskState, StateManagerConfig, ConnectionState } from './types.js';
export declare class StateManager {
    private clients;
    private tasks;
    private config;
    private cleanupInterval;
    private clientStorage;
    constructor(config: StateManagerConfig);
    /**
     * Initialize state manager
     * Loads persisted clients if enabled
     */
    initialize(): Promise<void>;
    /**
     * Register a new client connection
     */
    registerClient(clientInfo: ClientInfo): Promise<void>;
    /**
     * Get a specific client by ID
     */
    getClient(clientId: string): ClientInfo | undefined;
    /**
     * Update client's state
     */
    updateClientState(clientId: string, state: ConnectionState): Promise<void>;
    /**
     * Update client's information
     */
    updateClient(client: ClientInfo): Promise<void>;
    /**
     * Update client's last seen timestamp
     */
    updateClientLastSeen(clientId: string): void;
    /**
     * Mark a client as disconnected
     */
    disconnectClient(clientId: string): Promise<void>;
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
    /**
     * Recover client connections
     * Attempts to reconnect to clients that were previously connected
     */
    recoverConnections(): Promise<ClientInfo[]>;
}
