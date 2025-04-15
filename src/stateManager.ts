import { ClientInfo, TaskState, StateManagerConfig, ConnectionState } from './types.js';

export class StateManager {
  private clients: Map<string, ClientInfo>;
  private tasks: Map<string, TaskState>;
  private config: StateManagerConfig;
  private cleanupInterval: NodeJS.Timeout;

  constructor(config: StateManagerConfig) {
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
  public registerClient(clientInfo: ClientInfo): void {
    this.clients.set(clientInfo.id, {
      ...clientInfo,
      connected: true,
      lastSeen: new Date()
    });
  }

  /**
   * Get a specific client by ID
   */
  public getClient(clientId: string): ClientInfo | undefined {
    return this.clients.get(clientId);
  }

  /**
   * Update client's state
   */
  public updateClientState(clientId: string, state: ConnectionState): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.state = state;
      client.lastSeen = new Date();
    }
  }

  /**
   * Update client's information
   */
  public updateClient(client: ClientInfo): void {
    this.clients.set(client.id, {
      ...client,
      lastSeen: new Date()
    });
  }

  /**
   * Update client's last seen timestamp
   */
  public updateClientLastSeen(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.lastSeen = new Date();
    }
  }

  /**
   * Mark a client as disconnected
   */
  public disconnectClient(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      client.connected = false;
      client.state = ConnectionState.DISCONNECTED;
      client.lastSeen = new Date();
    }
  }

  /**
   * Get all connected clients of a specific type
   */
  public getConnectedClientsByType(type: 'claude' | 'cline' | 'other'): ClientInfo[] {
    return Array.from(this.clients.values())
      .filter(client => client.type === type && client.connected);
  }

  /**
   * Create a new task state
   */
  public createTask(taskId: string, clientId: string, maxAttempts: number): TaskState {
    const task: TaskState = {
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
  public updateTask(taskId: string, updates: Partial<TaskState>): TaskState | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

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
  public incrementTaskAttempts(taskId: string): TaskState | null {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const attempts = task.attempts + 1;
    const status: TaskState['status'] = attempts >= task.maxAttempts ? 'failed' : 'pending';
    
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
  public getTask(taskId: string): TaskState | null {
    return this.tasks.get(taskId) || null;
  }

  /**
   * Get all tasks for a client
   */
  public getClientTasks(clientId: string): TaskState[] {
    return Array.from(this.tasks.values())
      .filter(task => task.clientId === clientId);
  }

  /**
   * Cleanup expired tasks and disconnected clients
   */
  private cleanup(): void {
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
  public dispose(): void {
    clearInterval(this.cleanupInterval);
  }
}
