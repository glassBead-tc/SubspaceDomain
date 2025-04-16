/**
 * Types for MCP Bridge Server
 */
export var ConnectionState;
(function (ConnectionState) {
    ConnectionState["DISCOVERED"] = "discovered";
    ConnectionState["DISCOVERING"] = "discovering";
    ConnectionState["CONNECTING"] = "connecting";
    ConnectionState["HANDSHAKING"] = "handshaking";
    ConnectionState["CONNECTED"] = "connected";
    ConnectionState["DISCONNECTED"] = "disconnected";
    ConnectionState["ERROR"] = "error";
})(ConnectionState || (ConnectionState = {}));
//# sourceMappingURL=types.js.map