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

function extractYoutubeId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== "string") return null;
  const trimmed = urlOrId.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i
  );
  return match ? match[1] : null;
}

export default function HeaderNav({ externalTrack, audioContextUnlocked }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackName, setTrackName] = useState("No Song Loaded");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [isMuted, setIsMuted] = useState(false);
  const [lastVolume, setLastVolume] = useState(0.8);
  const [hasAudio, setHasAudio] = useState(false);
  const [activeEngine, setActiveEngine] = useState("youtube"); // "youtube" | "html5"
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  const audioRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const ytReadyRef = useRef(false);
  const progressTimerRef = useRef(null);
  const currentVideoIdRef = useRef(null);

  // Load YouTube IFrame API script
  const ensureYTAPI = useCallback(() => {
    return new Promise((resolve) => {
      if (typeof window === "undefined") {
        resolve(false);
        return;
      }
      if (window.YT && window.YT.Player) {
        resolve(true);
        return;
      }

      const prevReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (prevReady) prevReady();
        resolve(true);
      };

      if (!document.getElementById("yt-iframe-api-script")) {
        const tag = document.createElement("script");
        tag.id = "yt-iframe-api-script";
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }
    });
  }, []);

  // Initialize YouTube Player
  const initYTPlayer = useCallback((videoId, autoStart = false) => {
    if (typeof window === "undefined") return;

    ensureYTAPI().then((ready) => {
      if (!ready || !window.YT) return;

      const container = document.getElementById("yt-audio-player-host");
      if (!container) return;

      if (ytPlayerRef.current && ytReadyRef.current) {
        try {
          currentVideoIdRef.current = videoId;
          if (autoStart) {
            ytPlayerRef.current.loadVideoById(videoId);
            ytPlayerRef.current.playVideo();
          } else {
            ytPlayerRef.current.cueVideoById(videoId);
          }
        } catch (e) {
          console.warn("YT cue/load error:", e);
        }
        return;
      }

      try {
        currentVideoIdRef.current = videoId;
        ytPlayerRef.current = new window.YT.Player("yt-audio-player-host", {
          height: "1",
          width: "1",
          videoId,
          playerVars: {
            autoplay: autoStart ? 1 : 0,
            controls: 0,
            playsinline: 1,
            disablekb: 1,
            fs: 0,
            rel: 0,
          },
          events: {
            onReady: (event) => {
              ytReadyRef.current = true;
              event.target.setVolume(volume * 100);
              if (autoStart) {
                try {
                  event.target.playVideo();
                } catch (err) {
                  console.warn("YT playVideo error:", err);
                }
              }
            },
            onStateChange: (event) => {
              // 1: PLAYING, 2: PAUSED, 0: ENDED, 3: BUFFERING
              if (event.data === 1) {
                setIsPlaying(true);
                setAutoplayBlocked(false);
              } else if (event.data === 2) {
                setIsPlaying(false);
              } else if (event.data === 0) {
                setIsPlaying(false);
                setCurrentTime(0);
              }
            },
            onError: (err) => {
              console.warn("YT player error:", err);
            },
          },
        });
      } catch (err) {
        console.warn("Failed to create YT Player:", err);
      }
    });
  }, [ensureYTAPI, volume]);

  // Interval for time tracking when YouTube engine is playing
  useEffect(() => {
    if (activeEngine === "youtube" && isPlaying) {
      progressTimerRef.current = setInterval(() => {
        if (ytPlayerRef.current && ytReadyRef.current) {
          try {
            const cur = ytPlayerRef.current.getCurrentTime() || 0;
            const dur = ytPlayerRef.current.getDuration() || 0;
            setCurrentTime(cur);
            if (dur > 0) setDuration(dur);
          } catch {
            // Ignore cross-frame polling hiccup
          }
        }
      }, 300);
    } else {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    }

    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [activeEngine, isPlaying]);

  // React to externalTrack change
  useEffect(() => {
    if (!externalTrack) return;

    const ytId =
      externalTrack.videoId ||
      extractYoutubeId(externalTrack.url);

    if (ytId) {
      setActiveEngine("youtube");
      setTrackName(externalTrack.title || "Party YouTube Track");
      setHasAudio(true);

      // Pause HTML5 audio if it was running
      if (audioRef.current) {
        audioRef.current.pause();
      }

      // Initialize or load into YouTube player
      initYTPlayer(ytId, true);
    } else if (externalTrack.url && audioRef.current) {
      // Fallback to HTML5 audio stream for non-YouTube sources
      setActiveEngine("html5");
      const audio = audioRef.current;
      audio.src = `/api/youtube/stream?url=${encodeURIComponent(
        externalTrack.url
      )}`;
      setTrackName(externalTrack.title || "Party Track");
      setHasAudio(true);

      audio
        .play()
        .then(() => {
          setIsPlaying(true);
          setAutoplayBlocked(false);
        })
        .catch(() => {
          setAutoplayBlocked(true);
        });
    }
  }, [externalTrack, initYTPlayer]);

  // Handle Autoplay Unlock & Event triggers
  useEffect(() => {
    const triggerStart = () => {
      if (activeEngine === "youtube" && ytPlayerRef.current && ytReadyRef.current) {
        try {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
          setAutoplayBlocked(false);
        } catch (e) {
          console.warn("Autoplay start failed:", e);
        }
      } else if (activeEngine === "html5" && audioRef.current && hasAudio) {
        audioRef.current
          .play()
          .then(() => {
            setIsPlaying(true);
            setAutoplayBlocked(false);
          })
          .catch(console.warn);
      }
    };

    if (audioContextUnlocked) {
      triggerStart();
    }

    window.addEventListener("startPartyAudio", triggerStart);

    // Global first-touch listener if browser blocked autoplay
    const onUserInteraction = () => {
      triggerStart();
      window.removeEventListener("click", onUserInteraction);
      window.removeEventListener("touchstart", onUserInteraction);
    };

    window.addEventListener("click", onUserInteraction, { once: true });
    window.addEventListener("touchstart", onUserInteraction, { once: true });

    return () => {
      window.removeEventListener("startPartyAudio", triggerStart);
      window.removeEventListener("click", onUserInteraction);
      window.removeEventListener("touchstart", onUserInteraction);
    };
  }, [audioContextUnlocked, activeEngine, hasAudio]);

  // Load cached track from IndexedDB if no externalTrack
  const loadTrackFromIndexedDB = useCallback(async (audio) => {
    const db = await openDB();
    if (!db) return;
    try {
      const tx = db.transaction(["tracks"], "readonly");
      const store = tx.objectStore("tracks");
      const req = store.get("lastUploadedTrack");
      req.onsuccess = () => {
        const result = req.result;
        if (result && result.data && !externalTrack) {
          const url = URL.createObjectURL(result.data);
          audio.src = url;
          setTrackName(result.name);
          setHasAudio(true);
          setActiveEngine("html5");
        }
      };
    } catch (err) {
      console.warn("IndexedDB load failed:", err);
    }
  }, [externalTrack]);

  // Initialize HTML5 Audio listener
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;
    audio.volume = volume;

    const onTimeUpdate = () => {
      if (activeEngine === "html5") {
        setCurrentTime(audio.currentTime || 0);
      }
    };

    const onLoadedMetadata = () => {
      if (activeEngine === "html5") {
        setDuration(audio.duration || 0);
        setHasAudio(true);
      }
    };

    const onEnded = () => {
      if (activeEngine === "html5") {
        setIsPlaying(false);
        setCurrentTime(0);
      }
    };

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    loadTrackFromIndexedDB(audio);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
      audio.pause();
    };
  }, [activeEngine, loadTrackFromIndexedDB, volume]);

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

    // Pause YouTube player if running
    if (ytPlayerRef.current && ytReadyRef.current) {
      try {
        ytPlayerRef.current.pauseVideo();
      } catch {}
    }

    setActiveEngine("html5");
    saveTrackToIndexedDB(file);
    const url = URL.createObjectURL(file);
    const audio = audioRef.current;
    audio.src = url;
    audio.currentTime = 0;
    setTrackName(file.name);
    setHasAudio(true);

    audio
      .play()
      .then(() => {
        setIsPlaying(true);
        setAutoplayBlocked(false);
      })
      .catch((err) => {
        console.warn("Autoplay blocked:", err);
        setIsPlaying(false);
      });
  };

  const togglePlay = () => {
    if (!hasAudio) return;

    if (activeEngine === "youtube" && ytPlayerRef.current && ytReadyRef.current) {
      try {
        if (isPlaying) {
          ytPlayerRef.current.pauseVideo();
          setIsPlaying(false);
        } else {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
          setAutoplayBlocked(false);
        }
      } catch (err) {
        console.warn("YT togglePlay error:", err);
      }
    } else if (activeEngine === "html5" && audioRef.current) {
      const audio = audioRef.current;
      if (audio.paused) {
        audio
          .play()
          .then(() => {
            setIsPlaying(true);
            setAutoplayBlocked(false);
          })
          .catch((err) => console.warn("Audio play error:", err));
      } else {
        audio.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleSeek = (val) => {
    const time = parseFloat(val);
    setCurrentTime(time);

    if (activeEngine === "youtube" && ytPlayerRef.current && ytReadyRef.current) {
      try {
        ytPlayerRef.current.seekTo(time, true);
      } catch {}
    } else if (activeEngine === "html5" && audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const handleVolume = (val) => {
    const vol = parseFloat(val);
    setVolume(vol);
    setIsMuted(vol === 0);

    if (activeEngine === "youtube" && ytPlayerRef.current && ytReadyRef.current) {
      try {
        ytPlayerRef.current.setVolume(vol * 100);
      } catch {}
    }
    if (audioRef.current) {
      audioRef.current.volume = vol;
    }
  };

  const toggleMute = () => {
    if (volume > 0) {
      setLastVolume(volume);
      setVolume(0);
      setIsMuted(true);
      if (activeEngine === "youtube" && ytPlayerRef.current && ytReadyRef.current) {
        try {
          ytPlayerRef.current.mute();
        } catch {}
      }
      if (audioRef.current) audioRef.current.volume = 0;
    } else {
      const restored = lastVolume || 0.8;
      setVolume(restored);
      setIsMuted(false);
      if (activeEngine === "youtube" && ytPlayerRef.current && ytReadyRef.current) {
        try {
          ytPlayerRef.current.unMute();
          ytPlayerRef.current.setVolume(restored * 100);
        } catch {}
      }
      if (audioRef.current) audioRef.current.volume = restored;
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
      {/* Hidden YouTube Audio Host Container */}
      <div
        id="yt-audio-player-host"
        style={{
          position: "absolute",
          top: "-9999px",
          left: "-9999px",
          width: "1px",
          height: "1px",
          opacity: 0,
          pointerEvents: "none",
        }}
      ></div>

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
            <i className="fa-solid fa-crown text-amber-400"></i> Wonka Pass
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
          {autoplayBlocked && !isPlaying && (
            <button
              onClick={togglePlay}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-400/50 text-[10px] font-bold animate-pulse flex items-center gap-1 cursor-pointer"
            >
              <i className="fa-solid fa-play text-xs"></i>
              <span>Tap to Play Sound</span>
            </button>
          )}

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
            title={isPlaying ? "Pause Music" : "Play Music"}
          >
            <i
              className={`fa-solid ${
                isPlaying ? "fa-pause" : "fa-play ml-0.5"
              }`}
            ></i>
          </button>

          <div className="hidden sm:flex flex-col min-w-[120px] max-w-[180px] text-left gap-1">
            <div className="flex justify-between items-center text-[10px]">
              <span className="font-medium text-white truncate max-w-[90px]" title={trackName}>
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
