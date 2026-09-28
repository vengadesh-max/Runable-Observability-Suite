'use client';

/**
 * @file components/ServiceTable.tsx
 * @description Grafana-style Monitored Services & Container Pool table (Warm & Light theme).
 */

import React, { useState } from 'react';
import { ServiceStatus, Status } from '@/lib/types';
import { Server, Database, Globe, CheckCircle2, AlertTriangle, AlertOctagon, Filter } from 'lucide-react';

interface ServiceTableProps {
  services: ServiceStatus[];
}

export const ServiceTable: React.FC<ServiceTableProps> = ({ services }) => {
  const [filter, setFilter] = useState<'all' | Status>('all');

  const filteredServices = services.filter((s) => (filter === 'all' ? true : s.status === filter));

  const getStatusBadge = (status: Status) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono-data badge-healthy font-semibold">
            <CheckCircle2 className="w-3 h-3 text-grafana-green" />
            Healthy
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono-data badge-degraded font-semibold">
            <AlertTriangle className="w-3 h-3 text-grafana-amber" />
            Degraded
          </span>
        );
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono-data badge-critical font-bold animate-pulse">
            <AlertOctagon className="w-3 h-3 text-grafana-red" />
            Critical
          </span>
        );
    }
  };

  const getServiceIcon = (checkType: string) => {
    if (checkType === 'db_health') return <Database className="w-4 h-4 text-indigo-600" />;
    if (checkType === 'api_watch') return <Globe className="w-4 h-4 text-grafana-blue" />;
    return <Server className="w-4 h-4 text-grafana-orange" />;
  };

  return (
    <div className="grafana-panel">
      {/* Panel Header */}
      <div className="grafana-panel-header flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-grafana-blue" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-grafana-text">
            Runable Infrastructure & Monitored Services
          </h2>
          <span className="text-xs font-mono-data text-grafana-muted font-normal">({services.length} Monitored)</span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 font-mono-data text-xs">
          <Filter className="w-3.5 h-3.5 text-grafana-muted mr-1" />
          {(['all', 'healthy', 'degraded', 'critical'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-2 py-0.5 rounded transition-all capitalize ${
                filter === st
                  ? 'bg-grafana-blue text-white font-semibold shadow-xs'
                  : 'bg-white text-grafana-muted hover:text-grafana-text border border-grafana-border'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table Body */}
      <div className="overflow-x-auto p-2">
        <table className="w-full text-left font-mono-data text-xs">
          <thead>
            <tr className="text-grafana-muted border-b border-grafana-border uppercase tracking-wider text-[10px] bg-grafana-subtle/50">
              <th className="py-2.5 px-3">Service Identifier</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Metric Value</th>
              <th className="py-2.5 px-3">Last Checked</th>
              <th className="py-2.5 px-3">Message / Diagnostics</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-grafana-border">
            {filteredServices.map((service) => (
              <tr key={service.serviceName} className="hover:bg-grafana-hover/50 transition-colors">
                <td className="py-2.5 px-3 font-semibold text-grafana-text flex items-center gap-2">
                  {getServiceIcon(service.checkType)}
                  <span>{service.serviceName}</span>
                </td>
                <td className="py-2.5 px-3 text-grafana-muted">{service.checkType}</td>
                <td className="py-2.5 px-3">{getStatusBadge(service.status)}</td>
                <td className="py-2.5 px-3 font-semibold text-grafana-text">
                  {service.metricValue !== null
                    ? `${service.metricValue} ${service.metricUnit || ''}`
                    : 'N/A'}
                </td>
                <td className="py-2.5 px-3 text-grafana-muted">
                  {new Date(service.lastChecked).toLocaleTimeString()}
                </td>
                <td className="py-2.5 px-3 text-grafana-muted max-w-xs truncate" title={service.message}>
                  {service.message}
                </td>
              </tr>
            ))}

            {filteredServices.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-grafana-muted italic">
                  No services matching current status filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
