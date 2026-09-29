'use client';

/**
 * @file components/Heartbeat.tsx
 * @description Editorial Neoclassical Timeseries Heartbeat chart panel.
 */

import React, { useState } from 'react';
import { SparklinePoint, Status } from '@/lib/types';
import { Activity } from 'lucide-react';

interface HeartbeatProps {
  points: SparklinePoint[];
  overallStatus: Status;
  lastUpdated: string;
}

export const Heartbeat: React.FC<HeartbeatProps> = ({ points = [], overallStatus = 'unknown', lastUpdated }) => {
  const [hoveredPoint, setHoveredPoint] = useState<SparklinePoint | null>(null);

  const displayPoints = points;

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
    if (status === 'critical') return '#7B1113';
    if (status === 'degraded') return '#C85A32';
    if (status === 'unknown') return '#57534E';
    return '#276749';
  };

  const statusColor = getStatusColor(overallStatus);

  return (
    <div className="editorial-card mb-6 overflow-hidden bg-white">
      {/* Editorial Header Strip */}
      <div className="editorial-header-strip flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-burgundy" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-editorial-text font-editorial-serif italic">
            Pipeline Latency & Health Timeseries <span className="text-editorial-muted font-normal font-mono-data">(60 Cycles)</span>
          </h2>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono-data text-editorial-muted">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 inline-block" />
            <span>Healthy (0)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-burntOrange inline-block" />
            <span>Degraded (1)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-burgundy inline-block" />
            <span>Critical (2)</span>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="p-4 bg-white relative">
        <div className="relative w-full h-20 bg-sand-subtle rounded border border-sand-border p-1 flex items-center">
          {/* Horizontal Grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none p-2 opacity-30">
            <div className="border-b border-dashed border-editorial-muted text-[9px] font-mono-data text-editorial-muted">Critical (2)</div>
            <div className="border-b border-dashed border-editorial-muted text-[9px] font-mono-data text-editorial-muted">Degraded (1)</div>
            <div className="text-[9px] font-mono-data text-editorial-muted">Healthy (0)</div>
          </div>

          {displayPoints.length > 0 ? <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full overflow-visible z-10"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="editorialSparkGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={statusColor} stopOpacity="0.25" />
                <stop offset="100%" stopColor={statusColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            <path d={areaD} fill="url(#editorialSparkGradient)" />
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
          </svg> : (
            <p className="relative z-10 w-full text-center text-xs font-mono-data text-editorial-muted">No completed checks yet.</p>
          )}

          {/* Hover Tooltip */}
          {hoveredPoint && (
            <div className="absolute top-2 right-4 bg-white border border-sand-border px-3 py-1.5 rounded text-xs font-mono-data shadow-md z-20 flex items-center gap-2 text-editorial-text">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: getStatusColor(hoveredPoint.status) }}
              />
              <span className="capitalize font-semibold">{hoveredPoint.status}</span>
              <span className="text-editorial-muted">
                ({new Date(hoveredPoint.checkedAt).toLocaleTimeString()})
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-2 text-[11px] font-mono-data text-editorial-muted">
          <span>T-60 Cycles</span>
          <span>Overall Status: <strong className="uppercase font-semibold" style={{ color: statusColor }}>{overallStatus}</strong></span>
          <span>Last Updated: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'Not checked'}</span>
        </div>
      </div>
    </div>
  );
};
