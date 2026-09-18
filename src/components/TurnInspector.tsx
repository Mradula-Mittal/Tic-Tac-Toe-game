import React from 'react';
import { GameEvent, BoardSnapshot } from '../types';
import { History, RotateCcw, Eye, ArrowRight, CheckCircle2 } from 'lucide-react';
import { getPositionName } from '../utils/gameLogic';

interface TurnInspectorProps {
  events: GameEvent[];
  snapshots: BoardSnapshot[];
  selectedTurnIndex: number | null; // null means live current state
  onSelectTurn: (turnIndex: number | null) => void;
  onRollbackToTurn: (turnIndex: number) => void;
  isRollingBack: boolean;
  canRollback: boolean;
}

export const TurnInspector: React.FC<TurnInspectorProps> = ({
  events,
  snapshots,
  selectedTurnIndex,
  onSelectTurn,
  onRollbackToTurn,
  isRollingBack,
  canRollback,
}) => {
  const isLive = selectedTurnIndex === null;

  return (
    <div
      id="turn-inspector-card"
      className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col h-full max-h-[520px] overflow-hidden"
    >
      {/* Inspector Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-indigo-600" />
          <h2 className="font-semibold text-sm text-slate-800 tracking-tight">
            Event Log & Turn History
          </h2>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-700">
          {events.length} {events.length === 1 ? 'Turn' : 'Turns'}
        </span>
      </div>

      {/* Replay / Rollback Control Bar when inspecting historical turn */}
      {!isLive && (
        <div className="p-3 bg-indigo-50/80 border-b border-indigo-100 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-950">
              <Eye className="w-3.5 h-3.5 text-indigo-600" />
              <span>Viewing Turn #{selectedTurnIndex} Snapshot</span>
            </div>
            <button
              id="return-to-live-btn"
              onClick={() => onSelectTurn(null)}
              className="text-xs font-medium text-indigo-700 hover:text-indigo-900 underline underline-offset-2"
            >
              Return to Live Game
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            {canRollback && (
              <button
                id="confirm-rollback-btn"
                onClick={() => selectedTurnIndex !== null && onRollbackToTurn(selectedTurnIndex)}
                disabled={isRollingBack}
                className="w-full py-1.5 px-3 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-medium shadow-xs flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>
                  {isRollingBack ? 'Restoring state...' : `Restore Game to Turn #${selectedTurnIndex}`}
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="flex-1 overflow-y-auto p-3 divide-y divide-slate-100">
        {events.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-2">
              <History className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-slate-700">No turns recorded yet</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-[200px] mx-auto">
              Every move is saved as an immutable event in Firestore and can be replayed or restored.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {events.map((event) => {
              const isSelected = selectedTurnIndex === event.turnIndex;
              const isX = event.player === 'X';

              return (
                <div
                  key={event.id}
                  id={`turn-event-item-${event.turnIndex}`}
                  onClick={() => onSelectTurn(isSelected ? null : event.turnIndex)}
                  className={`p-2.5 rounded-xl text-left cursor-pointer transition-all border ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-300 shadow-xs'
                      : 'bg-white hover:bg-slate-50/80 border-slate-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs ${
                          isX ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {event.player}
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-slate-800">
                          Turn #{event.turnIndex}: {event.playerName}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {event.type === 'MOVE'
                            ? `Marked ${getPositionName(event.cellIndex)}`
                            : event.note || 'State update'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isSelected ? (
                        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-100/70 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Eye className="w-3 h-3" />
                          Inspecting
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 group-hover:text-slate-600">
                          View
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
        <span className="flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
          Event Sourcing Active
        </span>
        <button
          onClick={() => onSelectTurn(null)}
          className={`font-medium ${isLive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
        >
          {isLive ? '● Live Board' : 'Switch to Live'}
        </button>
      </div>
    </div>
  );
};
