/**
 * Identity system types for MCP Bridge Server
 */
/**
 * Identity error types
 */
export var IdentityErrorType;
(function (IdentityErrorType) {
    IdentityErrorType["MACHINE_ID_NOT_FOUND"] = "MACHINE_ID_NOT_FOUND";
    IdentityErrorType["MACHINE_ID_INVALID"] = "MACHINE_ID_INVALID";
    IdentityErrorType["USER_NOT_FOUND"] = "USER_NOT_FOUND";
    IdentityErrorType["USER_INVALID"] = "USER_INVALID";
    IdentityErrorType["CLIENT_NOT_FOUND"] = "CLIENT_NOT_FOUND";
    IdentityErrorType["CLIENT_INVALID"] = "CLIENT_INVALID";
    IdentityErrorType["SESSION_NOT_FOUND"] = "SESSION_NOT_FOUND";
    IdentityErrorType["SESSION_EXPIRED"] = "SESSION_EXPIRED";
    IdentityErrorType["SESSION_INVALID"] = "SESSION_INVALID";
})(IdentityErrorType || (IdentityErrorType = {}));
/**
 * Identity error
 */
export class IdentityError extends Error {
    constructor(type, message, metadata) {
        super(message);
        this.type = type;
        this.metadata = metadata;
        this.name = 'IdentityError';
    }
}
/**
 * Identity event types
 */
export var IdentityEventType;
(function (IdentityEventType) {
    IdentityEventType["MACHINE_ID_CHANGED"] = "MACHINE_ID_CHANGED";
    IdentityEventType["USER_CREATED"] = "USER_CREATED";
    IdentityEventType["USER_UPDATED"] = "USER_UPDATED";
    IdentityEventType["CLIENT_REGISTERED"] = "CLIENT_REGISTERED";
    IdentityEventType["CLIENT_UPDATED"] = "CLIENT_UPDATED";
    IdentityEventType["SESSION_CREATED"] = "SESSION_CREATED";
    IdentityEventType["SESSION_EXPIRED"] = "SESSION_EXPIRED";
})(IdentityEventType || (IdentityEventType = {}));
//# sourceMappingURL=types.js.map