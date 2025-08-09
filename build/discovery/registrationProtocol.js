export var RegistrationMessageType;
(function (RegistrationMessageType) {
    RegistrationMessageType["REGISTER"] = "REGISTER";
    RegistrationMessageType["REGISTER_RESPONSE"] = "REGISTER_RESPONSE";
    RegistrationMessageType["HEARTBEAT"] = "HEARTBEAT";
    RegistrationMessageType["HEARTBEAT_RESPONSE"] = "HEARTBEAT_RESPONSE";
})(RegistrationMessageType || (RegistrationMessageType = {}));
export var RegistrationStatus;
(function (RegistrationStatus) {
    RegistrationStatus["SUCCESS"] = "SUCCESS";
    RegistrationStatus["ERROR"] = "ERROR";
})(RegistrationStatus || (RegistrationStatus = {}));
export class RegistrationProtocol {
    createRegisterMessage(clientType, capabilities, transport, clientId, socketPath) {
        return {
            type: RegistrationMessageType.REGISTER,
            clientType,
            capabilities,
            transport,
            clientId,
            socketPath
        };
    }
    createHeartbeatMessage(clientId) {
        return { type: RegistrationMessageType.HEARTBEAT, clientId };
    }
    createDisconnectMessage(clientId, reason) {
        return { type: 'DISCONNECT', clientId, reason };
    }
    parseMessage(message) {
        try {
            const parsed = JSON.parse(message);
            return parsed;
        }
        catch {
            return null;
        }
    }
}
//# sourceMappingURL=registrationProtocol.js.map