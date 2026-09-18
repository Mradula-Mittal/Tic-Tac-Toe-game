import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { LogIn, LogOut, Volume2, VolumeX, User as UserIcon, Edit2, Check, X } from 'lucide-react';

interface HeaderProps {
  user: User | null;
  guestName: string;
  onUpdateGuestName: (name: string) => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onReturnToLobby: () => void;
  isInGame: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  guestName,
  onUpdateGuestName,
  onSignIn,
  onSignOut,
  onReturnToLobby,
  isInGame,
  soundEnabled,
  onToggleSound,
}) => {
  const [isEditingGuest, setIsEditingGuest] = useState(false);
  const [tempGuestName, setTempGuestName] = useState(guestName);

  const handleSaveGuestName = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = tempGuestName.trim();
    if (trimmed) {
      onUpdateGuestName(trimmed);
    } else {
      setTempGuestName(guestName);
    }
    setIsEditingGuest(false);
  };

  return (
    <header className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 shadow-2xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2">
        {/* Brand / Logo */}
        <div
          id="app-brand"
          onClick={onReturnToLobby}
          className="flex items-center gap-3 cursor-pointer select-none group shrink-0"
        >
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-105 transition-transform duration-200">
            <span className="text-indigo-400">X</span>
            <span className="text-amber-400">O</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-semibold text-slate-900 tracking-tight text-lg leading-tight">
                Tic-Tac-Toe
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                Firestore
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden md:block">
              Turn-based with Event Sourcing & Minimax AI
            </p>
          </div>
        </div>

        {/* Action Controls & Auth */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isInGame && (
            <button
              id="header-lobby-btn"
              onClick={onReturnToLobby}
              className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs"
            >
              Lobby
            </button>
          )}

          {/* Sound toggle */}
          <button
            id="sound-toggle-btn"
            onClick={onToggleSound}
            aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            title={soundEnabled ? 'Mute sound' : 'Unmute sound'}
          >
            {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
          </button>

          {/* User Sign In / Profile / Guest Display */}
          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'User avatar'}
                    className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-medium text-xs">
                    {(user.displayName || user.email || 'U')[0].toUpperCase()}
                  </div>
                )}
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-semibold text-slate-900 truncate max-w-[120px]">
                    {user.displayName || 'Player'}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[120px]">
                    {user.email}
                  </div>
                </div>
              </div>

              <button
                id="sign-out-btn"
                onClick={onSignOut}
                title="Sign Out"
                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3 pl-2 border-l border-slate-200">
              {/* Guest Player Status Chip */}
              {isEditingGuest ? (
                <form onSubmit={handleSaveGuestName} className="flex items-center gap-1">
                  <input
                    type="text"
                    value={tempGuestName}
                    onChange={e => setTempGuestName(e.target.value)}
                    maxLength={20}
                    className="w-28 sm:w-32 px-2 py-1 text-xs border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    autoFocus
                    placeholder="Guest name"
                  />
                  <button
                    type="submit"
                    className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                    title="Save name"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTempGuestName(guestName);
                      setIsEditingGuest(false);
                    }}
                    className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200/70 border border-slate-200/80 rounded-xl transition-colors">
                  <div className="w-5 h-5 rounded-full bg-slate-300 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                    <UserIcon className="w-3 h-3" />
                  </div>
                  <span className="text-xs font-semibold text-slate-800 truncate max-w-[90px] sm:max-w-[120px]">
                    {guestName}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setTempGuestName(guestName);
                      setIsEditingGuest(true);
                    }}
                    className="text-slate-400 hover:text-slate-700 p-0.5"
                    title="Edit guest name"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Optional Google Sign-In */}
              <button
                id="google-signin-btn"
                onClick={onSignIn}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-2xs transition-all shrink-0"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign In with Google</span>
                <span className="sm:hidden">Sign In</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
