/**
 * Registration system types for MCP Bridge Server
 */
/**
 * Registration state
 */
export declare enum RegistrationState {
    PENDING = "PENDING",
    APPROVED = "APPROVED",
    REJECTED = "REJECTED",
    EXPIRED = "EXPIRED"
}
/**
 * Registration request
 */
export interface RegistrationRequest {
    clientType: string;
    machineId: string;
    capabilities: {
        tools?: string[];
        resources?: string[];
    };
    metadata?: {
        version?: string;
        platform?: string;
        hostname?: string;
        [key: string]: any;
    };
    timestamp: Date;
}
/**
 * Registration response
 */
export interface RegistrationResponse {
    registrationId: string;
    state: RegistrationState;
    clientId?: string;
    userId?: string;
    expiresAt: Date;
    message?: string;
}
/**
 * Registration record
 */
export interface RegistrationRecord {
    id: string;
    request: RegistrationRequest;
    response: RegistrationResponse;
    created: Date;
    lastUpdated: Date;
    attempts: number;
    history: {
        timestamp: Date;
        state: RegistrationState;
        message?: string;
    }[];
}
/**
 * Registration error types
 */
export declare enum RegistrationErrorType {
    REQUEST_INVALID = "REQUEST_INVALID",
    REQUEST_EXPIRED = "REQUEST_EXPIRED",
    REQUEST_NOT_FOUND = "REQUEST_NOT_FOUND",
    CLIENT_EXISTS = "CLIENT_EXISTS",
    PERSISTENCE_FAILED = "PERSISTENCE_FAILED",
    MIGRATION_FAILED = "MIGRATION_FAILED",
    INVALID_CONFIG = "INVALID_CONFIG"
}
/**
 * Registration error
 */
export declare class RegistrationError extends Error {
    type: RegistrationErrorType;
    metadata?: any | undefined;
    constructor(type: RegistrationErrorType, message: string, metadata?: any | undefined);
}
/**
 * Registration hook
 */
export interface RegistrationHook {
    onRequest?: (request: RegistrationRequest) => Promise<void>;
    onApprove?: (record: RegistrationRecord) => Promise<void>;
    onReject?: (record: RegistrationRecord) => Promise<void>;
    onExpire?: (record: RegistrationRecord) => Promise<void>;
}
/**
 * Registration manager configuration
 */
export interface RegistrationConfig {
    enabled: boolean;
    autoApprove?: {
        enabled: boolean;
        rules?: {
            clientTypes?: string[];
            machineIds?: string[];
            capabilities?: {
                required?: string[];
                excluded?: string[];
            };
        };
    };
    expiration?: {
        pendingTimeout: number;
        approvedTimeout: number;
    };
    persistence?: {
        enabled: boolean;
        storage: {
            type: 'file' | 'database';
            options?: any;
        };
    };
    hooks?: RegistrationHook[];
    maxAttempts?: number;
}
/**
 * Registration storage interface
 */
export interface RegistrationStorage {
    save(record: RegistrationRecord): Promise<void>;
    get(id: string): Promise<RegistrationRecord | null>;
    list(): Promise<RegistrationRecord[]>;
    delete(id: string): Promise<void>;
    cleanup(): Promise<void>;
}
/**
 * Registration event types
 */
export declare enum RegistrationEventType {
    REQUEST_RECEIVED = "REQUEST_RECEIVED",
    REQUEST_APPROVED = "REQUEST_APPROVED",
    REQUEST_REJECTED = "REQUEST_REJECTED",
    REQUEST_EXPIRED = "REQUEST_EXPIRED",
    CLIENT_CREATED = "CLIENT_CREATED",
    PERSISTENCE_ERROR = "PERSISTENCE_ERROR"
}
/**
 * Registration event
 */
export interface RegistrationEvent {
    type: RegistrationEventType;
    timestamp: Date;
    registrationId: string;
    data: any;
}
