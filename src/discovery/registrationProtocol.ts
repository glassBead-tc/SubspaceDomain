export enum RegistrationMessageType {
  REGISTER = 'REGISTER',
  REGISTER_RESPONSE = 'REGISTER_RESPONSE',
  HEARTBEAT = 'HEARTBEAT',
  HEARTBEAT_RESPONSE = 'HEARTBEAT_RESPONSE'
}

export enum RegistrationStatus {
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface RegistrationCapabilities {
  supportedMethods: string[];
  supportedTransports: Array<'stdio' | 'http' | 'unix-socket'>;
  maxConcurrentTasks?: number;
  targetType?: 'claude' | 'cline';
  features?: {
    autoStart?: boolean;
    reconnect?: boolean;
    healthCheck?: boolean;
  };
}

export interface RegisterMessage {
  type: RegistrationMessageType.REGISTER;
  clientType: 'claude' | 'cline' | 'other';
  capabilities: RegistrationCapabilities;
  transport: 'stdio' | 'http' | 'unix-socket';
  clientId: string;
  socketPath?: string;
}

export interface HeartbeatMessage {
  type: RegistrationMessageType.HEARTBEAT;
  clientId: string;
}

export interface DisconnectMessage {
  type: 'DISCONNECT';
  clientId: string;
  reason?: string;
}

export type RegistrationMessage = RegisterMessage | HeartbeatMessage | DisconnectMessage | Record<string, any>;

export class RegistrationProtocol {
  public createRegisterMessage(
    clientType: 'claude' | 'cline' | 'other',
    capabilities: RegistrationCapabilities,
    transport: 'stdio' | 'http' | 'unix-socket',
    clientId: string,
    socketPath?: string
  ): RegisterMessage {
    return {
      type: RegistrationMessageType.REGISTER,
      clientType,
      capabilities,
      transport,
      clientId,
      socketPath
    };
  }

  public createHeartbeatMessage(clientId: string): HeartbeatMessage {
    return { type: RegistrationMessageType.HEARTBEAT, clientId };
  }

  public createDisconnectMessage(clientId: string, reason?: string): DisconnectMessage {
    return { type: 'DISCONNECT', clientId, reason };
  }

  public parseMessage(message: string): RegistrationMessage | null {
    try {
      const parsed = JSON.parse(message);
      return parsed as RegistrationMessage;
    } catch {
      return null;
    }
  }
}