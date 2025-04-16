declare module '@modelcontextprotocol/sdk' {
  export interface MCPServerCapabilities {
    tools?: Record<string, any>;
    resources?: Record<string, any>;
    [key: string]: any;
  }

  export interface Tool {
    [key: string]: any;
  }

  export interface Resource {
    [key: string]: any;
  }
}
