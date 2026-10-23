"use client";

import { useState, useEffect } from "react";

export default function YoutubeDownloader({ activeAccount, onPlayTrack }) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentTrack, setCurrentTrack] = useState(null);
  const [libraryTracks, setLibraryTracks] = useState([]);
  const [isDownloading, setIsDownloading] = useState(false);

  const fetchLibrary = async () => {
    try {
      const res = await fetch("/api/youtube/tracks");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setLibraryTracks(json.data);
      }
    } catch (err) {
      console.warn("Failed to load tracks library:", err);
    }
  };

  useEffect(() => {
    fetchLibrary();
  }, []);

  const handleFetch = async (e) => {
    if (e) e.preventDefault();
    if (!url.trim()) return;

    setIsLoading(true);
    setError(null);
    setCurrentTrack(null);

    try {
      const res = await fetch("/api/youtube/info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          addedBy: activeAccount?.alias || "VIP Guest",
        }),
      });

      const json = await res.json();
      if (json.success) {
        setCurrentTrack(json.data);
        fetchLibrary(); // refresh library
        if (onPlayTrack) {
          onPlayTrack(json.data); // Automatically plays newly converted track
        }
      } else {
        setError(json.error || "Failed to fetch YouTube audio.");
      }
    } catch (err) {
      console.error("Fetch YouTube error:", err);
      setError("Network error while connecting to audio converter.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (track) => {
    const target = track || currentTrack;
    if (!target?.url) return;

    setIsDownloading(true);
    const downloadUrl = `/api/youtube/download?url=${encodeURIComponent(
      target.url
    )}&title=${encodeURIComponent(target.title || "Party_Track")}`;

    // Create an invisible anchor tag to trigger browser download
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.setAttribute(
      "download",
      `${(target.title || "Party_Track").replace(/[^a-zA-Z0-9_-]/g, "_")}.mp3`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setIsDownloading(false);
    }, 2000);
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/youtube/tracks?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setLibraryTracks((prev) => prev.filter((t) => t.id !== id));
        if (currentTrack?.id === id) {
          setCurrentTrack(null);
        }
      }
    } catch (err) {
      console.error("Delete track error:", err);
    }
  };

  const handleQuickPaste = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.includes("youtu")) {
          setUrl(text);
        }
      }
    } catch (err) {
      console.warn("Clipboard access denied or unavailable:", err);
    }
  };

  return (
    <section
      id="music-downloader"
      className="glass-panel-crimson rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-[#DC2626]/40 relative overflow-hidden"
    >
      {/* Decorative Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-[#DC2626]/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 relative z-10">
        <div>
          <span className="text-[9px] sm:text-[10px] font-semibold text-[#EF4444] tracking-[0.25em] uppercase flex items-center gap-1.5">
            <i className="fa-solid fa-music text-xs"></i> DJ &amp; Sound Setup
          </span>
          <h2 className="text-xl sm:text-3xl font-serif-title font-bold text-white mt-0.5 sm:mt-1">
            YOUTUBE TO MP3 DOWNLOADER
          </h2>
          <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
            Paste any YouTube link to download MP3 tracks or stream directly through the Party sound system.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-black/80 px-3 py-1.5 rounded-xl border border-[#DC2626]/30 text-xs text-rose-300 w-fit">
          <i className="fa-brands fa-youtube text-red-500 text-sm"></i>
          <span>{libraryTracks.length} Tracks in Library</span>
        </div>
      </div>

      {/* Input Form */}
      <div className="max-w-3xl mx-auto mb-8 relative z-10">
        <form onSubmit={handleFetch} className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-red-500 text-sm pointer-events-none">
                <i className="fa-brands fa-youtube"></i>
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Paste YouTube link (e.g. https://www.youtube.com/watch?v=...)"
                required
                className="w-full pl-10 pr-20 py-3 rounded-xl bg-black/90 border border-[#DC2626]/40 text-white text-xs sm:text-sm focus:outline-none focus:border-[#EF4444] focus:ring-1 focus:ring-[#EF4444]/50 transition-all placeholder:text-gray-500"
              />
              <button
                type="button"
                onClick={handleQuickPaste}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2.5 py-1 text-[10px] font-semibold text-rose-300 bg-[#DC2626]/20 hover:bg-[#DC2626]/35 rounded-lg border border-[#DC2626]/40 transition-all cursor-pointer"
                title="Paste from clipboard"
              >
                Paste
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="py-3 px-6 rounded-xl font-serif-title font-bold text-xs uppercase tracking-widest bg-gradient-to-r from-[#7F1D1D] via-[#DC2626] to-red-500 text-white shadow-neon-crimson hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
            >
              {isLoading ? (
                <>
                  <i className="fa-solid fa-compact-disc animate-spin"></i>
                  <span>Converting...</span>
                </>
              ) : (
                <>
                  <i className="fa-solid fa-download"></i>
                  <span>Fetch MP3</span>
                </>
              )}
            </button>
          </div>

          {/* Quick suggestions */}
          <div className="flex items-center gap-2 flex-wrap text-[11px] text-gray-400">
            <span className="text-gray-500">Quick Test:</span>
            <button
              type="button"
              onClick={() => {
                setUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
              }}
              className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/10 text-rose-200 text-[10px] border border-white/10 cursor-pointer"
            >
              Rick Astley (Classic)
            </button>
          </div>
        </form>

        {/* Error notification */}
        {error && (
          <div className="mt-3 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2 animate-bounce">
            <i className="fa-solid fa-triangle-exclamation text-red-400"></i>
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Result Card (When track is converted) */}
      {currentTrack && (
        <div className="max-w-3xl mx-auto mb-10 bg-black/90 p-4 sm:p-5 rounded-2xl border border-emerald-500/40 shadow-[0_0_30px_rgba(16,185,129,0.15)] relative z-10 transition-all">
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Thumbnail with duration */}
            <div className="relative w-full sm:w-48 aspect-video rounded-xl overflow-hidden border border-white/10 shrink-0 bg-neutral-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentTrack.thumbnail}
                alt={currentTrack.title}
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-1.5 right-1.5 bg-black/80 px-2 py-0.5 rounded text-[10px] font-mono text-white font-bold border border-white/10">
                {currentTrack.duration}
              </span>
            </div>

            {/* Track Info */}
            <div className="flex-1 min-w-0 text-center sm:text-left space-y-1.5 w-full">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                  ✓ MP3 Ready
                </span>
                {currentTrack.bitrate && (
                  <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-gray-300 border border-white/10 font-mono">
                    {currentTrack.bitrate}
                  </span>
                )}
              </div>

              <h3 className="font-serif-title font-bold text-sm sm:text-base text-white line-clamp-2">
                {currentTrack.title}
              </h3>
              <p className="text-xs text-gray-400 truncate">
                {currentTrack.artist}
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => handleDownload(currentTrack)}
                  disabled={isDownloading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-500 text-white font-serif-title font-bold text-xs uppercase tracking-wider shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <i className="fa-solid fa-circle-down"></i>
                  <span>{isDownloading ? "Starting Download..." : "Download MP3"}</span>
                </button>

                {onPlayTrack && (
                  <button
                    type="button"
                    onClick={() => onPlayTrack(currentTrack)}
                    className="px-4 py-2 rounded-xl bg-[#DC2626]/30 hover:bg-[#DC2626]/50 border border-[#DC2626]/50 text-rose-200 font-serif-title font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <i className="fa-solid fa-play text-xs"></i>
                    <span>Play in Audio Bar</span>
                  </button>
                )}

                <a
                  href={currentTrack.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white text-xs p-2"
                  title="Open on YouTube"
                >
                  <i className="fa-solid fa-arrow-up-right-from-square"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Shared Party Track Library (JSON Persisted) */}
      <div className="relative z-10">
        <h3 className="text-sm font-serif-title font-bold text-white mb-3 flex items-center justify-between">
          <span>Party MP3 Track Library</span>
          <span className="text-[10px] text-gray-400 font-sans font-normal">
            Synced with <code className="text-rose-300">data/youtube_tracks.json</code>
          </span>
        </h3>

        {libraryTracks.length === 0 ? (
          <p className="text-xs text-gray-500 italic py-6 text-center">
            No tracks converted yet. Paste a YouTube link above to start downloading!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {libraryTracks.map((track) => (
              <div
                key={track.id}
                className="bg-black/80 p-3 rounded-xl border border-[#DC2626]/30 hover:border-[#EF4444]/60 transition-all flex items-center gap-3 group"
              >
                {/* Thumbnail */}
                <div className="relative w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-neutral-900 border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={track.thumbnail}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-0.5 right-0.5 bg-black/80 px-1 text-[8px] font-mono text-white rounded">
                    {track.duration}
                  </span>
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <h4 className="text-xs font-bold text-white truncate font-serif-title" title={track.title}>
                    {track.title}
                  </h4>
                  <p className="text-[10px] text-gray-400 truncate">
                    {track.artist}
                  </p>
                  <p className="text-[9px] text-[#EF4444]/80">
                    By {track.addedBy || "VIP Member"}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleDownload(track)}
                    className="w-8 h-8 rounded-lg bg-[#DC2626]/20 hover:bg-[#DC2626]/40 text-rose-300 flex items-center justify-center text-xs transition-all cursor-pointer"
                    title="Download MP3"
                  >
                    <i className="fa-solid fa-download"></i>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(track.id)}
                    className="w-6 h-6 rounded-lg text-gray-500 hover:text-red-400 flex items-center justify-center text-xs transition-colors cursor-pointer"
                    title="Remove from Library"
                  >
                    <i className="fa-solid fa-trash-can text-[10px]"></i>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
