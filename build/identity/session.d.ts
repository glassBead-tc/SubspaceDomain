import { PersistentStorage } from '../storage/persistentStorage.js';
import { UserSession, ValidationRules } from './types.js';
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
export declare class SessionManager {
    private storage;
    private userManager;
    private clientManager;
    private validationRules;
    private sessionDataPath;
    private sessionTimeout;
    private maxSessionsPerUser;
    private cleanupInterval?;
    constructor(options: SessionManagerOptions);
    /**
     * Start session cleanup interval
     */
    startCleanup(interval?: number): void;
    /**
     * Stop session cleanup interval
     */
    stopCleanup(): void;
    /**
     * Create new session
     */
    createSession(userId: string, machineId: string, clientId: string): Promise<UserSession>;
    /**
     * Get session by ID
     */
    getSession(sessionId: string): Promise<UserSession>;
    /**
     * Get sessions by user ID
     */
    getSessionsByUser(userId: string): Promise<UserSession[]>;
    /**
     * Update session activity
     */
    updateActivity(sessionId: string): Promise<UserSession>;
    /**
     * End session
     */
    endSession(sessionId: string): Promise<void>;
    /**
     * Clean up expired sessions
     */
    private cleanupExpiredSessions;
    /**
     * Generate session ID
     */
    private generateSessionId;
    /**
     * Get session file path
     */
    private getSessionPath;
    /**
     * Validate session data
     */
    private validateSession;
}
export {};
