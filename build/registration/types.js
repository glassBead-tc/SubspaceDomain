/**
 * Registration system types for MCP Bridge Server
 */
/**
 * Registration state
 */
export var RegistrationState;
(function (RegistrationState) {
    RegistrationState["PENDING"] = "PENDING";
    RegistrationState["APPROVED"] = "APPROVED";
    RegistrationState["REJECTED"] = "REJECTED";
    RegistrationState["EXPIRED"] = "EXPIRED";
})(RegistrationState || (RegistrationState = {}));
/**
 * Registration error types
 */
export var RegistrationErrorType;
(function (RegistrationErrorType) {
    RegistrationErrorType["REQUEST_INVALID"] = "REQUEST_INVALID";
    RegistrationErrorType["REQUEST_EXPIRED"] = "REQUEST_EXPIRED";
    RegistrationErrorType["REQUEST_NOT_FOUND"] = "REQUEST_NOT_FOUND";
    RegistrationErrorType["CLIENT_EXISTS"] = "CLIENT_EXISTS";
    RegistrationErrorType["PERSISTENCE_FAILED"] = "PERSISTENCE_FAILED";
    RegistrationErrorType["MIGRATION_FAILED"] = "MIGRATION_FAILED";
    RegistrationErrorType["INVALID_CONFIG"] = "INVALID_CONFIG";
})(RegistrationErrorType || (RegistrationErrorType = {}));
/**
 * Registration error
 */
export class RegistrationError extends Error {
    constructor(type, message, metadata) {
        super(message);
        this.type = type;
        this.metadata = metadata;
        this.name = 'RegistrationError';
    }
}
/**
 * Registration event types
 */
export var RegistrationEventType;
(function (RegistrationEventType) {
    RegistrationEventType["REQUEST_RECEIVED"] = "REQUEST_RECEIVED";
    RegistrationEventType["REQUEST_APPROVED"] = "REQUEST_APPROVED";
    RegistrationEventType["REQUEST_REJECTED"] = "REQUEST_REJECTED";
    RegistrationEventType["REQUEST_EXPIRED"] = "REQUEST_EXPIRED";
    RegistrationEventType["CLIENT_CREATED"] = "CLIENT_CREATED";
    RegistrationEventType["PERSISTENCE_ERROR"] = "PERSISTENCE_ERROR";
})(RegistrationEventType || (RegistrationEventType = {}));
//# sourceMappingURL=types.js.map