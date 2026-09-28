'use client';

/**
 * @file components/Heartbeat.tsx
 * @description Grafana-style Timeseries Heartbeat chart panel (Warm & Light theme).
 */

import React, { useState } from 'react';
import { SparklinePoint } from '@/lib/types';
import { Activity } from 'lucide-react';

interface HeartbeatProps {
  points: SparklinePoint[];
  overallStatus: 'healthy' | 'degraded' | 'critical';
  lastUpdated: string;
}

export const Heartbeat: React.FC<HeartbeatProps> = ({ points, overallStatus, lastUpdated }) => {
  const [hoveredPoint, setHoveredPoint] = useState<SparklinePoint | null>(null);

  const displayPoints = points.length >= 10 ? points : Array.from({ length: 30 }, (_, i) => ({
    checkedAt: new Date(Date.now() - (30 - i) * 5 * 60 * 1000).toISOString(),
    severity: 0,
    status: 'healthy' as const,
  }));

  const svgWidth = 800;
  const svgHeight = 70;
  const paddingY = 12;
  const stepX = svgWidth / Math.max(1, displayPoints.length - 1);

  const coords = displayPoints.map((pt, idx) => {
    const x = idx * stepX;
    let y = svgHeight - paddingY;
    if (pt.severity === 1) y = svgHeight / 2;
    if (pt.severity === 2) y = paddingY;
    return { x, y, pt };
  });

  const pathD = coords.reduce((acc, curr, idx) => {
    return idx === 0 ? `M ${curr.x} ${curr.y}` : `${acc} L ${curr.x} ${curr.y}`;
  }, '');

  const areaD = `${pathD} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`;

  const getStatusColor = (status: string) => {
    if (status === 'critical') return '#DC2626';
    if (status === 'degraded') return '#D97706';
    return '#16A34A';
  };

  const statusColor = getStatusColor(overallStatus);

  return (
    <div className="grafana-panel mb-6 overflow-hidden">
      {/* Grafana Panel Header */}
      <div className="grafana-panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-grafana-blue" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-grafana-text">
            Runable Operations — Pipeline Latency & Health Timeseries <span className="text-grafana-muted font-normal">(60 Cycles)</span>
          </h2>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono-data text-grafana-muted">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-grafana-green inline-block" />
            <span>Healthy (0)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-grafana-amber inline-block" />
            <span>Degraded (1)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-grafana-red inline-block" />
            <span>Critical (2)</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="p-4 bg-white relative">
        <div className="relative w-full h-20 bg-grafana-subtle rounded border border-grafana-border p-1 flex items-center">
          {/* Horizontal Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none p-2 opacity-30">
            <div className="border-b border-dashed border-grafana-muted text-[9px] font-mono-data text-grafana-muted">Critical (2)</div>
            <div className="border-b border-dashed border-grafana-muted text-[9px] font-mono-data text-grafana-muted">Degraded (1)</div>
            <div className="text-[9px] font-mono-data text-grafana-muted">Healthy (0)</div>
          </div>

          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full overflow-visible z-10"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="grafanaSparkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={statusColor} stopOpacity="0.25" />
                <stop offset="100%" stopColor={statusColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            <path d={areaD} fill="url(#grafanaSparkGradient)" />
            <path
              d={pathD}
              fill="none"
              stroke={statusColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {coords.map((c, i) => (
              <circle
                key={i}
                cx={c.x}
                cy={c.y}
                r={c.pt.severity > 0 ? 4 : 2}
                fill={getStatusColor(c.pt.status)}
                className="cursor-pointer hover:r-5 transition-all"
                onMouseEnter={() => setHoveredPoint(c.pt)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            ))}
          </svg>

          {/* Hover Tooltip */}
          {hoveredPoint && (
            <div className="absolute top-2 right-4 bg-white border border-grafana-border px-3 py-1.5 rounded text-xs font-mono-data shadow-md z-20 flex items-center gap-2 text-grafana-text">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getStatusColor(hoveredPoint.status) }}
              />
              <span className="capitalize font-semibold">{hoveredPoint.status}</span>
              <span className="text-grafana-muted">
                ({new Date(hoveredPoint.checkedAt).toLocaleTimeString()})
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-2 text-[11px] font-mono-data text-grafana-muted">
          <span>T-60 Cycles</span>
          <span>Overall Status: <strong className="uppercase" style={{ color: statusColor }}>{overallStatus}</strong></span>
          <span>Last Updated: {new Date(lastUpdated).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};
