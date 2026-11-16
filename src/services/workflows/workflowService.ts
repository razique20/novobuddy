import { Workflow } from '../../types';

export interface IWorkflowService {
  listWorkflows(): Promise<Workflow[]>;
  triggerWorkflow(id: string): Promise<boolean>;
}

export class WorkflowServicePlaceholder implements IWorkflowService {
  async listWorkflows(): Promise<Workflow[]> {
    return [
      {
        id: 'daily-standup-prep',
        title: 'Morning Workspace Sync',
        trigger: 'Schedule (Weekdays 09:00)',
        actions: ['Query git activity', 'Summarize recent commits', 'Draft standup notes'],
        enabled: false,
      },
      {
        id: 'auto-summarize-code',
        title: 'Code Change Explainer',
        trigger: 'Git Commit Hook',
        actions: ['Detect modified files', 'Generate semantic diff summary', 'Store to Memory'],
        enabled: false,
      },
    ];
  }

  async triggerWorkflow(): Promise<boolean> {
    throw new Error('Automated Workflows are planned for Phase 4');
  }
}

export const workflowService = new WorkflowServicePlaceholder();
