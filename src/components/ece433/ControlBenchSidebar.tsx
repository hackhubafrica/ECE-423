import React, { useMemo, useState } from 'react';
import { PanelLeftClose, PanelLeftOpen, Search, X } from 'lucide-react';

export type ControlBenchTabId =
  | 'pid_sim'
  | 'step_analyzer'
  | 'sensitivity'
  | 'correlation'
  | 'opamp_sim'
  | 'bode_gen'
  | 'freq_3d'
  | 'root_locus'
  | 'lqr_design'
  | 'state_exp'
  | 'monitor'
  | 'wiring'
  | 'scripts';

export type ControlBenchCategory =
  | 'Time-Domain'
  | 'Frequency & 3D'
  | 'State-Space & LQR'
  | 'Hardware & Code';

export interface ControlBenchNavItem {
  id: ControlBenchTabId;
  label: string;
  shortCode: string;
  category: ControlBenchCategory;
  description: string;
  keywords: string;
}

export const CONTROL_BENCH_CATEGORIES: ControlBenchCategory[] = [
  'Time-Domain',
  'Frequency & 3D',
  'State-Space & LQR',
  'Hardware & Code',
];

export function getControlBenchNavItems(
  wiringCount: number,
  scriptCount: number
): ControlBenchNavItem[] {
  return [
    {
      id: 'pid_sim',
      label: 'PID Simulator',
      shortCode: 'PID',
      category: 'Time-Domain',
      description: 'Tune Kp, Ki, Kd gains with actuator saturation and anti-windup.',
      keywords: 'pid gains anti-windup step transient',
    },
    {
      id: 'step_analyzer',
      label: 'Step Analyzer',
      shortCode: 'STP',
      category: 'Time-Domain',
      description: 'Compare overshoot, settling, and rise time against 2nd-order bounds.',
      keywords: 'overshoot settling rise time second order bounds',
    },
    {
      id: 'sensitivity',
      label: 'Sensitivity Analysis',
      shortCode: 'SEN',
      category: 'Time-Domain',
      description: 'Measure how Kp, Ki, Kd, and plant shifts alter damping and natural frequency.',
      keywords: 'parametric elasticity jacobian damping natural frequency',
    },
    {
      id: 'correlation',
      label: 'Signal Correlation',
      shortCode: 'COR',
      category: 'Time-Domain',
      description: 'Compute setpoint-to-output cross-correlation, tracking lag, and RMSE.',
      keywords: 'cross correlation tracking rmse lag delay noise',
    },
    {
      id: 'bode_gen',
      label: 'Bode Plot & Margins',
      shortCode: 'BOD',
      category: 'Frequency & 3D',
      description: 'Evaluate gain/phase margins and verify lead or lag compensation.',
      keywords: 'phase gain margin crossover lead lag compensator',
    },
    {
      id: 'freq_3d',
      label: '3D Pole-Zero Bode',
      shortCode: '3D',
      category: 'Frequency & 3D',
      description: 'Explore the 3D Laplace surface linking s-plane poles to Bode response.',
      keywords: 'threejs laplace surface s-plane pole zero magnitude',
    },
    {
      id: 'root_locus',
      label: 'Root Locus',
      shortCode: 'RL',
      category: 'Frequency & 3D',
      description: 'Trace closed-loop pole trajectories as loop gain K varies.',
      keywords: 'evans poles stability region gain sweep',
    },
    {
      id: 'lqr_design',
      label: 'LQR Optimal',
      shortCode: 'LQR',
      category: 'State-Space & LQR',
      description: 'Weight Q and R cost matrices to compute optimal state-feedback gain K.',
      keywords: 'care riccati q r matrix optimal feedback gain k',
    },
    {
      id: 'state_exp',
      label: 'e^(At) & Trajectories',
      shortCode: 'eAt',
      category: 'State-Space & LQR',
      description: 'Visualize matrix exponential growth and 2D LTI phase portraits.',
      keywords: 'matrix exponential phase portrait eigenvalues d3',
    },
    {
      id: 'opamp_sim',
      label: 'Op-Amp PID Circuit',
      shortCode: 'AMP',
      category: 'Hardware & Code',
      description: 'Switch P, PI, PD, and PID op-amp topologies with live RC values.',
      keywords: 'analog integrator differentiator summer resistors capacitors',
    },
    {
      id: 'monitor',
      label: 'Live Serial Monitor',
      shortCode: 'SER',
      category: 'Hardware & Code',
      description: 'Stream live ESP32 closed-loop telemetry and send commands via Web Serial.',
      keywords: 'esp32 web serial uart console telemetry',
    },
    {
      id: 'wiring',
      label: `Op-Amp & ESP32 Wiring (${wiringCount})`,
      shortCode: 'WIR',
      category: 'Hardware & Code',
      description: 'Inspect analog conditioning schematics, pinouts, and lab BOM parts.',
      keywords: 'hardware schematic pins bom conditioning',
    },
    {
      id: 'scripts',
      label: `MATLAB / Python / ESP32 (${scriptCount})`,
      shortCode: 'SCR',
      category: 'Hardware & Code',
      description: 'Copy or download ready-to-run MATLAB, Python, and ESP32 code.',
      keywords: 'code export firmware simulink script',
    },
  ];
}

interface ControlBenchSidebarProps {
  items: ControlBenchNavItem[];
  activeTab: ControlBenchTabId;
  collapsed: boolean;
  filterQuery: string;
  onSelectTab: (tab: ControlBenchTabId) => void;
  onToggleCollapse: () => void;
  onFilterChange: (query: string) => void;
}

