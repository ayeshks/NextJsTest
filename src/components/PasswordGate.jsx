"use client";

import { useState } from "react";

export default function PasswordGate({ isUnlocked, onUnlock, onUnlockAudio }) {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);
  const [isBouncing, setIsBouncing] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onUnlockAudio) onUnlockAudio();

    if (passcode.trim().toUpperCase() === "LBO26") {
      setError(false);
      onUnlock();
    } else {
      setError(true);
      setIsBouncing(true);
      setTimeout(() => setIsBouncing(false), 1000);
    }
  };

  if (isUnlocked) return null;

  return (
    <div
      id="passwordGate"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#020102]/98 backdrop-blur-2xl transition-all duration-700"
    >
      <div
        className={`max-w-md w-full mx-4 p-8 sm:p-10 rounded-3xl glass-panel-glow text-center relative border border-[#DC2626]/40 shadow-neon-crimson ${
          isBouncing ? "animate-bounce" : ""
        }`}
      >
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-b from-[#DC2626]/20 to-[#7F1D1D]/40 flex items-center justify-center border border-[#EF4444]/60 text-[#EF4444] shadow-neon-crimson animate-float">
          <i className="fa-solid fa-shield-halved text-3xl"></i>
        </div>

        <h2 className="text-3xl font-serif-title font-semibold text-transparent bg-clip-text bg-gradient-to-r from-red-200 via-rose-100 to-[#EF4444] tracking-wide mb-1">
          PRIVATE CLUB PORTAL
        </h2>
        <p className="text-[11px] text-red-300/80 mb-8 uppercase tracking-[0.25em] font-medium">
          Lontha Boys Party Saga 2026
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="relative">
            <input
              type="password"
              value={passcode}
              onChange={(e) => {
                setPasscode(e.target.value);
                if (error) setError(false);
              }}
              placeholder="Enter Security Code"
              required
              className="w-full px-5 py-4 rounded-xl bg-black/90 border border-[#DC2626]/40 text-rose-200 text-center text-lg tracking-[0.3em] focus:outline-none focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]/50 transition-all placeholder:text-gray-600 placeholder:tracking-normal placeholder:text-sm font-serif-title"
            />
          </div>

          {error && (
            <div className="text-red-400 text-xs font-semibold animate-bounce flex items-center justify-center gap-2">
              <i className="fa-solid fa-triangle-exclamation"></i> Invalid Security Passcode! Access Denied.
            </div>
          )}

          <button
            type="submit"
            className="w-full py-4 rounded-xl font-serif-title font-semibold text-base tracking-widest uppercase bg-gradient-to-r from-[#7F1D1D] via-[#DC2626] to-red-500 text-white shadow-neon-crimson hover:opacity-95 hover:scale-[1.01] active:scale-95 transition-all duration-300 cursor-pointer"
          >
            Unlock VIP Saga <i className="fa-solid fa-arrow-right ml-2 text-sm"></i>
          </button>
        </form>
        <p className="text-[10px] text-gray-500 mt-6 uppercase tracking-widest">
          Confidential Event Portal
        </p>
      </div>
    </div>
  );
}
