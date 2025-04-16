/**
 * Socket message types
 */
export declare enum SocketMessageType {
    JSON = "json",
    TEXT = "text",
    BINARY = "binary"
}
/**
 * Socket message
 * Represents a message sent over the socket
 */
export declare class SocketMessage {
    private type;
    private content;
    private timestamp;
    constructor(content: any, type?: SocketMessageType);
    /**
     * Create a message from a string
     */
    static fromString(str: string): SocketMessage;
    /**
     * Create a JSON message
     */
    static json(content: any): SocketMessage;
    /**
     * Create a text message
     */
    static text(content: string): SocketMessage;
    /**
     * Create a binary message
     */
    static binary(content: Buffer | Uint8Array): SocketMessage;
    /**
     * Get message type
     */
    getType(): SocketMessageType;
    /**
     * Get message content
     */
    getContent(): any;
    /**
     * Get message timestamp
     */
    getTimestamp(): Date;
    /**
     * Check if message is JSON
     */
    isJson(): boolean;
    /**
     * Check if message is text
     */
    isText(): boolean;
    /**
     * Check if message is binary
     */
    isBinary(): boolean;
    /**
     * Convert message to string
     */
    toString(): string;
    /**
     * Convert message to JSON
     */
    toJson(): any;
    /**
     * Convert message to buffer
     */
    toBuffer(): Buffer;
}
