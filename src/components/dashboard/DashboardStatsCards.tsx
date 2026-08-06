// src/components/dashboard/DashboardStatsCards.tsx
import React, { useMemo } from 'react';
import {
  Users,
  Search,
  ArrowUpRight,
  Globe,
  Smartphone,
  Phone,
  Building
} from 'lucide-react';

interface SourceStat {
  name: string;
  count: number;
  percentage: number;
}

interface DashboardStatsCardsProps {
  stats: {
    totalLeads: number;
    topSources: SourceStat[];
  };
}

export const DashboardStatsCards: React.FC<DashboardStatsCardsProps> = ({ stats }) => {
  const getSourceIconConfig = (name: string) => {
    const n = name.toLowerCase();
    if (n.includes('idealista')) {
      return {
        icon: <Building size={14} />,
        bg: 'bg-indigo-50 text-indigo-600',
        color: 'text-indigo-600',
        barColor: 'bg-indigo-500',
        hex: '#6366f1'
      };
    }
    if (n.includes('web')) {
      return {
        icon: <Globe size={14} />,
        bg: 'bg-sky-50 text-sky-600',
        color: 'text-sky-600',
        barColor: 'bg-sky-500',
        hex: '#0ea5e9'
      };
    }
    if (n.includes('google')) {
      return {
        icon: <Search size={14} />,
        bg: 'bg-amber-50 text-amber-600',
        color: 'text-amber-600',
        barColor: 'bg-amber-500',
        hex: '#f59e0b'
      };
    }
    if (n.includes('instagram')) {
      return {
        icon: <Smartphone size={14} />,
        bg: 'bg-pink-50 text-pink-600',
        color: 'text-pink-600',
        barColor: 'bg-pink-500',
        hex: '#ec4899'
      };
    }
    if (n.includes('facebook')) {
      return {
        icon: <Users size={14} />,
        bg: 'bg-blue-50 text-blue-600',
        color: 'text-blue-600',
        barColor: 'bg-blue-500',
        hex: '#3b82f6'
      };
    }
    if (n.includes('referido')) {
      return {
        icon: <Users size={14} />,
        bg: 'bg-purple-50 text-purple-600',
        color: 'text-purple-600',
        barColor: 'bg-purple-500',
        hex: '#a855f7'
      };
    }
    if (n.includes('llamada')) {
      return {
        icon: <Phone size={14} />,
        bg: 'bg-emerald-50 text-emerald-600',
        color: 'text-emerald-600',
        barColor: 'bg-emerald-500',
        hex: '#10b981'
      };
    }
    return {
      icon: <Globe size={14} />,
      bg: 'bg-slate-100 text-slate-600',
      color: 'text-slate-600',
      barColor: 'bg-slate-500',
      hex: '#94a3b8'
    };
  };

  const mergedSources = useMemo(() => {
    const standardSources = [
      'Idealista',
      'Web',
      'Google',
      'Instagram',
      'Facebook',
      'Referido',
      'Llamada',
      'Otro'
    ];

    const sourceMap = new Map<string, { count: number; percentage: number }>();
    stats.topSources.forEach(src => {
      sourceMap.set(src.name.toLowerCase(), { count: src.count, percentage: src.percentage });
    });

    const list = standardSources.map(name => {
      const match = sourceMap.get(name.toLowerCase());
      return {
        name,
        count: match ? match.count : 0,
        percentage: match ? match.percentage : 0
      };
    });

    stats.topSources.forEach(src => {
      const isStandard = standardSources.some(s => s.toLowerCase() === src.name.toLowerCase());
      if (!isStandard) {
        list.push({
          name: src.name,
          count: src.count,
          percentage: src.percentage
        });
      }
    });

    return list;
  }, [stats.topSources]);

  const donutSegments = useMemo(() => {
    const radius = 36;
    const circumference = 2 * Math.PI * radius;
    let accumulatedPercentage = 0;

    const activeSources = mergedSources.filter(s => s.percentage > 0);

    if (activeSources.length === 0) {
      return [{
        name: 'Sin datos',
        percentage: 100,
        strokeLength: circumference,
        strokeOffset: 0,
        hex: '#e2e8f0'
      }];
    }

    return activeSources.map((source) => {
      const percentage = source.percentage;
      const strokeLength = (percentage / 100) * circumference;
      const strokeOffset = (accumulatedPercentage / 100) * circumference;
      accumulatedPercentage += percentage;

      const config = getSourceIconConfig(source.name);

      return {
        name: source.name,
        percentage,
        strokeLength,
        strokeOffset,
        hex: config.hex
      };
    });
  }, [mergedSources]);

  return (
    <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">Resumen de Captación y Orígenes</h3>
        <p className="text-slate-500 text-xs font-semibold mt-0.5">Distribución general de prospectos y rendimiento de canales de entrada.</p>
      </div>

      {/* 3 Columns Flex Layout */}
      <div className="flex flex-col lg:flex-row gap-8 lg:items-center">
        {/* COLUMNA 1: Total Clientes & Donut Chart */}
        <div className="w-full lg:w-[220px] shrink-0 flex flex-col items-center lg:items-start gap-4 lg:border-r border-slate-100 pr-0 lg:pr-8">
          <div>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest text-center lg:text-left">Clientes Registrados</p>
            <div className="flex items-baseline gap-2 mt-1 justify-center lg:justify-start">
              <span className="text-4xl font-extrabold text-slate-800 tracking-tight">{stats.totalLeads}</span>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center shrink-0">
                <ArrowUpRight size={12} className="mr-0.5" /> +12%
              </span>
            </div>
          </div>

          {/* Donut Chart */}
          <div className="relative w-[130px] h-[130px] shrink-0 mx-auto lg:mx-0 mt-2">
            <svg width="130" height="130" viewBox="0 0 100 100" className="transform -rotate-90">
              <circle
                cx="50"
                cy="50"
                r="36"
                fill="transparent"
                stroke="#f8fafc"
                strokeWidth="10"
              />
              {donutSegments.map((segment, index) => (
                <circle
                  key={index}
                  cx="50"
                  cy="50"
                  r="36"
                  fill="transparent"
                  stroke={segment.hex}
                  strokeWidth="10"
                  strokeDasharray={`${segment.strokeLength} ${2 * Math.PI * 36 - segment.strokeLength}`}
                  strokeDashoffset={-segment.strokeOffset}
                  strokeLinecap={segment.percentage === 100 ? 'butt' : 'round'}
                  className="transition-all duration-500 ease-out"
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-slate-800 leading-none">{stats.totalLeads}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">leads</span>
            </div>
          </div>
        </div>

        {/* COLUMNA 2: Fuentes Principales (1 a 4) */}
        <div className="flex-1 space-y-4 w-full">
          {mergedSources.slice(0, 4).map((source) => {
            const iconConfig = getSourceIconConfig(source.name);
            return (
              <div key={source.name} className="flex items-center gap-3 p-2 hover:bg-slate-50/50 rounded-xl transition-all duration-200">
                <div className={`p-2 rounded-lg shrink-0 ${iconConfig.bg} ${iconConfig.color}`}>
                  {iconConfig.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs font-bold text-slate-700 truncate">{source.name}</span>
                    <span className="text-xs font-black text-slate-800 ml-2">{source.percentage}% <span className="text-[10px] text-slate-400 font-medium">({source.count})</span></span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${iconConfig.barColor}`}
                      style={{ width: `${source.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* COLUMNA 3: Fuentes Secundarias (5 a 8+) */}
        <div className="flex-1 space-y-4 w-full">
          {mergedSources.slice(4).map((source) => {
            const iconConfig = getSourceIconConfig(source.name);
            return (
              <div key={source.name} className="flex items-center gap-3 p-2 hover:bg-slate-50/50 rounded-xl transition-all duration-200">
                <div className={`p-2 rounded-lg shrink-0 ${iconConfig.bg} ${iconConfig.color}`}>
                  {iconConfig.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <span className="text-xs font-bold text-slate-700 truncate">{source.name}</span>
                    <span className="text-xs font-black text-slate-800 ml-2">{source.percentage}% <span className="text-[10px] text-slate-400 font-medium">({source.count})</span></span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${iconConfig.barColor}`}
                      style={{ width: `${source.percentage}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DashboardStatsCards;
