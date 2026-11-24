import React from 'react';
import { WorkspaceTab } from '../types/ece423';

interface TopNavProps {
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onStartCatQuiz: () => void;
}

const NAV_ITEMS: { id: WorkspaceTab; label: string }[] = [
  { id: WorkspaceTab.SPRINT, label: 'Study Sprint' },
  { id: WorkspaceTab.THEORY, label: 'Theory & History' },
  { id: WorkspaceTab.LABS, label: 'Signal Labs' },
  { id: WorkspaceTab.BENCH, label: 'Practical Bench' },
  { id: WorkspaceTab.SOLVER, label: 'Solver & Formulas' },
  { id: WorkspaceTab.QUIZ, label: 'Timed Quiz' },
];

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onSelectTab,
  onStartCatQuiz,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-[1360px] items-center justify-between gap-6 px-6 py-3.5">
        {/* Zone 1: Single-element wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab(WorkspaceTab.SPRINT)}
          className="cursor-pointer text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600"
        >
          ECE 423 Lab
        </button>

        {/* Zone 2: Single-line navigation links */}
        <nav
          aria-label="Primary workspace navigation"
          className="hidden md:flex items-center gap-5 lg:gap-6 text-sm font-medium text-slate-600"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`cursor-pointer py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-sky-600 ${
                  isActive
                    ? 'border-sky-600 text-slate-950 font-semibold'
                    : 'border-transparent text-slate-600 hover:text-slate-950 hover:border-slate-300'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary CTA */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onStartCatQuiz}
            className="cursor-pointer rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-sky-700 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
          >
            Start CAT Quiz
          </button>
        </div>
      </div>

      {/* Compact mobile nav bar */}
      <nav
        aria-label="Mobile workspace navigation"
        className="flex md:hidden items-center justify-between border-t border-slate-100 px-4 py-2 text-xs font-medium text-slate-600 overflow-x-auto gap-4"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`cursor-pointer py-1 whitespace-nowrap shrink-0 ${
                isActive ? 'text-sky-700 font-semibold underline underline-offset-4' : 'text-slate-600'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
