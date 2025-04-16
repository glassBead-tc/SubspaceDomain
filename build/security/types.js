/**
 * Security system types for MCP Bridge Server
 */
/**
 * Encryption algorithm options
 */
export var EncryptionAlgorithm;
(function (EncryptionAlgorithm) {
    EncryptionAlgorithm["AES_256_GCM"] = "aes-256-gcm";
    EncryptionAlgorithm["AES_256_CBC"] = "aes-256-cbc";
    EncryptionAlgorithm["CHACHA20_POLY1305"] = "chacha20-poly1305";
})(EncryptionAlgorithm || (EncryptionAlgorithm = {}));
/**
 * Key derivation function options
 */
export var KeyDerivationFunction;
(function (KeyDerivationFunction) {
    KeyDerivationFunction["PBKDF2"] = "pbkdf2";
    KeyDerivationFunction["ARGON2"] = "argon2";
    KeyDerivationFunction["SCRYPT"] = "scrypt";
})(KeyDerivationFunction || (KeyDerivationFunction = {}));
/**
 * Security error types
 */
export var SecurityErrorType;
(function (SecurityErrorType) {
    SecurityErrorType["ENCRYPTION_FAILED"] = "ENCRYPTION_FAILED";
    SecurityErrorType["DECRYPTION_FAILED"] = "DECRYPTION_FAILED";
    SecurityErrorType["INVALID_KEY"] = "INVALID_KEY";
    SecurityErrorType["INVALID_CONFIG"] = "INVALID_CONFIG";
    SecurityErrorType["AUTHENTICATION_FAILED"] = "AUTHENTICATION_FAILED";
    SecurityErrorType["ACCESS_DENIED"] = "ACCESS_DENIED";
    SecurityErrorType["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    SecurityErrorType["AUDIT_FAILED"] = "AUDIT_FAILED";
    SecurityErrorType["RATE_LIMIT_FAILED"] = "RATE_LIMIT_FAILED";
})(SecurityErrorType || (SecurityErrorType = {}));
/**
 * Security error
 */
export class SecurityError extends Error {
    constructor(type, message, metadata) {
        super(message);
        this.type = type;
        this.metadata = metadata;
        this.name = 'SecurityError';
    }
}
/**
 * Access control level
 */
export var AccessLevel;
(function (AccessLevel) {
    AccessLevel[AccessLevel["NONE"] = 0] = "NONE";
    AccessLevel[AccessLevel["READ"] = 1] = "READ";
    AccessLevel[AccessLevel["WRITE"] = 2] = "WRITE";
    AccessLevel[AccessLevel["ADMIN"] = 3] = "ADMIN";
})(AccessLevel || (AccessLevel = {}));
/**
 * Security event types
 */
export var SecurityEventType;
(function (SecurityEventType) {
    SecurityEventType["ENCRYPTION_KEY_ROTATED"] = "ENCRYPTION_KEY_ROTATED";
    SecurityEventType["ACCESS_RULE_UPDATED"] = "ACCESS_RULE_UPDATED";
    SecurityEventType["RATE_LIMIT_EXCEEDED"] = "RATE_LIMIT_EXCEEDED";
    SecurityEventType["AUTHENTICATION_FAILED"] = "AUTHENTICATION_FAILED";
    SecurityEventType["SUSPICIOUS_ACTIVITY"] = "SUSPICIOUS_ACTIVITY";
})(SecurityEventType || (SecurityEventType = {}));
//# sourceMappingURL=types.js.map