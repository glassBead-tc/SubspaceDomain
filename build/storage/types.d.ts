/**
 * Storage system types for MCP Bridge Server
 */
/**
 * Storage operation result
 */
export interface StorageResult<T> {
    success: boolean;
    data?: T;
    error?: string;
    timestamp: Date;
}
/**
 * Storage metadata
 */
export interface StorageMetadata {
    version: string;
    lastModified: Date;
    checksum: string;
}
/**
 * Storage options
 */
export interface StorageOptions {
    directory: string;
    encryption?: {
        enabled: boolean;
        algorithm?: string;
        keyFile?: string;
    };
    atomicWrites: boolean;
    backupEnabled: boolean;
    maxBackups?: number;
}
/**
 * Migration definition
 */
export interface Migration {
    version: string;
    description: string;
    up: (data: any) => Promise<any>;
    down: (data: any) => Promise<any>;
}
/**
 * Client registration data
 */
export interface StoredClientData {
    id: string;
    userId: string;
    machineId: string;
    type: 'claude' | 'cline' | 'other';
    registeredAt: Date;
    lastSeen: Date;
    capabilities: {
        supportedMethods: string[];
        supportedTransports: ('stdio' | 'http')[];
        features?: {
            autoStart?: boolean;
            reconnect?: boolean;
            healthCheck?: boolean;
        };
    };
    settings: {
        preferredTransport: 'stdio' | 'http';
        startupTimeout: number;
        healthCheckInterval: number;
    };
}
/**
 * User data
 */
export interface StoredUserData {
    id: string;
    machineIds: {
        [machineId: string]: {
            registeredAt: Date;
            clients: {
                [clientId: string]: StoredClientData;
            };
        };
    };
    preferences: {
        defaultClientType?: 'claude' | 'cline';
        autoStartClients?: boolean;
    };
}
/**
 * Complete storage data structure
 */
export interface StorageData {
    version: string;
    metadata: StorageMetadata;
    data: any;
}
export interface StorageRoot {
    version: string;
    metadata: StorageMetadata;
    users: {
        [userId: string]: StoredUserData;
    };
}
/**
 * Storage events
 */
export declare enum StorageEventType {
    READ = "read",
    WRITE = "write",
    UPDATE = "update",
    DELETE = "delete",
    MIGRATE = "migrate",
    ERROR = "error"
}
export interface StorageEvent {
    type: StorageEventType;
    path: string;
    timestamp: Date;
    metadata?: StorageMetadata;
    error?: string;
}
/**
 * Storage error types
 */
export declare enum StorageErrorType {
    FILE_NOT_FOUND = "FILE_NOT_FOUND",
    PERMISSION_DENIED = "PERMISSION_DENIED",
    INVALID_DATA = "INVALID_DATA",
    ENCRYPTION_ERROR = "ENCRYPTION_ERROR",
    MIGRATION_ERROR = "MIGRATION_ERROR",
    VERSION_MISMATCH = "VERSION_MISMATCH",
    CHECKSUM_MISMATCH = "CHECKSUM_MISMATCH",
    ATOMIC_WRITE_FAILED = "ATOMIC_WRITE_FAILED",
    BACKUP_FAILED = "BACKUP_FAILED"
}
export declare class StorageError extends Error {
    type: StorageErrorType;
    path?: string | undefined;
    metadata?: any | undefined;
    constructor(type: StorageErrorType, message: string, path?: string | undefined, metadata?: any | undefined);
}
/**
 * Storage validation
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
}
export interface StorageValidator {
    validateData(data: any): ValidationResult;
    validateMetadata(metadata: StorageMetadata): ValidationResult;
    validatePath(path: string): ValidationResult;
}
/**
 * Storage encryption
 */
export interface EncryptionConfig {
    algorithm: string;
    keySize: number;
    ivSize: number;
    iterations: number;
}
export interface EncryptedData {
    iv: Buffer;
    data: Buffer;
    tag: Buffer;
}
/**
 * Storage backup
 */
export interface BackupConfig {
    enabled: boolean;
    maxBackups: number;
    backupDir: string;
    compressionEnabled: boolean;
}
export interface BackupMetadata extends StorageMetadata {
    backupId: string;
    originalPath: string;
    compressed: boolean;
}
