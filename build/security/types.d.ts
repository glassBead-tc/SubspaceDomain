/**
 * Security system types for MCP Bridge Server
 */
/**
 * Encryption algorithm options
 */
export declare enum EncryptionAlgorithm {
    AES_256_GCM = "aes-256-gcm",
    AES_256_CBC = "aes-256-cbc",
    CHACHA20_POLY1305 = "chacha20-poly1305"
}
/**
 * Key derivation function options
 */
export declare enum KeyDerivationFunction {
    PBKDF2 = "pbkdf2",
    ARGON2 = "argon2",
    SCRYPT = "scrypt"
}
/**
 * Encryption configuration
 */
export interface EncryptionConfig {
    enabled: boolean;
    algorithm: EncryptionAlgorithm;
    keyDerivation: {
        function: KeyDerivationFunction;
        iterations?: number;
        memory?: number;
        parallelism?: number;
        saltLength?: number;
    };
    keyLength: number;
    ivLength: number;
    tagLength?: number;
}
/**
 * Encrypted data format
 */
export interface EncryptedData {
    algorithm: EncryptionAlgorithm;
    iv: string;
    tag?: string;
    salt: string;
    data: string;
    keyDerivation: {
        function: KeyDerivationFunction;
        iterations?: number;
        memory?: number;
        parallelism?: number;
    };
}
/**
 * Security error types
 */
export declare enum SecurityErrorType {
    ENCRYPTION_FAILED = "ENCRYPTION_FAILED",
    DECRYPTION_FAILED = "DECRYPTION_FAILED",
    INVALID_KEY = "INVALID_KEY",
    INVALID_CONFIG = "INVALID_CONFIG",
    AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
    ACCESS_DENIED = "ACCESS_DENIED",
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
    AUDIT_FAILED = "AUDIT_FAILED",
    RATE_LIMIT_FAILED = "RATE_LIMIT_FAILED"
}
/**
 * Security error
 */
export declare class SecurityError extends Error {
    type: SecurityErrorType;
    metadata?: any | undefined;
    constructor(type: SecurityErrorType, message: string, metadata?: any | undefined);
}
/**
 * Access control level
 */
export declare enum AccessLevel {
    NONE = 0,
    READ = 1,
    WRITE = 2,
    ADMIN = 3
}
/**
 * Access control rule
 */
export interface AccessRule {
    userId?: string;
    clientId?: string;
    machineId?: string;
    level: AccessLevel;
    resources?: string[];
    conditions?: {
        timeRestriction?: {
            start?: string;
            end?: string;
            days?: number[];
        };
        ipRestriction?: string[];
        locationRestriction?: string[];
    };
}
/**
 * Rate limit rule
 */
export interface RateLimitRule {
    resource: string;
    window: number;
    limit: number;
    userId?: string;
    clientId?: string;
    machineId?: string;
}
/**
 * Rate limit state
 */
export interface RateLimitState {
    resource: string;
    userId?: string;
    clientId?: string;
    machineId?: string;
    count: number;
    window: number;
    resetAt: Date;
}
/**
 * Audit log entry
 */
export interface AuditLogEntry {
    timestamp: Date;
    action: string;
    userId?: string;
    clientId?: string;
    machineId?: string;
    resource?: string;
    status: 'success' | 'failure';
    details?: any;
    metadata?: {
        ip?: string;
        userAgent?: string;
        location?: string;
        sessionId?: string;
    };
}
/**
 * Security event types
 */
export declare enum SecurityEventType {
    ENCRYPTION_KEY_ROTATED = "ENCRYPTION_KEY_ROTATED",
    ACCESS_RULE_UPDATED = "ACCESS_RULE_UPDATED",
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED",
    AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
    SUSPICIOUS_ACTIVITY = "SUSPICIOUS_ACTIVITY"
}
/**
 * Security event
 */
export interface SecurityEvent {
    type: SecurityEventType;
    timestamp: Date;
    data: any;
}
/**
 * Security manager configuration
 */
export interface SecurityManagerConfig {
    encryption: EncryptionConfig;
    accessControl?: {
        enabled: boolean;
        rules: AccessRule[];
        defaultLevel: AccessLevel;
    };
    rateLimiting?: {
        enabled: boolean;
        rules: RateLimitRule[];
        storage: {
            type: 'memory' | 'redis';
            options?: any;
        };
    };
    auditing?: {
        enabled: boolean;
        storage: {
            type: 'file' | 'database';
            options?: any;
        };
        retention?: {
            days: number;
            maxSize?: number;
        };
    };
}
