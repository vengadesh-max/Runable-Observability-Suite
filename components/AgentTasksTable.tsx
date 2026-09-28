'use client';

/**
 * @file components/AgentTasksTable.tsx
 * @description Grafana panel table displaying Runable multi-agent sandbox executions and token costs (Warm & Light theme).
 */

import React from 'react';
import { Cpu, Terminal, ArrowUpRight } from 'lucide-react';

interface AgentTaskRow {
  taskId: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  time: string;
}

const SAMPLE_RUNABLE_TASKS: AgentTaskRow[] = [
  { taskId: 'task-agent-codegen-pr-402', provider: 'openai', inputTokens: 145000, outputTokens: 24000, costUsd: 14.50, time: '2 mins ago' },
  { taskId: 'task-auto-debugger-run-881', provider: 'anthropic', inputTokens: 92000, outputTokens: 18000, costUsd: 9.20, time: '8 mins ago' },
  { taskId: 'task-agent-test-runner-109', provider: 'google-gemini', inputTokens: 55000, outputTokens: 12000, costUsd: 3.80, time: '14 mins ago' },
  { taskId: 'task-refactoring-suite-55', provider: 'openai', inputTokens: 180000, outputTokens: 32000, costUsd: 18.00, time: '22 mins ago' },
  { taskId: 'task-agent-security-auditor', provider: 'anthropic', inputTokens: 78000, outputTokens: 15000, costUsd: 7.80, time: '35 mins ago' },
];

export const AgentTasksTable: React.FC = () => {
  return (
    <div className="grafana-panel mt-6">
      <div className="grafana-panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-grafana-blue" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-grafana-text">
            Runable Agent Sandbox Workloads & Token Attribution
          </h2>
        </div>
        <span className="text-xs font-mono-data text-grafana-muted font-normal">Real-Time Ingestion</span>
      </div>

      <div className="p-2 overflow-x-auto">
        <table className="w-full text-left font-mono-data text-xs">
          <thead>
            <tr className="text-grafana-muted border-b border-grafana-border uppercase tracking-wider text-[10px] bg-grafana-subtle/50">
              <th className="py-2.5 px-3">Agent Task ID</th>
              <th className="py-2.5 px-3">LLM Provider</th>
              <th className="py-2.5 px-3">Input Tokens</th>
              <th className="py-2.5 px-3">Output Tokens</th>
              <th className="py-2.5 px-3">Cost (USD)</th>
              <th className="py-2.5 px-3">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grafana-border">
            {SAMPLE_RUNABLE_TASKS.map((task) => (
              <tr key={task.taskId} className="hover:bg-grafana-hover/50 transition-colors">
                <td className="py-2.5 px-3 font-semibold text-grafana-text flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-grafana-orange" />
                  <span>{task.taskId}</span>
                </td>
                <td className="py-2.5 px-3 text-grafana-muted uppercase">{task.provider}</td>
                <td className="py-2.5 px-3 text-grafana-text">{task.inputTokens.toLocaleString()}</td>
                <td className="py-2.5 px-3 text-grafana-text">{task.outputTokens.toLocaleString()}</td>
                <td className="py-2.5 px-3 font-semibold text-grafana-blue">${task.costUsd.toFixed(2)}</td>
                <td className="py-2.5 px-3 text-grafana-muted">{task.time}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
