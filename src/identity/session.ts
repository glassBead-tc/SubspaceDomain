import { createHash } from 'crypto';
import { join } from 'path';
import { PersistentStorage } from '../storage/persistentStorage.js';
import {
  UserSession,
  IdentityError,
  IdentityErrorType,
  ValidationRules
} from './types.js';
import { UserManager } from './user.js';
import { ClientManager } from './client.js';

/**
 * Session manager options
 */
interface SessionManagerOptions {
  storage: PersistentStorage;
  userManager: UserManager;
  clientManager: ClientManager;
  validationRules?: ValidationRules;
  sessionDataPath?: string;
  sessionTimeout?: number;
  maxSessionsPerUser?: number;
}

/**
 * Session manager
 */
export class SessionManager {
  private storage: PersistentStorage;
  private userManager: UserManager;
  private clientManager: ClientManager;
  private validationRules: ValidationRules;
  private sessionDataPath: string;
  private sessionTimeout: number;
  private maxSessionsPerUser: number;
  private cleanupInterval?: NodeJS.Timeout;

  constructor(options: SessionManagerOptions) {
    this.storage = options.storage;
    this.userManager = options.userManager;
    this.clientManager = options.clientManager;
    this.validationRules = options.validationRules || {};
    this.sessionDataPath = options.sessionDataPath || 'sessions';
    this.sessionTimeout = options.sessionTimeout || 30 * 60 * 1000; // 30 minutes
    this.maxSessionsPerUser = options.maxSessionsPerUser || 5;
  }

