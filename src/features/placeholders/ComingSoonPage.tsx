import React from 'react';
import { Brain, Bot, GitBranch, Layers, ShieldCheck, ArrowRight } from 'lucide-react';
import { NavigationTab } from '../../types';
import { Badge } from '../../components/common/Badge';
import { useAppStore } from '../../stores/appStore';

interface ComingSoonProps {
  tab: NavigationTab;
}

export const ComingSoonPage: React.FC<ComingSoonProps> = ({ tab }) => {
  const { setCurrentTab } = useAppStore();

  const getDetails = () => {
    switch (tab) {
      case 'memory':
        return {
          title: 'Contextual Memory System',
          icon: Brain,
          phase: 'Phase 3',
          tagline: 'Persistent memory across sessions, projects, and active conversations.',
          description:
            'In Phase 3, NOVA will maintain an on-device local vector store to index user coding preferences, active project boundaries, and factual guidelines. In Phase 1, the data models and SQLite persistence architecture are ready.',
          features: [
            'Local vector embeddings running on device',
            'Cross-session memory retrieval with fuzzy search',
            'Explicit user control: Inspect, edit, or purge any memory',
            'Zero cloud sync: 100% private to your machine',
          ],
        };
      case 'agents':
        return {
          title: 'Autonomous AI Agents',
          icon: Bot,
          phase: 'Phase 3',
          tagline: 'Specialized desktop agents that coordinate multi-step workflows.',
          description:
            'Autonomous agents will execute approved multi-step developer operations, code reviews, and workspace research under explicit user confirmation boundaries.',
          features: [
            'Scoped tool execution with permission prompts',
            'Background task monitoring and notification',
            'Interactive step inspection and rollbacks',
            'Seamless integration with local and cloud models',
          ],
        };
      case 'workflows':
        return {
          title: 'Automation Workflows',
          icon: GitBranch,
          phase: 'Phase 4',
          tagline: 'Event-driven desktop triggers and automated productivity pipelines.',
          description:
            'Trigger intelligent actions based on time schedules, git events, or application switches. Designed for developers who want repetitive tasks handled automatically.',
          features: [
            'Visual trigger & action pipeline builder',
            'Git commit hook automation and standup drafting',
            'Keyboard shortcut macros and quick palettes',
            'Exportable and shareable workflow JSON schemas',
          ],
        };
      case 'integrations':
        return {
          title: 'Model Context Protocol (MCP) & Integrations',
          icon: Layers,
          phase: 'Phase 4',
          tagline: 'Standardized connectivity to developer tooling, files, and browsers.',
          description:
            'Connect standard MCP servers, IDE bridges, and browser extensions to expand NOVA’s context and execution capabilities without vendor lock-in.',
          features: [
            'Native MCP Client implementation in Rust',
            'Sandboxed filesystem access with permission bounds',
            'Browser research bridge for active tab context',
            'Local CLI tool executor',
          ],
        };
      default:
        return {
          title: 'Coming Soon',
          icon: Brain,
          phase: 'Roadmap',
          tagline: 'This feature is scheduled for future release phases.',
          description: 'The foundation has been established in Phase 1.',
          features: [],
        };
    }
  };

  const details = getDetails();
  const Icon = details.icon;

  return (
    <div className="max-w-2xl mx-auto py-12 space-y-6 animate-fade-in select-none">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary/20 to-accent-blue/20 border border-primary/30 flex items-center justify-center text-primary shadow-glow">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-text-primary">{details.title}</h1>
            <Badge variant="purple" size="md">
              {details.phase}
            </Badge>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">{details.tagline}</p>
        </div>
      </div>

      <div className="nova-glass-card rounded-2xl p-6 space-y-4">
        <p className="text-xs text-text-secondary leading-relaxed">{details.description}</p>

        <div className="pt-3 border-t border-border/40 space-y-2.5">
          <div className="text-xs font-semibold text-text-primary uppercase tracking-wider">
            Planned Specifications
          </div>
          <ul className="space-y-2">
            {details.features.map((feat, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                <ShieldCheck className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>{feat}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="pt-4 border-t border-border/40 flex items-center justify-between">
          <span className="text-xs text-text-muted">
            Phase 1 desktop foundation & interfaces are ready.
          </span>
          <button
            onClick={() => setCurrentTab('assistant')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-background-card hover:bg-background-cardHover border border-border hover:border-primary/40 text-xs font-medium text-text-primary transition-all cursor-pointer"
          >
            <span>Back to Assistant</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