export const ControlBenchSidebar: React.FC<ControlBenchSidebarProps> = ({
  items,
  activeTab,
  collapsed,
  filterQuery,
  onSelectTab,
  onToggleCollapse,
  onFilterChange,
}) => {
  const [hoveredItemId, setHoveredItemId] = useState<ControlBenchTabId | null>(null);
  const normalizedQuery = filterQuery.trim().toLowerCase();

  const groupedItems = useMemo(() => {
    return CONTROL_BENCH_CATEGORIES.map((category) => {
      const catItems = items.filter((item) => {
        if (item.category !== category) return false;
        if (collapsed || !normalizedQuery) return true;
        return (
          item.label.toLowerCase().includes(normalizedQuery) ||
          item.shortCode.toLowerCase().includes(normalizedQuery) ||
          item.category.toLowerCase().includes(normalizedQuery) ||
          item.description.toLowerCase().includes(normalizedQuery) ||
          item.keywords.toLowerCase().includes(normalizedQuery)
        );
      });
      return { category, items: catItems };
    }).filter((group) => group.items.length > 0);
  }, [items, collapsed, normalizedQuery]);

  const previewItem =
    items.find((i) => i.id === hoveredItemId) ??
    items.find((i) => i.id === activeTab) ??
    items[0];

  return (
    <aside
      aria-label="Control Bench Simulator Navigation"
      className={`hidden lg:flex lg:flex-col shrink-0 lg:sticky lg:top-20 rounded-xl border border-slate-200 bg-white overflow-hidden transition-[width] duration-200 ease-out max-h-[calc(100vh-6rem)] ${
        collapsed ? 'lg:w-[68px]' : 'lg:w-[252px]'
      }`}
    >
      {/* Top Bar: Title + Collapse Toggle */}
      <div
        className={`flex items-center border-b border-slate-200 bg-slate-50/70 px-3 py-2.5 shrink-0 ${
          collapsed ? 'justify-center' : 'justify-between gap-2'
        }`}
      >
        {!collapsed && (
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-900">Simulators</span>
            <span className="ml-1.5 font-mono text-[11px] text-slate-500 tabular-nums">
              ({items.length})
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? 'Expand simulator sidebar' : 'Collapse simulator sidebar'}
          title={collapsed ? 'Expand simulator sidebar' : 'Collapse simulator sidebar'}
          className="cursor-pointer rounded-md p-1.5 text-slate-600 hover:bg-slate-200/70 hover:text-slate-950 transition-colors focus-visible:outline-2 focus-visible:outline-sky-600"
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Quick-Jump Filter Box (Expanded Mode) */}
      {!collapsed && (
        <div className="border-b border-slate-100 px-3 py-2.5 shrink-0">
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => onFilterChange(e.target.value)}
              placeholder="Jump to simulator..."
              aria-label="Filter Control Bench simulators"
              title="Type a simulator name, topic, or short code to filter"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-8 pr-7 text-xs text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:bg-white focus:outline-none"
            />
            {filterQuery && (
              <button
                type="button"
                onClick={() => onFilterChange('')}
                aria-label="Clear simulator filter"
                title="Clear filter"
                className="cursor-pointer absolute right-2 rounded p-0.5 text-slate-400 hover:text-slate-700"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Scrollable Category & Simulator List */}
      <nav
        aria-label="Simulators by discipline"
        className="flex-1 overflow-y-auto px-2 py-2.5 space-y-3"
        onMouseLeave={() => setHoveredItemId(null)}
      >
        {groupedItems.length === 0 ? (
          <div className="px-2 py-6 text-center space-y-2">
            <p className="text-xs text-slate-500">No matching simulators.</p>
            <button
              type="button"
              onClick={() => onFilterChange('')}
              className="cursor-pointer text-xs font-semibold text-sky-700 hover:underline"
            >
              Clear filter
            </button>
          </div>
        ) : (
          groupedItems.map((group, groupIdx) => (
            <div
              key={group.category}
              className={groupIdx > 0 ? 'border-t border-slate-100 pt-2.5' : ''}
            >
              {!collapsed && (
                <div className="px-2.5 pb-1 text-[11px] font-semibold tracking-wide text-slate-400">
                  {group.category}
                </div>
              )}

              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectTab(item.id)}
                      onMouseEnter={() => setHoveredItemId(item.id)}
                      onFocus={() => setHoveredItemId(item.id)}
                      onBlur={() => setHoveredItemId(null)}
                      aria-current={isActive ? 'page' : undefined}
                      aria-label={`${item.label}: ${item.description}`}
                      title={`${item.label} (${item.category}) — ${item.description}`}
                      className={`cursor-pointer w-full rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-sky-600 ${
                        collapsed
                          ? 'py-2 px-1 text-center font-mono text-[11px] font-semibold tabular-nums'
                          : 'px-2.5 py-1.5 text-left text-xs truncate'
                      } ${
                        isActive
                          ? 'bg-sky-50 text-sky-900 font-semibold ring-1 ring-inset ring-sky-200'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950 font-medium'
                      }`}
                    >
                      {collapsed ? item.shortCode : item.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </nav>

      {/* Brief Hover / Focus Tooltip Preview Footer (Expanded Mode) */}
      {!collapsed && (
        <div
          role="status"
          aria-live="polite"
          className="border-t border-slate-200 bg-slate-50/70 px-3 py-2.5 text-[11px] leading-snug text-slate-600 shrink-0"
        >
          <div className="font-semibold text-slate-900 truncate">
            {previewItem.label}
          </div>
          <p className="mt-0.5 line-clamp-2 text-slate-500">
            {previewItem.description}
          </p>
        </div>
      )}
    </aside>
  );
};
