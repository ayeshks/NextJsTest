"use client";

import { useState, useEffect } from "react";

export default function AttendanceSection() {
  const [attendees, setAttendees] = useState([]);
  const [name, setName] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const fetchAttendees = async () => {
    try {
      const res = await fetch("/api/attendees");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAttendees(json.data);
      }
    } catch (err) {
      console.warn("Failed to fetch attendees:", err);
    }
  };

  useEffect(() => {
    fetchAttendees();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/attendees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          status: status.trim() || "Confirmed Guest",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setAttendees((prev) => [...prev, json.data]);
        setName("");
        setStatus("");
      }
    } catch (err) {
      console.error("Attendance submission error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      const res = await fetch(`/api/attendees?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        setAttendees((prev) => prev.filter((a) => String(a.id) !== String(id)));
      }
    } catch (err) {
      console.error("Delete attendee error:", err);
    }
  };

  return (
    <section
      id="attendance"
      className="glass-panel-crimson rounded-3xl p-6 sm:p-8 border border-[#DC2626]/40 relative"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <span className="text-[10px] font-semibold text-[#EF4444] tracking-[0.25em] uppercase">
            Private Registry
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif-title font-bold text-white mt-1">
            ATTENDANCE MARKER
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Register your attendance so we can confirm catering & headcounts.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-black/80 px-4 py-2.5 rounded-2xl border border-[#DC2626]/30">
          <i className="fa-solid fa-users text-[#EF4444] text-xl"></i>
          <div>
            <span className="text-[9px] text-gray-400 block uppercase tracking-wider">
              Confirmed Guests
            </span>
            <span className="text-lg font-serif-title font-bold text-white">
              {attendees.length}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form */}
        <div className="lg:col-span-5 bg-black/80 p-5 rounded-2xl border border-[#DC2626]/30 space-y-4">
          <h3 className="text-base font-serif-title font-bold text-white flex items-center gap-2">
            <i className="fa-solid fa-user-plus text-[#EF4444] text-xs"></i> Add Your Name
          </h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] text-gray-300 font-medium mb-1">
                Your Full Name / Alias *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sahan Perera"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-[#DC2626]/30 text-white focus:outline-none focus:border-[#EF4444] text-xs"
              />
            </div>
            <div>
              <label className="block text-[11px] text-gray-300 font-medium mb-1">
                Contact / Status Note
              </label>
              <input
                type="text"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                placeholder="e.g. 'Ready for Kandy!'"
                className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-[#DC2626]/30 text-white focus:outline-none focus:border-[#EF4444] text-xs"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl font-serif-title font-bold text-xs uppercase tracking-widest bg-gradient-to-r from-[#7F1D1D] via-[#DC2626] to-red-500 text-white shadow-neon-crimson hover:opacity-95 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? "Confirming..." : "Confirm Attendance"} <i className="fa-solid fa-check ml-1 text-xs"></i>
            </button>
          </form>
        </div>

        {/* Guestlist Display */}
        <div className="lg:col-span-7">
          <h3 className="text-base font-serif-title font-bold text-white mb-4 flex items-center justify-between">
            <span>Confirmed VIP Guestlist</span>
            <span className="text-[10px] text-gray-400 font-sans font-normal">
              JSON File Persisted
            </span>
          </h3>
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {attendees.length === 0 ? (
              <p className="text-xs text-gray-500 italic py-6 text-center">
                No attendees registered yet. Be the first to join!
              </p>
            ) : (
              attendees.map((person) => (
                <div
                  key={person.id}
                  className="bg-black/70 p-3.5 rounded-xl border border-[#DC2626]/30 flex items-center justify-between gap-3 group hover:border-[#EF4444]/60 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#7F1D1D] to-[#DC2626] border border-[#EF4444]/50 flex items-center justify-center text-rose-200 text-xs font-serif-title font-bold">
                      {person.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white font-serif-title tracking-wide">
                        {person.name}
                      </h4>
                      <p className="text-[10px] text-rose-300/80">
                        {person.status || "Attending"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-gray-500 hidden sm:inline">
                      {person.time || ""}
                    </span>
                    <button
                      onClick={() => handleDelete(person.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors text-xs p-1 cursor-pointer"
                      title="Remove Registration"
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
