# MCP Bridge Server

A macOS-native bridge server for the Model Context Protocol (MCP) that enables communication between different AI clients like Claude and Cline.

## Overview

The MCP Bridge Server acts as an intermediary between different MCP clients, allowing them to communicate with each other. It provides:

- **macOS-native integration** with launchd service and Unix domain sockets
- **Persistent client registration** across restarts
- **Seamless communication** between different AI clients
- **Tool routing** between clients

## Project Status

This project is under active development. Current status:

- [x] Basic bridge server implementation
- [x] Unix socket transport layer
- [x] macOS service integration framework
- [x] Robust connection handling and error recovery
- [x] Enhanced logging for debugging
- [x] Complete LaunchAgent configuration
- [x] Service lifecycle management
- [x] Client persistence implementation
- [x] Recovery mechanisms for service restarts
- [x] Client discovery and registration protocol
- [x] Configuration templates for Claude and Cline

## Architecture

The MCP Bridge Server consists of several key components:

1. **BridgeServer**: Core server implementation that handles client connections and message routing
2. **UnixSocketTransport**: macOS-native transport layer using Unix domain sockets
3. **StateManager**: Manages client state and persistence
4. **MacOSServiceManager**: Handles integration with macOS launchd service

## Installation

*Coming soon*

## Usage

*Coming soon*

## Development

### Prerequisites

- Node.js 18+
- TypeScript
- macOS (for native features)

### Building

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

### Testing

```bash
# Run tests
npm test
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT