/**
 * Identity system types for MCP Bridge Server
 */
/**
 * Machine ID provider interface
 */
export interface MachineIdProvider {
    /**
     * Get machine ID
     */
    getId(): Promise<string>;
    /**
     * Validate machine ID
     */
    validate(id: string): boolean;
    /**
     * Get cached machine ID
     */
    getCached(): string | null;
    /**
     * Clear cached machine ID
     */
    clearCache(): void;
}
/**
 * Machine ID options
 */
export interface MachineIdOptions {
    cacheFile?: string;
    fallbackMethods?: string[];
    validationRules?: {
        minLength?: number;
        maxLength?: number;
        pattern?: RegExp;
    };
}
/**
 * User identity
 */
export interface UserIdentity {
    id: string;
    machineIds: string[];
    preferences: UserPreferences;
    created: Date;
    lastSeen: Date;
    sessions: UserSession[];
}
/**
 * User preferences
 */
export interface UserPreferences {
    defaultClientType?: 'claude' | 'cline';
    autoStartClients?: boolean;
    clientSettings?: {
        [clientType: string]: {
            startupTimeout?: number;
            healthCheckInterval?: number;
            maxRetries?: number;
        };
    };
}
/**
 * User session
 */
export interface UserSession {
    id: string;
    userId: string;
    machineId: string;
    created: Date;
    lastActive: Date;
    expiresAt: Date;
    clients: string[];
}
/**
 * Client identity components
 */
export interface ClientIdComponents {
    userId: string;
    machineId: string;
    clientType: string;
    instance?: number;
}
/**
 * Client identity
 */
export interface ClientIdentity {
    id: string;
    components: ClientIdComponents;
    created: Date;
    lastSeen: Date;
    sessions: string[];
}
/**
 * Identity error types
 */
export declare enum IdentityErrorType {
    MACHINE_ID_NOT_FOUND = "MACHINE_ID_NOT_FOUND",
    MACHINE_ID_INVALID = "MACHINE_ID_INVALID",
    USER_NOT_FOUND = "USER_NOT_FOUND",
    USER_INVALID = "USER_INVALID",
    CLIENT_NOT_FOUND = "CLIENT_NOT_FOUND",
    CLIENT_INVALID = "CLIENT_INVALID",
    SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
    SESSION_EXPIRED = "SESSION_EXPIRED",
    SESSION_INVALID = "SESSION_INVALID"
}
/**
 * Identity error
 */
export declare class IdentityError extends Error {
    type: IdentityErrorType;
    metadata?: any | undefined;
    constructor(type: IdentityErrorType, message: string, metadata?: any | undefined);
}
/**
 * Identity validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
/**
 * Identity validation rules
 */
export interface ValidationRules {
    machineId?: {
        minLength?: number;
        maxLength?: number;
        pattern?: RegExp;
    };
    userId?: {
        minLength?: number;
        maxLength?: number;
        pattern?: RegExp;
    };
    clientId?: {
        minLength?: number;
        maxLength?: number;
        pattern?: RegExp;
    };
    sessionId?: {
        minLength?: number;
        maxLength?: number;
        pattern?: RegExp;
    };
}
/**
 * Identity manager configuration
 */
export interface IdentityManagerConfig {
    storage: {
        directory: string;
        cacheEnabled?: boolean;
        cacheDirectory?: string;
    };
    validation?: ValidationRules;
    session?: {
        timeoutMs?: number;
        maxSessions?: number;
        cleanupIntervalMs?: number;
    };
}
/**
 * Identity event types
 */
export declare enum IdentityEventType {
    MACHINE_ID_CHANGED = "MACHINE_ID_CHANGED",
    USER_CREATED = "USER_CREATED",
    USER_UPDATED = "USER_UPDATED",
    CLIENT_REGISTERED = "CLIENT_REGISTERED",
    CLIENT_UPDATED = "CLIENT_UPDATED",
    SESSION_CREATED = "SESSION_CREATED",
    SESSION_EXPIRED = "SESSION_EXPIRED"
}
/**
 * Identity event
 */
export interface IdentityEvent {
    type: IdentityEventType;
    timestamp: Date;
    data: any;
}
