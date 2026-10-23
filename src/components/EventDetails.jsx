import { getGoogleCalendarUrl, downloadIcsFile } from "@/lib/calendar";

export default function EventDetails() {
  const mapLink =
    "https://maps.google.com/?cid=3184355779538968337&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQ";

  return (
    <section id="details" className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
      {/* 3 Detail Cards */}
      <div className="lg:col-span-1 space-y-4 flex flex-col justify-between">
        <div className="glass-panel-crimson p-5 rounded-2xl border-l-4 border-l-[#DC2626]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#DC2626]/20 border border-[#EF4444]/40 flex items-center justify-center text-rose-300 text-lg shrink-0">
              <i className="fa-solid fa-calendar-day"></i>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-[9px] text-gray-400 uppercase font-medium tracking-widest">
                Retreat Dates
              </h3>
              <p className="text-base font-serif-title font-bold text-white">
                Oct 30 - Nov 1, 2026
              </p>
              <p className="text-[11px] text-[#EF4444]">3 Days / 2 Nights Getaway</p>

              {/* Add to Calendar Action Buttons */}
              <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-white/10 flex-wrap">
                <a
                  href={getGoogleCalendarUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-[10px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Add directly to Google Calendar"
                >
                  <i className="fa-brands fa-google text-red-400 text-xs"></i>
                  <span>Google Cal</span>
                </a>
                <button
                  type="button"
                  onClick={downloadIcsFile}
                  className="px-2.5 py-1.5 rounded-lg bg-[#DC2626]/20 hover:bg-[#DC2626]/35 border border-[#DC2626]/40 text-rose-200 text-[10px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Download .ICS for Apple Calendar / Outlook"
                >
                  <i className="fa-solid fa-calendar-plus text-rose-300 text-xs"></i>
                  <span>Apple / .ICS</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel-crimson p-5 rounded-2xl border-l-4 border-l-rose-400">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#DC2626]/20 border border-[#EF4444]/40 flex items-center justify-center text-rose-300 text-lg">
              <i className="fa-solid fa-hotel"></i>
            </div>
            <div>
              <h3 className="text-[9px] text-gray-400 uppercase font-medium tracking-widest">
                Resort Venue
              </h3>
              <p className="text-base font-serif-title font-bold text-white">
                Canterbury Nature & Wellness
              </p>
              <p className="text-[11px] text-gray-400">Udawela Road, Udawela, Kandy</p>
            </div>
          </div>
        </div>

        <div className="glass-panel-crimson p-5 rounded-2xl border-l-4 border-l-[#DC2626]">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-[#DC2626]/20 border border-[#EF4444]/40 flex items-center justify-center text-rose-300 text-lg">
              <i className="fa-solid fa-wine-glass"></i>
            </div>
            <div>
              <h3 className="text-[9px] text-gray-400 uppercase font-medium tracking-widest">
                Event Style
              </h3>
              <p className="text-base font-serif-title font-bold text-white">
                Private Luxury Saga
              </p>
              <p className="text-[11px] text-[#EF4444]">
                Acoustics, Poolside, Lasers & Sound
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Google Maps Location */}
      <div
        id="location"
        className="lg:col-span-2 glass-panel-crimson rounded-2xl p-6 flex flex-col justify-between border border-[#DC2626]/30 relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-xl font-serif-title font-bold text-white">
              <i className="fa-solid fa-location-dot text-[#EF4444] mr-2"></i> Resort Destination Map
            </h2>
            <p className="text-xs text-gray-400">
              Canterbury Nature & Wellness Resort, Udawela Road, Udawela, Kandy
            </p>
          </div>
          <div>
            <a
              href={mapLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#7F1D1D] via-[#DC2626] to-red-500 text-white font-semibold text-xs transition-all shadow-neon-crimson hover:scale-105 active:scale-95"
            >
              <i className="fa-solid fa-map-location-dot text-xs"></i> Open Maps Location
            </a>
          </div>
        </div>

        <div className="w-full h-60 sm:h-72 rounded-xl overflow-hidden border border-[#DC2626]/40 relative bg-black/90 flex flex-col justify-between">
          <iframe
            className="w-full h-full border-0 filter grayscale contrast-125 opacity-90 hover:grayscale-0 hover:opacity-100 transition-all duration-700"
            src="https://maps.google.com/maps?q=Canterbury%20Nature%20%26%20Wellness%20Resort%20Udawela%20Road%20Udawela%20Kandy&t=&z=14&ie=UTF8&iwloc=&output=embed"
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>

          <div className="absolute bottom-3 left-3 right-3 p-3 rounded-xl glass-panel-glow border border-[#DC2626]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pointer-events-none">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-[#DC2626]/30 border border-[#EF4444] flex items-center justify-center text-rose-300 text-sm">
                <i className="fa-solid fa-compass"></i>
              </div>
              <div>
                <h4 className="text-xs font-bold text-white font-serif-title leading-tight">
                  Canterbury Nature & Wellness Resort
                </h4>
                <p className="text-[10px] text-gray-300">Udawela Road, Udawela, Kandy, Sri Lanka</p>
              </div>
            </div>
            <div className="pointer-events-auto">
              <a
                href={mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-bold text-rose-300 hover:underline flex items-center gap-1"
              >
                Get Directions <i className="fa-solid fa-arrow-trend-up text-[9px]"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
