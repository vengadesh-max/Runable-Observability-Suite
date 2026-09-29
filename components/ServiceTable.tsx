'use client';

/**
 * @file components/ServiceTable.tsx
 * @description Editorial Neoclassical Monitored Infrastructure Table.
 */

import React, { useState } from 'react';
import { ServiceStatus, Status } from '@/lib/types';
import { Server, Database, Globe, CheckCircle2, AlertTriangle, AlertOctagon, Filter } from 'lucide-react';

interface ServiceTableProps {
  services: ServiceStatus[];
}

export const ServiceTable: React.FC<ServiceTableProps> = ({ services = [] }) => {
  const [filter, setFilter] = useState<'all' | Status>('all');

  const filteredServices = services.filter((s) => (filter === 'all' ? true : s.status === filter));

  const getStatusBadge = (status: Status) => {
    switch (status) {
      case 'healthy':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono-data badge-healthy font-semibold">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            Healthy
          </span>
        );
      case 'degraded':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono-data badge-degraded font-semibold">
            <AlertTriangle className="w-3 h-3 text-burntOrange" />
            Degraded
          </span>
        );
      case 'critical':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono-data badge-critical font-bold animate-pulse">
            <AlertOctagon className="w-3 h-3 text-burgundy" />
            Critical
          </span>
        );
      case 'unknown':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono-data border border-stone-300 bg-stone-100 text-stone-700 font-semibold">
            Awaiting Check
          </span>
        );
    }
  };

  const getServiceIcon = (checkType: string) => {
    if (checkType === 'db_health') return <Database className="w-4 h-4 text-stone-700" />;
    if (checkType === 'api_watch') return <Globe className="w-4 h-4 text-burgundy" />;
    return <Server className="w-4 h-4 text-burntOrange" />;
  };

  return (
    <div className="editorial-card bg-white">
      {/* Panel Header */}
      <div className="editorial-header-strip flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Server className="w-4 h-4 text-burgundy" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-editorial-text font-editorial-serif italic">
            Infrastructure & Monitored Services
          </h2>
          <span className="text-xs font-mono-data text-editorial-muted font-normal">({services.length} Monitored)</span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 font-mono-data text-xs">
          <Filter className="w-3.5 h-3.5 text-editorial-muted mr-1" />
          {(['all', 'healthy', 'degraded', 'critical'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-2 py-0.5 rounded transition-all capitalize ${
                filter === st
                  ? 'bg-burgundy text-white font-semibold shadow-xs'
                  : 'bg-white text-editorial-muted hover:text-editorial-text border border-sand-border'
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
            <tr className="text-editorial-muted border-b border-sand-border uppercase tracking-wider text-[10px] bg-sand-subtle">
              <th className="py-2.5 px-3">Service Identifier</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Status</th>
              <th className="py-2.5 px-3">Metric Value</th>
              <th className="py-2.5 px-3">Last Checked</th>
              <th className="py-2.5 px-3">Message / Diagnostics</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-border">
            {filteredServices.map((service) => (
              <tr key={service.serviceName} className="hover:bg-sand-subtle/60 transition-colors">
                <td className="py-2.5 px-3 font-semibold text-editorial-text flex items-center gap-2 font-sans">
                  {getServiceIcon(service.checkType)}
                  <span>{service.serviceName}</span>
                </td>
                <td className="py-2.5 px-3 text-editorial-muted">{service.checkType}</td>
                <td className="py-2.5 px-3">{getStatusBadge(service.status)}</td>
                <td className="py-2.5 px-3 font-semibold text-editorial-text">
                  {service.metricValue !== null
                    ? `${service.metricValue} ${service.metricUnit || ''}`
                    : 'N/A'}
                </td>
                <td className="py-2.5 px-3 text-editorial-muted">
                  {service.lastChecked ? new Date(service.lastChecked).toLocaleTimeString() : 'Not checked'}
                </td>
                <td className="py-2.5 px-3 text-editorial-muted max-w-xs truncate" title={service.message}>
                  {service.message}
                </td>
              </tr>
            ))}

            {filteredServices.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-editorial-muted italic">
                  No services configured. Add database and endpoint settings to your environment, then run a check.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
