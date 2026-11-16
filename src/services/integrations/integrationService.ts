import { Integration } from '../../types';

export interface IIntegrationService {
  listIntegrations(): Promise<Integration[]>;
  connectIntegration(id: string): Promise<boolean>;
  disconnectIntegration(id: string): Promise<boolean>;
}

export class IntegrationServicePlaceholder implements IIntegrationService {
  async listIntegrations(): Promise<Integration[]> {
    return [
      {
        id: 'mcp-server-protocol',
        name: 'Model Context Protocol (MCP)',
        type: 'mcp',
        status: 'coming_soon',
        description: 'Connect standard MCP servers for databases, local file tools, and developer CLI tools.',
      },
      {
        id: 'browser-bridge',
        name: 'Browser Extension Bridge',
        type: 'browser',
        status: 'coming_soon',
        description: 'Read active tab context, navigate research tabs, and scrape reference documentation.',
      },
      {
        id: 'macos-filesystem',
        name: 'macOS Native Filesystem',
        type: 'filesystem',
        status: 'coming_soon',
        description: 'Direct sandboxed read/write access to approved workspace folders and projects.',
      },
    ];
  }

  async connectIntegration(): Promise<boolean> {
    throw new Error('Integrations will be enabled in Phase 4');
  }

  async disconnectIntegration(): Promise<boolean> {
    throw new Error('Integrations will be enabled in Phase 4');
  }
}

export const integrationService = new IntegrationServicePlaceholder();
