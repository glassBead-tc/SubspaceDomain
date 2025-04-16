# MCP Bridge Server State Management

This document describes the state management approach used in the MCP Bridge Server.

## Overview

The MCP Bridge Server needs to maintain state for:

1. **Connected Clients**: Information about clients that are connected to the bridge
2. **Tasks**: Information about ongoing tasks being processed by clients
3. **Configuration**: Server and client configuration settings

State management is critical for ensuring reliable operation, especially when:
- The server restarts
- Clients disconnect and reconnect
- The system recovers from errors

## State Components

### Client State

Client state includes:

- **Client ID**: Unique identifier for the client
- **Client Type**: Type of client (claude, cline, etc.)
- **Transport**: Transport mechanism used (stdio, unix-socket)
- **Connection Status**: Whether the client is connected
- **Last Seen**: Timestamp of last activity
- **Capabilities**: Client capabilities (supported methods, features)
- **Process ID**: For locally started clients
- **Socket Path**: For Unix socket transport

### Task State

Task state includes:

- **Task ID**: Unique identifier for the task
- **Client ID**: ID of the client handling the task
- **Method**: Method being called
- **Parameters**: Parameters for the method call
- **Status**: Current status of the task (pending, running, completed, failed)
- **Created At**: When the task was created
- **Updated At**: When the task was last updated
- **Result**: Result of the task (if completed)
- **Error**: Error information (if failed)

### Configuration State

Configuration state includes:

- **Server Configuration**: General server settings
- **Router Configuration**: Message routing rules
- **State Manager Configuration**: State management settings
- **macOS Configuration**: macOS-specific settings

## Persistence Strategy

The MCP Bridge Server uses a file-based persistence strategy:

1. **Client Persistence**:
   - Clients are stored in individual JSON files
   - Files are stored in `~/Library/Application Support/mcp-bridge/data/clients/`
   - Client state is persisted on registration, updates, and disconnection

2. **Configuration Persistence**:
   - Configuration is stored in a JSON file
   - File is stored in `~/Library/Application Support/mcp-bridge/config/config.json`
   - Configuration is loaded on startup and saved on changes

3. **Task Persistence**:
   - Tasks are stored in memory only
   - Tasks expire after a configurable period
   - Long-running tasks may be lost on server restart

## Recovery Mechanisms

The MCP Bridge Server implements several recovery mechanisms:

1. **Client Recovery**:
   - On startup, the server loads persisted client information
   - For each previously connected client, it attempts to reconnect
   - Clients that cannot be reconnected are marked as disconnected

2. **Socket Recovery**:
   - The server cleans up socket files on startup and shutdown
   - If a socket file exists but no server is listening, it is removed

3. **Error Recovery**:
   - The server catches and logs errors
   - Critical errors trigger a controlled shutdown
   - The LaunchAgent ensures the server is restarted if it crashes

## Implementation Details

### StateManager Class

The `StateManager` class is responsible for:

- Tracking client connections
- Managing task state
- Persisting state to disk
- Recovering state on startup

Key methods:

- `initialize()`: Load persisted state
- `registerClient()`: Register a new client
- `updateClient()`: Update client information
- `disconnectClient()`: Mark a client as disconnected
- `recoverConnections()`: Attempt to recover client connections
- `cleanup()`: Clean up expired tasks and disconnected clients

### ClientStorage Class

The `ClientStorage` class handles client persistence:

- `saveClient()`: Save client information to disk
- `loadClient()`: Load client information from disk
- `deleteClient()`: Delete client information from disk
- `listClients()`: List all persisted clients

### ConfigManager Class

The `ConfigManager` class manages configuration:

- `initialize()`: Load configuration from disk or create default
- `save()`: Save configuration to disk
- `getServerConfig()`: Get server configuration
- `updateServerConfig()`: Update server configuration

## Future Enhancements

Planned enhancements to state management:

1. **Database Storage**: Replace file-based storage with a lightweight database
2. **State Encryption**: Encrypt sensitive state information
3. **State Compression**: Compress large state objects
4. **State Versioning**: Track state versions for backward compatibility
5. **State Synchronization**: Synchronize state across multiple instances
