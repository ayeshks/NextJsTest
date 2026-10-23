"use client";

import { useEffect, useRef, useState, useCallback } from "react";

function openDB() {
  return new Promise((resolve) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      resolve(null);
      return;
    }
    const request = indexedDB.open("LB26AudioDB", 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("tracks")) {
        db.createObjectStore("tracks");
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = () => resolve(null);
  });
}

export default function HeaderNav({ externalTrack }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackName, setTrackName] = useState("No Song Loaded");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [lastVolume, setLastVolume] = useState(0.8);
  const [hasAudio, setHasAudio] = useState(false);

  const audioRef = useRef(null);

  useEffect(() => {
    if (externalTrack && externalTrack.url && audioRef.current) {
      const audio = audioRef.current;
      audio.src = `/api/youtube/stream?url=${encodeURIComponent(
        externalTrack.url
      )}`;
      setTrackName(externalTrack.title || "Party YouTube Track");
      setHasAudio(true);

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => setIsPlaying(true))
          .catch((err) => {
            console.warn(
              "Browser blocked zero-click autoplay, awaiting first user interaction:",
              err
            );
            const startOnInteraction = () => {
              audio
                .play()
                .then(() => setIsPlaying(true))
                .catch(console.warn);
              window.removeEventListener("click", startOnInteraction);
              window.removeEventListener("touchstart", startOnInteraction);
            };
            window.addEventListener("click", startOnInteraction, { once: true });
            window.addEventListener("touchstart", startOnInteraction, {
              once: true,
            });
          });
      }
    }
  }, [externalTrack]);

  const loadTrackFromIndexedDB = useCallback(async (audio) => {
    const db = await openDB();
    if (!db) return;
    try {
      const tx = db.transaction(["tracks"], "readonly");
      const store = tx.objectStore("tracks");
      const req = store.get("lastUploadedTrack");
      req.onsuccess = () => {
        const result = req.result;
        if (result && result.data) {
          const url = URL.createObjectURL(result.data);
          audio.src = url;
          setTrackName(result.name);
          setHasAudio(true);
        }
      };
    } catch (err) {
      console.warn("IndexedDB load failed:", err);
    }
  }, []);

  // Initialize Audio & IndexedDB
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.volume = 0.8;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
    };

    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      setHasAudio(true);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    // Attempt to load track from IndexedDB
    loadTrackFromIndexedDB(audio);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.pause();
    };
  }, [loadTrackFromIndexedDB]);

  const saveTrackToIndexedDB = async (file) => {
    const db = await openDB();
    if (!db) return;
    try {
      const tx = db.transaction(["tracks"], "readwrite");
      const store = tx.objectStore("tracks");
      store.put(
        {
          name: file.name,
          type: file.type,
          data: file,
          timestamp: Date.now(),
        },
        "lastUploadedTrack"
      );
    } catch (err) {
      console.warn("IndexedDB save failed:", err);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file || !audioRef.current) return;

    saveTrackToIndexedDB(file);
    const url = URL.createObjectURL(file);
    const audio = audioRef.current;
    audio.src = url;
    audio.currentTime = 0;
    setTrackName(file.name);
    setHasAudio(true);

    audio
      .play()
      .then(() => setIsPlaying(true))
      .catch((err) => {
        console.warn("Autoplay blocked:", err);
        setIsPlaying(false);
      });
  };

  const togglePlay = () => {
    if (!audioRef.current || !hasAudio) return;
    const audio = audioRef.current;
    if (audio.paused) {
      audio
        .play()
        .then(() => setIsPlaying(true))
        .catch((err) => console.warn("Audio play error:", err));
    } else {
      audio.pause();
      setIsPlaying(false);
    }
  };

  const handleSeek = (val) => {
    if (!audioRef.current || !hasAudio) return;
    const time = parseFloat(val);
    audioRef.current.currentTime = time;
    setCurrentTime(time);
  };

  const handleVolume = (val) => {
    const vol = parseFloat(val);
    setVolume(vol);
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    if (!audioRef.current) return;
    if (volume > 0) {
      setLastVolume(volume);
      setVolume(0);
      audioRef.current.volume = 0;
      setIsMuted(true);
    } else {
      const restored = lastVolume || 0.8;
      setVolume(restored);
      audioRef.current.volume = restored;
      setIsMuted(false);
    }
  };

  const formatTime = (secs) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60) || 0;
    const s = Math.floor(secs % 60) || 0;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <header className="sticky top-0 z-40 glass-panel-crimson border-b border-[#DC2626]/30 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Logo Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#7F1D1D] to-[#DC2626] border border-[#EF4444] flex items-center justify-center text-white font-serif-title font-bold text-lg shadow-neon-crimson">
            LB
          </div>
          <div>
            <h1 className="text-base font-serif-title font-bold tracking-wider text-white leading-none">
              LONTHA BOYS
            </h1>
            <p className="text-[9px] text-[#EF4444] tracking-[0.2em] uppercase font-medium mt-1">
              Saga • Oct 2026
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium tracking-wider text-gray-300 uppercase">
          <a
            href="#details"
            className="hover:text-rose-300 transition-colors flex items-center gap-1.5"
          >
            <i className="fa-solid fa-calendar-days text-[#EF4444]"></i> Details
          </a>
          <a
            href="#attendance"
            className="hover:text-rose-300 transition-colors flex items-center gap-1.5"
          >
            <i className="fa-solid fa-user-check text-[#EF4444]"></i> Guestlist
          </a>
          <a
            href="#checklist"
            className="hover:text-rose-300 transition-colors flex items-center gap-1.5"
          >
            <i className="fa-solid fa-list-check text-[#EF4444]"></i> Essentials
          </a>
          <a
            href="#chat"
            className="hover:text-rose-300 transition-colors flex items-center gap-1.5"
          >
            <i className="fa-solid fa-comments text-[#EF4444]"></i> VIP Chat
          </a>
          <a
            href="#music-downloader"
            className="hover:text-rose-300 transition-colors flex items-center gap-1.5"
          >
            <i className="fa-solid fa-music text-[#EF4444]"></i> DJ Music
          </a>
          <a
            href="#vip-ticket"
            className="hover:text-amber-300 transition-colors flex items-center gap-1.5"
          >
            <i className="fa-solid fa-crown text-amber-400"></i> VIP Pass
          </a>
          <a
            href="#location"
            className="hover:text-rose-300 transition-colors flex items-center gap-1.5"
          >
            <i className="fa-solid fa-location-dot text-[#EF4444]"></i> Venue
          </a>
        </nav>

        {/* Custom Audio Player Widget */}
        <div className="flex items-center gap-3 bg-black/90 border border-[#DC2626]/40 rounded-2xl px-4 py-2 shadow-neon-crimson">
          <label className="cursor-pointer bg-[#DC2626]/20 hover:bg-[#DC2626]/40 border border-[#EF4444]/50 text-rose-200 text-xs px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-2 shrink-0">
            <i className="fa-solid fa-file-audio text-[#EF4444]"></i>
            <span>{hasAudio ? "Change Song" : "Upload Song"}</span>
            <input
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          <button
            onClick={togglePlay}
            disabled={!hasAudio}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all text-xs shrink-0 ${
              hasAudio
                ? "bg-gradient-to-r from-[#DC2626] to-red-500 text-white shadow-neon-crimson hover:scale-105 active:scale-95 cursor-pointer"
                : "bg-gray-800 text-gray-500 cursor-not-allowed"
            }`}
          >
            <i
              className={`fa-solid ${
                isPlaying ? "fa-pause" : "fa-play ml-0.5"
              }`}
            ></i>
          </button>

          <div className="hidden sm:flex flex-col min-w-[120px] max-w-[180px] text-left gap-1">
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-medium text-white truncate max-w-[90px]">
                {trackName}
              </span>
              <span className="text-gray-400 font-mono text-[9px]">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.1"
              value={currentTime}
              disabled={!hasAudio}
              onChange={(e) => handleSeek(e.target.value)}
              className="w-full h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#EF4444]"
            />
          </div>

          <div
            className={`hidden md:flex items-end gap-0.5 h-4 w-5 px-1 transition-opacity ${
              isPlaying ? "opacity-100" : "opacity-30"
            }`}
          >
            <span
              className="eq-bar w-1 bg-[#EF4444] rounded-t"
              style={{ animationDelay: "0.1s" }}
            ></span>
            <span
              className="eq-bar w-1 bg-rose-400 rounded-t"
              style={{ animationDelay: "0.4s" }}
            ></span>
            <span
              className="eq-bar w-1 bg-red-600 rounded-t"
              style={{ animationDelay: "0.2s" }}
            ></span>
          </div>

          <div className="hidden lg:flex items-center gap-1.5 border-l border-white/10 pl-3">
            <button
              onClick={toggleMute}
              className="text-gray-400 hover:text-rose-300 text-xs p-1"
            >
              <i
                className={`fa-solid ${
                  isMuted || volume === 0
                    ? "fa-volume-xmark text-red-400"
                    : volume < 0.5
                    ? "fa-volume-low text-rose-300"
                    : "fa-volume-high text-rose-300"
                }`}
              ></i>
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolume(e.target.value)}
              className="w-14 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-[#EF4444]"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
