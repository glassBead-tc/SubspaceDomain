/**
 * Socket message types
 */
export enum SocketMessageType {
  JSON = 'json',
  TEXT = 'text',
  BINARY = 'binary'
}

/**
 * Socket message
 * Represents a message sent over the socket
 */
export class SocketMessage {
  private type: SocketMessageType;
  private content: any;
  private timestamp: Date;
  
  constructor(content: any, type?: SocketMessageType) {
    this.timestamp = new Date();
    
    if (type) {
      this.type = type;
      this.content = content;
    } else {
      // Auto-detect type
      if (typeof content === 'string') {
        try {
          // Try to parse as JSON
          this.content = JSON.parse(content);
          this.type = SocketMessageType.JSON;
        } catch (error) {
          // Treat as plain text
          this.content = content;
          this.type = SocketMessageType.TEXT;
        }
      } else if (content instanceof Buffer || content instanceof Uint8Array) {
        this.content = content;
        this.type = SocketMessageType.BINARY;
      } else {
        // Assume it's an object that can be serialized to JSON
        this.content = content;
        this.type = SocketMessageType.JSON;
      }
    }
  }
  
  /**
   * Create a message from a string
   */
  public static fromString(str: string): SocketMessage {
    return new SocketMessage(str);
  }
  
  /**
   * Create a JSON message
   */
  public static json(content: any): SocketMessage {
    return new SocketMessage(content, SocketMessageType.JSON);
  }
  
  /**
   * Create a text message
   */
  public static text(content: string): SocketMessage {
    return new SocketMessage(content, SocketMessageType.TEXT);
  }
  
  /**
   * Create a binary message
   */
  public static binary(content: Buffer | Uint8Array): SocketMessage {
    return new SocketMessage(content, SocketMessageType.BINARY);
  }
  
  /**
   * Get message type
   */
  public getType(): SocketMessageType {
    return this.type;
  }
  
  /**
   * Get message content
   */
  public getContent(): any {
    return this.content;
  }
  
  /**
   * Get message timestamp
   */
  public getTimestamp(): Date {
    return this.timestamp;
  }
  
  /**
   * Check if message is JSON
   */
  public isJson(): boolean {
    return this.type === SocketMessageType.JSON;
  }
  
  /**
   * Check if message is text
   */
  public isText(): boolean {
    return this.type === SocketMessageType.TEXT;
  }
  
  /**
   * Check if message is binary
   */
  public isBinary(): boolean {
    return this.type === SocketMessageType.BINARY;
  }
  
  /**
   * Convert message to string
   */
  public toString(): string {
    if (this.type === SocketMessageType.JSON) {
      return JSON.stringify(this.content);
    } else if (this.type === SocketMessageType.TEXT) {
      return this.content;
    } else {
      // Convert binary to base64 string
      return Buffer.isBuffer(this.content)
        ? this.content.toString('base64')
        : Buffer.from(this.content).toString('base64');
    }
  }
  
  /**
   * Convert message to JSON
   */
  public toJson(): any {
    if (this.type === SocketMessageType.JSON) {
      return this.content;
    } else if (this.type === SocketMessageType.TEXT) {
      try {
        return JSON.parse(this.content);
      } catch (error) {
        return { text: this.content };
      }
    } else {
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
  public toBuffer(): Buffer {
    if (this.type === SocketMessageType.BINARY) {
      return Buffer.isBuffer(this.content)
        ? this.content
        : Buffer.from(this.content);
    } else if (this.type === SocketMessageType.TEXT) {
      return Buffer.from(this.content);
    } else {
      return Buffer.from(JSON.stringify(this.content));
    }
  }
}
