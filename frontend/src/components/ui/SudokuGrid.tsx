// src/components/SudokuGrid.tsx
'use client';

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

type Grid = (number | null)[][];

interface SudokuGridProps {
  grid: Grid;
  onChange: (row: number, col: number, value: number | null) => void;
  readOnly?: boolean;
  // initial puzzle to mark given (immutable) cells
  initial?: Grid;
  // optional 9x9 boolean grid marking cells to highlight (e.g., differences)
  highlights?: (boolean | undefined)[][];
}

export function SudokuGrid({ grid, onChange, readOnly = false, initial, highlights }: SudokuGridProps) {
  return (
    <div className="grid grid-cols-9 gap-0 border-2 border-gray-800 w-fit mx-auto">
      {grid.map((row, r) =>
        row.map((cell, c) => {
          const isGiven = !!(initial && initial[r] && initial[r][c] != null);

          const isHighlighted = !!(highlights && highlights[r] && highlights[r][c]);

          return (
            <div
              key={`${r}-${c}`}
              className={cn(
                'w-10 h-10 border border-gray-400 flex items-center justify-center',
                (r % 3 === 2 && r !== 8) && 'border-b-2 border-b-gray-800',
                (c % 3 === 2 && c !== 8) && 'border-r-2 border-r-gray-800',
                isHighlighted && 'bg-red-100'
              )}
            >
              <Input
                type="text"
                maxLength={1}
                value={cell ?? ''}
                readOnly={readOnly || isGiven}
                className={cn(
                  'w-full h-full text-center p-0 border-0 font-medium',
                  isGiven ? 'text-blue-700' : 'text-gray-900'
                )}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '') onChange(r, c, null);
                  else if (/[1-9]/.test(val)) onChange(r, c, parseInt(val));
                }}
              />
            </div>
          );
        })
      )}
    </div>
  );
}
