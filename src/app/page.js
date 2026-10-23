"use client";

import { useState, useEffect } from "react";
import BackgroundCanvas from "@/components/BackgroundCanvas";
import PasswordGate from "@/components/PasswordGate";
import HeaderNav from "@/components/HeaderNav";
import HeroSection from "@/components/HeroSection";
import EventDetails from "@/components/EventDetails";
import AttendanceSection from "@/components/AttendanceSection";
import ChecklistSection from "@/components/ChecklistSection";
import ChatSection from "@/components/ChatSection";
import YoutubeDownloader from "@/components/YoutubeDownloader";
import GoldenTicketSection from "@/components/GoldenTicketSection";
import Footer from "@/components/Footer";

export default function Home() {
  const [isUnlocked, setIsUnlocked] = useState(() => {
    if (typeof window !== "undefined") {
      return sessionStorage.getItem("lonthaUnlocked") === "true";
    }
    return false;
  });

  const [activeAccount, setActiveAccount] = useState(null);
  const [nowPlayingTrack, setNowPlayingTrack] = useState(null);

  useEffect(() => {
    let ignore = false;
    async function loadInitialData() {
      try {
        const [accRes, ytRes] = await Promise.all([
          fetch("/api/accounts"),
          fetch("/api/youtube/tracks"),
        ]);
        const [accJson, ytJson] = await Promise.all([
          accRes.json(),
          ytRes.json(),
        ]);

        if (!ignore && accJson.success && accJson.data?.length > 0) {
          setActiveAccount(accJson.data[0]);
        }

        // Automatically load latest YouTube track MP3 into player
        if (!ignore && ytJson.success && ytJson.data?.length > 0) {
          setNowPlayingTrack(ytJson.data[0]);
        }
      } catch (err) {
        console.warn("Failed to load initial data:", err);
      }
    }

    loadInitialData();
    return () => {
      ignore = true;
    };
  }, []);

  const handleUnlock = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("lonthaUnlocked", "true");
      window.dispatchEvent(new CustomEvent("startPartyAudio"));
    }
    setIsUnlocked(true);
  };

  const unlockIOSAudioContext = () => {
    try {
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("startPartyAudio"));
      }
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        if (ctx.state === "suspended") {
          ctx.resume();
        }
      }
    } catch (e) {
      console.warn("Audio unlock error:", e);
    }
  };

  return (
    <>
      {/* Background Particle Canvas */}
      <BackgroundCanvas />

      {/* Password Gate Overlay (Code: LBO26) */}
      <PasswordGate
        isUnlocked={isUnlocked}
        onUnlock={handleUnlock}
        onUnlockAudio={unlockIOSAudioContext}
      />

      {/* Main Content Area */}
      <div
        id="mainContent"
        className={`relative z-10 transition-opacity duration-700 ${
          isUnlocked ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        <HeaderNav audioContextUnlocked={isUnlocked} externalTrack={nowPlayingTrack} />

        <HeroSection />

        <main className="max-w-7xl mx-auto px-4 space-y-12 mb-20">
          <EventDetails />

          <AttendanceSection />

          <ChecklistSection
            currentAlias={activeAccount?.alias}
            activeAccount={activeAccount}
          />

          <YoutubeDownloader
            activeAccount={activeAccount}
            onPlayTrack={setNowPlayingTrack}
          />

          <GoldenTicketSection activeAccount={activeAccount} />

          <ChatSection
            activeAccount={activeAccount}
            onSelectAccount={setActiveAccount}
          />
        </main>

        <Footer />
      </div>
    </>
  );
}
