import React from 'react';
import { BoardState, PlayerSymbol } from '../types';

interface GameBoardProps {
  board: BoardState;
  winningLine?: number[] | null;
  currentTurn: PlayerSymbol;
  isMyTurn: boolean;
  isGameOver: boolean;
  isPreviewMode: boolean;
  onCellClick: (index: number) => void;
  mySymbol?: PlayerSymbol;
  statusMessage?: string;
  opponentIsAI?: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({
  board,
  winningLine,
  currentTurn,
  isMyTurn,
  isGameOver,
  isPreviewMode,
  onCellClick,
  mySymbol,
  statusMessage,
  opponentIsAI,
}) => {
  const isWinningCell = (index: number) => {
    return winningLine ? winningLine.includes(index) : false;
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      {/* 3x3 Grid Frame */}
      <div
        id="game-board-container"
        className="relative bg-slate-100 p-3 sm:p-4 rounded-3xl shadow-sm border border-slate-200/80 w-full max-w-[340px] sm:max-w-[380px] aspect-square select-none"
      >
        <div className="grid grid-cols-3 grid-rows-3 gap-2 sm:gap-3 w-full h-full">
          {board.map((cell, index) => {
            const isWinner = isWinningCell(index);
            const canClick = !isGameOver && !isPreviewMode && isMyTurn && cell === null;

            return (
              <button
                key={index}
                id={`board-cell-${index}`}
                onClick={() => canClick && onCellClick(index)}
                disabled={!canClick}
                aria-label={`Cell ${index + 1}, contains ${cell || 'empty'}`}
                className={`relative flex items-center justify-center rounded-2xl font-bold transition-all duration-200 aspect-square ${
                  isWinner
                    ? 'bg-emerald-50 border-2 border-emerald-500 shadow-md scale-[1.02] z-10'
                    : cell
                    ? 'bg-white border border-slate-200/90 shadow-xs'
                    : canClick
                    ? 'bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-md cursor-pointer hover:bg-indigo-50/20 active:scale-95'
                    : 'bg-white/70 border border-slate-200/60 cursor-default'
                }`}
              >
                {/* Cell Position Indicator subtle number on hover for empty playable cell */}
                {!cell && canClick && mySymbol && (
                  <span className="opacity-0 hover:opacity-30 text-3xl font-black transition-opacity text-slate-400 select-none">
                    {mySymbol}
                  </span>
                )}

                {/* X Mark */}
                {cell === 'X' && (
                  <svg
                    viewBox="0 0 100 100"
                    className={`w-3/5 h-3/5 transition-transform duration-300 ${
                      isWinner ? 'text-emerald-600 scale-110' : 'text-indigo-600'
                    }`}
                  >
                    <line
                      x1="18"
                      y1="18"
                      x2="82"
                      y2="82"
                      stroke="currentColor"
                      strokeWidth="14"
                      strokeLinecap="round"
                    />
                    <line
                      x1="82"
                      y1="18"
                      x2="18"
                      y2="82"
                      stroke="currentColor"
                      strokeWidth="14"
                      strokeLinecap="round"
                    />
                  </svg>
                )}

                {/* O Mark */}
                {cell === 'O' && (
                  <svg
                    viewBox="0 0 100 100"
                    className={`w-3/5 h-3/5 transition-transform duration-300 ${
                      isWinner ? 'text-emerald-600 scale-110' : 'text-amber-500'
                    }`}
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="33"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="14"
                      strokeLinecap="round"
                    />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dynamic Status / Feedback under board */}
      <div className="mt-4 text-center">
        {statusMessage && (
          <p className="text-sm font-medium text-slate-600 flex items-center justify-center gap-2">
            {statusMessage}
          </p>
        )}
      </div>
    </div>
  );
};
