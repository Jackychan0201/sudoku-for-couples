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
  mode: 'together' | 'competitive';
  solution: Grid;
  submissions: Submission[];
}

export function ValidationModal({ open, onClose, mode, solution, submissions }: ValidationModalProps) {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg p-6 max-w-5xl w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">Validation results</h3>
          <Button onClick={onClose} size="sm">Close</Button>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Correct solution</h4>
            <SudokuGrid grid={solution} onChange={() => {}} readOnly initial={solution} />
          </div>

          {submissions.map((s, i) => (
            <div key={i}>
              <h4 className="text-sm font-medium mb-2">{s.name ?? s.clientId ?? `Player ${i + 1}`}</h4>
              <SudokuGrid grid={s.grid} onChange={() => {}} readOnly highlights={highlightsFor(s.grid)} />
            </div>
          ))}

          {/* If only one submission in together mode, show an empty column for layout */}
          {submissions.length === 1 && <div />}
        </div>
      </div>
    </div>
  );
}