  /**
   * Start session cleanup interval
   */
  public startCleanup(interval: number = 5 * 60 * 1000): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.cleanupInterval = setInterval(() => this.cleanupExpiredSessions(), interval);
  }

  /**
   * Stop session cleanup interval
   */
  public stopCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = undefined;
    }
  }

  /**
   * Create new session
   */
  public async createSession(
    userId: string,
    machineId: string,
    clientId: string
  ): Promise<UserSession> {
    try {
      // Verify user exists and has access to machine
      const user = await this.userManager.getUser(userId);
      if (!user.machineIds.includes(machineId)) {
        throw new IdentityError(
          IdentityErrorType.SESSION_INVALID,
          'User does not have access to this machine'
        );
      }

      // Verify client exists and belongs to user
      const client = await this.clientManager.getClient(clientId);
      if (client.components.userId !== userId) {
        throw new IdentityError(
          IdentityErrorType.SESSION_INVALID,
          'Client does not belong to user'
        );
      }

      // Check session limit
      const sessions = await this.getSessionsByUser(userId);
      if (sessions.length >= this.maxSessionsPerUser) {
        throw new IdentityError(
          IdentityErrorType.SESSION_INVALID,
          'Maximum number of sessions reached'
        );
      }

      // Generate session ID
      const id = await this.generateSessionId(userId, machineId, clientId);

      // Create session
      const session: UserSession = {
        id,
        userId,
        machineId,
        created: new Date(),
        lastActive: new Date(),
        expiresAt: new Date(Date.now() + this.sessionTimeout),
        clients: [clientId]
      };

      // Validate session
      if (!this.validateSession(session)) {
        throw new IdentityError(
          IdentityErrorType.SESSION_INVALID,
          'Invalid session data'
        );
      }

      // Store session
      await this.storage.write(
        this.getSessionPath(id),
        session
      );

      // Update client
      await this.clientManager.updateClient(clientId, {
        sessions: [...client.sessions, id]
      });

      return session;
    } catch (error) {
      if (error instanceof IdentityError) {
        throw error;
      }
      throw new IdentityError(
        IdentityErrorType.SESSION_INVALID,
        'Failed to create session',
        error
      );
    }
  }

  /**
   * Get session by ID
   */
  public async getSession(sessionId: string): Promise<UserSession> {
    try {
      const session = await this.storage.read<UserSession>(
        this.getSessionPath(sessionId)
      );

      if (!this.validateSession(session)) {
        throw new IdentityError(
          IdentityErrorType.SESSION_INVALID,
          'Invalid session data'
        );
      }

      // Check expiration
      if (new Date() > new Date(session.expiresAt)) {
        throw new IdentityError(
          IdentityErrorType.SESSION_EXPIRED,
          'Session expired'
        );
      }

      return session;
    } catch (error) {
      if (error instanceof IdentityError) {
        throw error;
      }
      throw new IdentityError(
        IdentityErrorType.SESSION_NOT_FOUND,
        'Session not found',
        error
      );
    }
  }

  /**
   * Get sessions by user ID
   */
  public async getSessionsByUser(userId: string): Promise<UserSession[]> {
    try {
      // Get user to verify it exists
      await this.userManager.getUser(userId);

      // List all session files
      const files = await this.storage.read<string[]>(this.sessionDataPath);

      // Load and filter sessions
      const sessions = await Promise.all(
        files
          .filter(file => file.endsWith('.json'))
          .map(file => this.storage.read<UserSession>(join(this.sessionDataPath, file)))
      );

      return sessions
        .filter(session => session.userId === userId)
        .filter(session => new Date() <= new Date(session.expiresAt));
    } catch (error) {
      if (error instanceof IdentityError) {
        throw error;
      }
      throw new IdentityError(
        IdentityErrorType.SESSION_NOT_FOUND,
        'Failed to get sessions',
        error
      );
    }
  }

  /**
   * Update session activity
   */
  public async updateActivity(sessionId: string): Promise<UserSession> {
    try {
      const session = await this.getSession(sessionId);

      // Update timestamps
      const updated: UserSession = {
        ...session,
        lastActive: new Date(),
        expiresAt: new Date(Date.now() + this.sessionTimeout)
      };

      // Store updated session
      await this.storage.write(
        this.getSessionPath(sessionId),
        updated
      );

      return updated;
    } catch (error) {
      if (error instanceof IdentityError) {
        throw error;
      }
      throw new IdentityError(
        IdentityErrorType.SESSION_INVALID,
        'Failed to update session',
        error
      );
    }
  }

  /**
   * End session
   */
  public async endSession(sessionId: string): Promise<void> {
    try {
      const session = await this.getSession(sessionId);

      // Remove session from clients
      await Promise.all(
        session.clients.map(async clientId => {
          const client = await this.clientManager.getClient(clientId);
          await this.clientManager.updateClient(clientId, {
            sessions: client.sessions.filter(id => id !== sessionId)
          });
        })
      );

      // Delete session
      await this.storage.delete(this.getSessionPath(sessionId));
    } catch (error) {
      if (error instanceof IdentityError) {
        throw error;
      }
      throw new IdentityError(
        IdentityErrorType.SESSION_NOT_FOUND,
        'Failed to end session',
        error
      );
    }
  }

  /**
   * Clean up expired sessions
   */
  private async cleanupExpiredSessions(): Promise<void> {
    try {
      // List all session files
      const files = await this.storage.read<string[]>(this.sessionDataPath);

      // Load all sessions
      const sessions = await Promise.all(
        files
          .filter(file => file.endsWith('.json'))
          .map(file => this.storage.read<UserSession>(join(this.sessionDataPath, file)))
      );

      // End expired sessions
      await Promise.all(
        sessions
          .filter(session => new Date() > new Date(session.expiresAt))
          .map(session => this.endSession(session.id))
      );
    } catch (error) {
      // Log cleanup errors but don't throw
      console.error('Session cleanup failed:', error);
    }
  }

  /**
   * Generate session ID
   */
  private async generateSessionId(
    userId: string,
    machineId: string,
    clientId: string
  ): Promise<string> {
    // Create hash from components and timestamp
    const hash = createHash('sha256')
      .update(`${userId}:${machineId}:${clientId}:${Date.now()}`)
      .digest('hex');

    // Use first 32 characters as session ID
    return hash.slice(0, 32);
  }

  /**
   * Get session file path
   */
  private getSessionPath(sessionId: string): string {
    return join(this.sessionDataPath, `${sessionId}.json`);
  }

  /**
   * Validate session data
   */
  private validateSession(session: UserSession): boolean {
    // Basic structure validation
    if (!session || typeof session !== 'object') return false;
    if (!session.id || typeof session.id !== 'string') return false;
    if (!session.userId || typeof session.userId !== 'string') return false;
    if (!session.machineId || typeof session.machineId !== 'string') return false;
    if (!(session.created instanceof Date)) return false;
    if (!(session.lastActive instanceof Date)) return false;
    if (!(session.expiresAt instanceof Date)) return false;
    if (!Array.isArray(session.clients)) return false;

    // ID format validation
    if (this.validationRules.sessionId?.pattern) {
      if (!this.validationRules.sessionId.pattern.test(session.id)) {
        return false;
      }
    }

    // Client validation
    for (const clientId of session.clients) {
      if (typeof clientId !== 'string') return false;
    }

    return true;
  }
}
