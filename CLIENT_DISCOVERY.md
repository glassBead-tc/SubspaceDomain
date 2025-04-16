# MCP Bridge Server Client Discovery and Connection

This document describes how clients discover and connect to the MCP Bridge Server.

## Overview

The MCP Bridge Server facilitates communication between different MCP clients. The process involves:

1.  **Client Discovery**: Locating the bridge server's communication endpoint.
2.  **Connection and Initialization**: Establishing a connection and performing the standard MCP handshake.
3.  **Client Reconnection**: Handling client disconnections and reconnections.

## Client Discovery

Clients need to know how to connect to the bridge server. The primary methods are:

### 1. Socket-Based Discovery

Clients connect directly to the bridge server's Unix socket. The default path is typically `/tmp/mcp-bridge.sock`, but this can be configured. This is the main mechanism for clients running on the same machine as the server.

### 2. Configuration-Based Discovery

Client connection details can be provided through configuration:

*   **Environment Variables**: Setting variables like `MCP_BRIDGE_SOCKET`.
*   **Configuration Files**: Specifying the socket path in a client-specific configuration file.
*   **Command-Line Arguments**: Passing the socket path via arguments like `--mcp-bridge-socket`.

*(See Client Configuration section for examples)*

## Connection and Initialization

Once a client knows the server's socket path, it connects and initiates the standard MCP handshake:

### Connection Process

1.  **Connect**: The client establishes a connection to the bridge server's Unix socket.
2.  **Initialize Request**: Immediately upon connection, the client sends an `initialize` request message as defined in the standard MCP protocol (`src/protocols/mcpSchema.ts`). This message includes the client's capabilities and identification information.
3.  **Initialize Response**: The bridge server processes the request, registers the client internally, and sends back an `initialize` response containing the server's capabilities and confirmation.
4.  **Ready Notification**: The client sends an `initialized` notification to signal it's ready for operations.
5.  **Connection Established**: The MCP connection is now fully established.

### Example `initialize` Request (Client -> Server)

```json
{
  "jsonrpc": "2.0",
  "method": "initialize",
  "params": {
    "processId": 12345, // Optional: Client's process ID
    "clientInfo": {
      "name": "ExampleClient",
      "version": "1.2.0",
      "protocols": ["mcp/1.0"] // Indicate MCP protocol support
    },
    "capabilities": {
      // Client-specific capabilities advertised to the server
      "exampleCapability": true
    }
  },
  "id": 1
}
```

### Example `initialize` Response (Server -> Client)

```json
{
  "jsonrpc": "2.0",
  "result": {
    "serverInfo": {
      "name": "mcp-bridge-server",
      "version": "1.0.0",
      "protocols": ["mcp/1.0"] // Confirm MCP protocol support
    },
    "capabilities": {
      // Server-specific capabilities advertised to the client
      "supportsMessageRouting": true
    }
  },
  "id": 1 // Corresponds to the request ID
}
```

### Liveness Checks

After initialization, clients and the server can use the standard MCP `ping` / `pong` messages to check if the connection is still active.

## Client Reconnection

The bridge server supports client reconnection:

### Reconnection Process

1.  **Disconnection Detection**: Server detects when a client disconnects (e.g., socket closes, `ping` fails).
2.  **Reconnection Attempt**: If configured, the server may attempt to re-establish the connection based on known client details (if available via configuration). Clients are typically responsible for initiating reconnection attempts if the initial connection fails or drops.
3.  **State Restoration**: Upon successful reconnection, the `initialize` handshake is performed again. The server might restore some previous session state if applicable.

### Reconnection Strategies

Clients should implement reconnection logic, potentially using:

1.  **Immediate Reconnection**: Try to reconnect immediately.
2.  **Exponential Backoff**: Increase delay between reconnection attempts.
3.  **Limited Attempts**: Stop trying after a certain number of failures.

## Client Configuration Examples

Clients can be configured to find the bridge server socket:

### 1. Environment Variables

```bash
export MCP_BRIDGE_SOCKET=/path/to/mcp-bridge.sock
export MCP_CLIENT_ID=unique-client-id # Optional: If needed by client logic
```

### 2. Configuration Files (Example JSON)

```json
{
  "mcpBridge": {
    "socketPath": "/path/to/mcp-bridge.sock",
    "autoConnect": true,
    "reconnect": {
      "enabled": true,
      "maxAttempts": 5,
      "initialDelayMs": 1000
    }
  },
  "client": {
    "id": "unique-client-id" // Optional
  }
}
```

### 3. Command-Line Arguments

```bash
my-mcp-client --mcp-bridge-socket=/path/to/mcp-bridge.sock --mcp-client-id=unique-client-id
```

## Implementation Notes

*   **Server**: Manages incoming connections on the Unix socket, handles the `initialize` handshake, and maintains a registry of connected clients (`ConnectionManager`).
*   **Client**: Needs logic to locate the socket path (via configuration), connect, perform the `initialize` handshake, and handle potential reconnections.
