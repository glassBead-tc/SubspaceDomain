/**
 * Socket message types
 */
export var SocketMessageType;
(function (SocketMessageType) {
    SocketMessageType["JSON"] = "json";
    SocketMessageType["TEXT"] = "text";
    SocketMessageType["BINARY"] = "binary";
})(SocketMessageType || (SocketMessageType = {}));
/**
 * Socket message
 * Represents a message sent over the socket
 */
export class SocketMessage {
    constructor(content, type) {
        this.timestamp = new Date();
        if (type) {
            this.type = type;
            this.content = content;
        }
        else {
            // Auto-detect type
            if (typeof content === 'string') {
                try {
                    // Try to parse as JSON
                    this.content = JSON.parse(content);
                    this.type = SocketMessageType.JSON;
                }
                catch (error) {
                    // Treat as plain text
                    this.content = content;
                    this.type = SocketMessageType.TEXT;
                }
            }
            else if (content instanceof Buffer || content instanceof Uint8Array) {
                this.content = content;
                this.type = SocketMessageType.BINARY;
            }
            else {
                // Assume it's an object that can be serialized to JSON
                this.content = content;
                this.type = SocketMessageType.JSON;
            }
        }
    }
    /**
     * Create a message from a string
     */
    static fromString(str) {
        return new SocketMessage(str);
    }
    /**
     * Create a JSON message
     */
    static json(content) {
        return new SocketMessage(content, SocketMessageType.JSON);
    }
    /**
     * Create a text message
     */
    static text(content) {
        return new SocketMessage(content, SocketMessageType.TEXT);
    }
    /**
     * Create a binary message
     */
    static binary(content) {
        return new SocketMessage(content, SocketMessageType.BINARY);
    }
    /**
     * Get message type
     */
    getType() {
        return this.type;
    }
    /**
     * Get message content
     */
    getContent() {
        return this.content;
    }
    /**
     * Get message timestamp
     */
    getTimestamp() {
        return this.timestamp;
    }
    /**
     * Check if message is JSON
     */
    isJson() {
        return this.type === SocketMessageType.JSON;
    }
    /**
     * Check if message is text
     */
    isText() {
        return this.type === SocketMessageType.TEXT;
    }
    /**
     * Check if message is binary
     */
    isBinary() {
        return this.type === SocketMessageType.BINARY;
    }
    /**
     * Convert message to string
     */
    toString() {
        if (this.type === SocketMessageType.JSON) {
            return JSON.stringify(this.content);
        }
        else if (this.type === SocketMessageType.TEXT) {
            return this.content;
        }
        else {
            // Convert binary to base64 string
            return Buffer.isBuffer(this.content)
                ? this.content.toString('base64')
                : Buffer.from(this.content).toString('base64');
        }
    }
    /**
     * Convert message to JSON
     */
    toJson() {
        if (this.type === SocketMessageType.JSON) {
            return this.content;
        }
        else if (this.type === SocketMessageType.TEXT) {
            try {
                return JSON.parse(this.content);
            }
            catch (error) {
                return { text: this.content };
            }
        }
        else {
            // Convert binary to base64 string
            return {
                binary: Buffer.isBuffer(this.content)
                    ? this.content.toString('base64')
                    : Buffer.from(this.content).toString('base64')
            };
        }
    }
    /**
     * Convert message to buffer
     */
    toBuffer() {
        if (this.type === SocketMessageType.BINARY) {
            return Buffer.isBuffer(this.content)
                ? this.content
                : Buffer.from(this.content);
        }
        else if (this.type === SocketMessageType.TEXT) {
            return Buffer.from(this.content);
        }
        else {
            return Buffer.from(JSON.stringify(this.content));
        }
    }
}
//# sourceMappingURL=socketMessage.js.map