'use client';

import React from 'react';
import { SudokuGrid } from './SudokuGrid';
import { Button } from '@/components/ui/button';

type Grid = (number | null)[][];

interface Submission {
  clientId?: string;
  name?: string;
  grid: Grid;
}

interface ValidationModalProps {
  open: boolean;
  onClose: () => void;
  onEnd: () => void;
  mode: 'together' | 'competitive';
  solution: Grid;
  submissions: Submission[];
  playerLabels?: Record<string, string>;
}

export function ValidationModal({ open, onClose, mode, solution, submissions, onEnd, playerLabels }: ValidationModalProps) {
  if (!open) return null;

  // build highlights for each submission comparing to solution
  const highlightsFor = (grid: Grid) => {
    const h: boolean[][] = Array.from({ length: 9 }, () => Array(9).fill(false));
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== solution[r][c]) h[r][c] = true;
      }
    }
    return h;
  };

  const mistakesCount = (grid: Grid) => {
    let mistakes = 0;
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== solution[r][c]) mistakes++;
      }
    }
    return mistakes;
  };

  // compute result message
  let resultMessage: string | null = null;

  if (mode === 'competitive' && submissions.length >= 2) {
    const a = mistakesCount(submissions[0].grid);
    const b = mistakesCount(submissions[1].grid);
    const nameA = playerLabels?.[submissions[0].clientId ?? ''] ?? submissions[0].name ?? submissions[0].clientId ?? 'Player 1';
    const nameB = playerLabels?.[submissions[1].clientId ?? ''] ?? submissions[1].name ?? submissions[1].clientId ?? 'Player 2';
    if (a < b) resultMessage = `${nameA} wins — ${a} vs ${b} mistakes`;
    else if (b < a) resultMessage = `${nameB} wins — ${b} vs ${a} mistakes`;
    else resultMessage = `Tie — both have ${a} mistakes`;
  }

  // together mode: if the (single) submission has zero mistakes, show a win message
  if (mode === 'together' && submissions.length >= 1) {
    const m = mistakesCount(submissions[0].grid);
    if (m === 0) resultMessage = 'Perfect! No mistakes — you solved it together 🎉';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6">
      <div className="bg-white rounded-lg p-8 max-w-6xl w-full shadow-lg">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold">Validation results</h3>
          <Button onClick={onEnd} size="sm" variant="destructive">End game</Button>
        </div>

        {resultMessage && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
            <strong className="text-lg">{resultMessage}</strong>
          </div>
        )}

        <div className={mode === 'together' ? 'grid grid-cols-2 gap-6' : 'grid grid-cols-3 gap-6'}>
          <div className="p-3 bg-gray-50 rounded">
            <h4 className="text-sm font-medium mb-3">Correct solution</h4>
            <SudokuGrid grid={solution} onChange={() => {}} readOnly initial={solution} />
          </div>

          {submissions.map((s, i) => {
            const label = mode === 'together'
              ? 'Your solution'
              : (playerLabels?.[s.clientId ?? ''] ?? s.name ?? s.clientId ?? `Player ${i + 1}`);
            return (
              <div key={i} className="p-3 bg-gray-50 rounded">
                <div className="flex items-baseline justify-between mb-3">
                  <h4 className="text-sm font-medium">{label}</h4>
                  <span className="text-sm text-gray-600">Mistakes: {mistakesCount(s.grid)}</span>
                </div>
                <SudokuGrid grid={s.grid} onChange={() => {}} readOnly highlights={highlightsFor(s.grid)} />
              </div>
            );
          })}

          {/* If competitive and only one submission present (edge), keep layout consistent */}
          {mode === 'competitive' && submissions.length === 1 && <div className="p-3 bg-gray-50 rounded" />}
        </div>
      </div>
    </div>
  );
}
