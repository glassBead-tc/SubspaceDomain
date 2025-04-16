/**
 * Storage system types for MCP Bridge Server
 */
/**
 * Storage events
 */
export var StorageEventType;
(function (StorageEventType) {
    StorageEventType["READ"] = "read";
    StorageEventType["WRITE"] = "write";
    StorageEventType["UPDATE"] = "update";
    StorageEventType["DELETE"] = "delete";
    StorageEventType["MIGRATE"] = "migrate";
    StorageEventType["ERROR"] = "error";
})(StorageEventType || (StorageEventType = {}));
/**
 * Storage error types
 */
export var StorageErrorType;
(function (StorageErrorType) {
    StorageErrorType["FILE_NOT_FOUND"] = "FILE_NOT_FOUND";
    StorageErrorType["PERMISSION_DENIED"] = "PERMISSION_DENIED";
    StorageErrorType["INVALID_DATA"] = "INVALID_DATA";
    StorageErrorType["ENCRYPTION_ERROR"] = "ENCRYPTION_ERROR";
    StorageErrorType["MIGRATION_ERROR"] = "MIGRATION_ERROR";
    StorageErrorType["VERSION_MISMATCH"] = "VERSION_MISMATCH";
    StorageErrorType["CHECKSUM_MISMATCH"] = "CHECKSUM_MISMATCH";
    StorageErrorType["ATOMIC_WRITE_FAILED"] = "ATOMIC_WRITE_FAILED";
    StorageErrorType["BACKUP_FAILED"] = "BACKUP_FAILED";
})(StorageErrorType || (StorageErrorType = {}));
export class StorageError extends Error {
    constructor(type, message, path, metadata) {
        super(message);
        this.type = type;
        this.path = path;
        this.metadata = metadata;
        this.name = 'StorageError';
    }
}
//# sourceMappingURL=types.js.map