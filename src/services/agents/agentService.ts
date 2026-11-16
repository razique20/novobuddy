import { Agent } from '../../types';

export interface AgentExecutionTask {
  agentId: string;
  goal: string;
  maxSteps: number;
}

export interface IAgentService {
  listAgents(): Promise<Agent[]>;
  createAgent(agent: Omit<Agent, 'id'>): Promise<Agent>;
  runAgentTask(task: AgentExecutionTask): Promise<{ taskId: string }>;
}

export class AgentServicePlaceholder implements IAgentService {
  async listAgents(): Promise<Agent[]> {
    return [
      {
        id: 'workspace-assistant',
        name: 'Workspace Assistant',
        description: 'Analyzes project files and coordinates multi-step development tasks.',
        capabilities: ['file_search', 'code_editing', 'context_retrieval'],
        status: 'idle',
        version: '1.0.0 (Phase 3)',
      },
      {
        id: 'browser-researcher',
        name: 'Browser Researcher',
        description: 'Fetches documentation, summarizes web resources, and verifies external APIs.',
        capabilities: ['web_search', 'read_pages', 'summarize'],
        status: 'idle',
        version: '1.0.0 (Phase 3)',
      },
    ];
  }

  async createAgent(): Promise<Agent> {
    throw new Error('Autonomous Agent creation is planned for Phase 3');
  }

  async runAgentTask(): Promise<{ taskId: string }> {
    throw new Error('Autonomous Agent execution is planned for Phase 3');
  }
}

export const agentService = new AgentServicePlaceholder();
