'use client';

/**
 * @file components/AgentTasksTable.tsx
 * @description Grafana panel table displaying agent sandbox execution token & cost logs (Warm & Light theme).
 */

import React from 'react';
import { Terminal } from 'lucide-react';

interface AgentTaskRow {
  taskId: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  time: string;
}

interface AgentTasksTableProps {
  events?: AgentTaskRow[];
}

export const AgentTasksTable: React.FC<AgentTasksTableProps> = ({ events = [] }) => {
  return (
    <div className="grafana-panel mt-6">
      <div className="grafana-panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-grafana-blue" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-grafana-text">
            Agent Sandbox Workloads & Token Attribution
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
            {events.map((task) => (
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

            {events.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-grafana-muted italic">
                  No agent usage events logged yet. Use "Log Task Cost" to attribute token usage.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
