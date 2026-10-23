"use client";

import { useEffect, useState } from "react";
import { getGoogleCalendarUrl } from "@/lib/calendar";

export default function HeroSection() {
  const [timeLeft, setTimeLeft] = useState({
    days: "00",
    hours: "00",
    minutes: "00",
    seconds: "00",
  });

  useEffect(() => {
    const targetDate = new Date("October 30, 2026 00:00:00").getTime();

    const updateTimer = () => {
      const now = new Date().getTime();
      const diff = targetDate - now;

      if (diff <= 0) {
        setTimeLeft({ days: "00", hours: "00", minutes: "00", seconds: "00" });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({
        days: String(days).padStart(2, "0"),
        hours: String(hours).padStart(2, "0"),
        minutes: String(minutes).padStart(2, "0"),
        seconds: String(seconds).padStart(2, "0"),
      });
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative pt-12 pb-16 px-4 max-w-7xl mx-auto text-center">
      {/* Emblem */}
      <div className="relative inline-block mb-8 group">
        <div className="absolute -inset-3 rounded-full bg-[#DC2626]/25 blur-3xl group-hover:bg-[#DC2626]/40 transition duration-1000"></div>

        <svg
          className="relative w-48 h-48 sm:w-56 sm:h-56 mx-auto animate-float"
          viewBox="0 0 300 300"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="150"
            cy="150"
            r="140"
            stroke="url(#rubyGrad)"
            strokeWidth="2"
            strokeDasharray="8 4"
            opacity="0.8"
          />
          <circle
            cx="150"
            cy="150"
            r="130"
            stroke="#EF4444"
            strokeWidth="1"
            opacity="0.4"
          />
          <circle
            cx="150"
            cy="150"
            r="118"
            stroke="url(#rubyGrad)"
            strokeWidth="2.5"
          />

          <polygon points="150,12 155,26 150,22 145,26" fill="#EF4444" />
          <polygon points="150,288 155,274 150,278 145,274" fill="#EF4444" />

          <g fill="none" stroke="url(#rubyGrad)" strokeWidth="2">
            <path d="M 100 150 Q 150 80 200 150 Q 150 220 100 150 Z" />
            <circle cx="150" cy="150" r="35" stroke="#EF4444" strokeWidth="1.5" />
          </g>

          <text
            x="150"
            y="145"
            fontFamily="'Cormorant Garamond', serif"
            fontWeight="700"
            fontSize="26"
            fill="#FFFFFF"
            textAnchor="middle"
            letterSpacing="4"
          >
            LONTHA
          </text>
          <text
            x="150"
            y="168"
            fontFamily="'Plus Jakarta Sans', sans-serif"
            fontWeight="700"
            fontSize="11"
            fill="#EF4444"
            textAnchor="middle"
            letterSpacing="6"
          >
            BOYS SAGA
          </text>
          <text
            x="150"
            y="188"
            fontFamily="'Cormorant Garamond', serif"
            fontStyle="italic"
            fontSize="12"
            fill="#FCA5A5"
            textAnchor="middle"
            letterSpacing="2"
          >
            October 2026
          </text>

          <defs>
            <linearGradient id="rubyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FCA5A5" />
              <stop offset="50%" stopColor="#EF4444" />
              <stop offset="100%" stopColor="#7F1D1D" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Headings */}
      <h1 className="text-3xl sm:text-5xl lg:text-6xl font-serif-title font-bold tracking-tight mb-4 text-white">
        LONTHA BOYS{" "}
        <span className="italic text-transparent bg-clip-text bg-gradient-to-r from-red-400 via-rose-300 to-[#EF4444]">
          PARTY SAGA
        </span>
      </h1>
      <p className="text-sm sm:text-base font-light text-gray-300 max-w-2xl mx-auto mb-10 tracking-wide leading-relaxed">
        An exclusive private retreat at the Canterbury Nature & Wellness Resort,
        Kandy.
      </p>

      {/* Countdown Timer */}
      <div
        id="countdown"
        className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto mb-10"
      >
        <div className="glass-panel-crimson p-4 rounded-2xl border border-[#DC2626]/30">
          <span className="block text-2xl sm:text-4xl font-serif-title font-bold text-rose-300">
            {timeLeft.days}
          </span>
          <span className="text-[9px] uppercase text-gray-400 font-medium tracking-[0.2em]">
            Days
          </span>
        </div>
        <div className="glass-panel-crimson p-4 rounded-2xl border border-[#DC2626]/30">
          <span className="block text-2xl sm:text-4xl font-serif-title font-bold text-rose-300">
            {timeLeft.hours}
          </span>
          <span className="text-[9px] uppercase text-gray-400 font-medium tracking-[0.2em]">
            Hours
          </span>
        </div>
        <div className="glass-panel-crimson p-4 rounded-2xl border border-[#DC2626]/30">
          <span className="block text-2xl sm:text-4xl font-serif-title font-bold text-rose-300">
            {timeLeft.minutes}
          </span>
          <span className="text-[9px] uppercase text-gray-400 font-medium tracking-[0.2em]">
            Minutes
          </span>
        </div>
        <div className="glass-panel-crimson p-4 rounded-2xl border border-[#DC2626]/30">
          <span className="block text-2xl sm:text-4xl font-serif-title font-bold text-white">
            {timeLeft.seconds}
          </span>
          <span className="text-[9px] uppercase text-gray-400 font-medium tracking-[0.2em]">
            Seconds
          </span>
        </div>
      </div>

      {/* CTAs */}
      <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
        <a
          href="#attendance"
          className="px-6 sm:px-7 py-3 rounded-xl font-serif-title font-semibold text-xs tracking-widest uppercase bg-gradient-to-r from-[#7F1D1D] via-[#DC2626] to-red-500 text-white shadow-neon-crimson hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <i className="fa-solid fa-pen-nib mr-2"></i> Confirm Attendance
        </a>
        <a
          href="#checklist"
          className="px-6 sm:px-7 py-3 rounded-xl font-serif-title font-semibold text-xs tracking-widest uppercase glass-panel-crimson border border-[#DC2626]/50 text-rose-300 hover:bg-[#DC2626]/10 hover:scale-105 active:scale-95 transition-all duration-300"
        >
          <i className="fa-solid fa-boxes-packing mr-2"></i> Party Essentials
        </a>
        <div className="relative group">
          <a
            href={getGoogleCalendarUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 sm:px-7 py-3 rounded-xl font-serif-title font-semibold text-xs tracking-widest uppercase bg-white/5 hover:bg-white/10 border border-white/20 text-white hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-2"
          >
            <i className="fa-solid fa-calendar-plus text-rose-300"></i>
            <span>Add to Calendar</span>
          </a>
        </div>
      </div>
    </section>
  );
}
