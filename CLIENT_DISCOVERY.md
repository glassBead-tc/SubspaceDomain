# MCP Bridge Server Client Discovery and Registration

This document describes the client discovery and registration protocol used in the MCP Bridge Server.

## Overview

The MCP Bridge Server needs to discover and register clients to facilitate communication between them. This process involves:

1. **Client Discovery**: Finding MCP clients on the system
2. **Client Registration**: Registering clients with the bridge server
3. **Client Handshake**: Establishing a connection and exchanging capabilities
4. **Client Reconnection**: Handling client disconnections and reconnections

## Client Discovery

The MCP Bridge Server supports several methods for discovering clients:

### 1. Socket-Based Discovery

Clients can connect to the bridge server's Unix socket at `/tmp/mcp-bridge.sock`. This is the primary discovery mechanism for macOS-native clients.

### 2. Configuration-Based Discovery

The bridge server can be configured with information about known clients, including:
- Client ID
- Client type (claude, cline, etc.)
- Transport mechanism (stdio, unix-socket)
- Socket path (for unix-socket transport)

### 3. Process-Based Discovery

The bridge server can scan for running processes that match known MCP client patterns. This is useful for discovering clients that are already running but not connected to the bridge.

## Client Registration

Once a client is discovered, it needs to register with the bridge server:

### Registration Process

1. **Connection**: Client connects to the bridge server's Unix socket
2. **Initialization**: Client sends an `initialize` request with its capabilities
3. **Registration**: Bridge server registers the client and assigns a unique ID
4. **Confirmation**: Bridge server sends a registration confirmation
5. **Ready**: Client sends an `initialized` notification to indicate it's ready

### Registration Message Format

```json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {
    "capabilities": {
      "supportedMethods": ["tools/call", "tools/discover_client"],
      "supportedTransports": ["unix-socket"],
      "maxConcurrentTasks": 5,
      "targetType": "claude",
      "features": {
        "autoStart": true,
        "reconnect": true,
        "healthCheck": true
      }
    },
    "clientInfo": {
      "id": "client-123",
      "type": "claude",
      "version": "1.0.0"
    }
  },
  "id": 1
}
```

## Client Handshake

After registration, the client and server perform a handshake to establish the connection:

### Handshake Process

1. **Capability Exchange**: Server sends its capabilities to the client
2. **Feature Negotiation**: Client and server negotiate features
3. **Connection Confirmation**: Server confirms the connection is established

### Handshake Message Format

```json
{
  "jsonrpc": "2.0",
  "result": {
    "capabilities": {
      "supportedMethods": ["tools/call", "tools/discover_client"],
      "supportedTransports": ["stdio", "unix-socket"],
      "features": {
        "autoStart": true,
        "reconnect": true,
        "healthCheck": true
      }
    },
    "serverInfo": {
      "name": "mcp-bridge-server",
      "version": "1.0.0"
    }
  },
  "id": 1
}
```

## Client Reconnection

The bridge server supports client reconnection to handle temporary disconnections:

### Reconnection Process

1. **Disconnection Detection**: Server detects when a client disconnects
2. **Reconnection Attempt**: Server attempts to reconnect to the client
3. **State Restoration**: If reconnection is successful, server restores client state
4. **Handshake**: Client and server perform a handshake again

### Reconnection Strategies

1. **Immediate Reconnection**: Try to reconnect immediately after disconnection
2. **Exponential Backoff**: Increase delay between reconnection attempts
3. **Limited Attempts**: Give up after a configurable number of attempts

## Client Configuration

Clients can be configured to connect to the bridge server in several ways:

### 1. Environment Variables

```
MCP_BRIDGE_SOCKET=/tmp/mcp-bridge.sock
MCP_CLIENT_ID=claude-1
MCP_CLIENT_TYPE=claude
```

### 2. Configuration Files

```json
{
  "bridge": {
    "socketPath": "/tmp/mcp-bridge.sock",
    "autoConnect": true,
    "reconnect": true
  },
  "client": {
    "id": "claude-1",
    "type": "claude"
  }
}
```

### 3. Command-Line Arguments

```
--mcp-bridge-socket=/tmp/mcp-bridge.sock
--mcp-client-id=claude-1
--mcp-client-type=claude
```

## Implementation Details

### Bridge Server Side

The bridge server implements client discovery and registration through:

1. **DiscoveryManager**: Handles client discovery
2. **RegistrationManager**: Handles client registration
3. **ConnectionManager**: Manages client connections
4. **ReconnectionManager**: Handles client reconnection

### Client Side

Clients need to implement:

1. **Bridge Discovery**: Find the bridge server
2. **Registration**: Register with the bridge server
3. **Handshake**: Perform capability exchange
4. **Reconnection**: Handle disconnections and reconnect

## Future Enhancements

Planned enhancements to client discovery and registration:

1. **Automatic Client Configuration**: Automatically configure clients to connect to the bridge
2. **Client Health Monitoring**: Monitor client health and restart if necessary
3. **Multi-Bridge Support**: Allow clients to connect to multiple bridge servers
4. **Secure Registration**: Add authentication and encryption to the registration process
