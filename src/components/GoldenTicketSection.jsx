"use client";

import { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import jsPDF from "jspdf";

export default function GoldenTicketSection({ activeAccount }) {
  const [accounts, setAccounts] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [selectedName, setSelectedName] = useState("");
  const [customName, setCustomName] = useState("");
  const [accessTier, setAccessTier] = useState("VIP Gold Pass - All Access");
  const [ticketSerial, setTicketSerial] = useState("LB26-GOLD-7749");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const ticketDisplayRef = useRef(null);

  // Fetch registered accounts and attendees
  useEffect(() => {
    let ignore = false;
    async function loadMembers() {
      try {
        const [accRes, attRes] = await Promise.all([
          fetch("/api/accounts"),
          fetch("/api/attendees"),
        ]);
        const [accJson, attJson] = await Promise.all([
          accRes.json(),
          attRes.json(),
        ]);

        if (!ignore && accJson.success && Array.isArray(accJson.data)) {
          setAccounts(accJson.data);
        }
        if (!ignore && attJson.success && Array.isArray(attJson.data)) {
          setAttendees(attJson.data);
        }
      } catch (err) {
        console.warn("Failed to load members for ticket:", err);
      }
    }

    loadMembers();
    return () => {
      ignore = true;
    };
  }, []);

  const memberNames = Array.from(
    new Set([
      ...(activeAccount?.alias ? [activeAccount.alias] : []),
      ...accounts.map((a) => a.alias || a.name),
      ...attendees.map((att) => att.name),
    ].filter(Boolean))
  );

  const effectiveGuestName =
    selectedName === "__custom__"
      ? customName.trim() || "VIP Guest"
      : selectedName || activeAccount?.alias || memberNames[0] || "VIP Guest";

  // Generate QR code whenever the guest name, serial, or tier changes
  useEffect(() => {
    async function makeQr() {
      try {
        const qrPayload = JSON.stringify({
          event: "Lontha Boys Party Saga 2026",
          guest: effectiveGuestName,
          tier: accessTier,
          serial: ticketSerial,
          dates: "Oct 30 - Nov 1, 2026",
          venue: "Canterbury Nature & Wellness Resort, Kandy",
          securityCode: "LBO26",
          status: "VERIFIED_VIP_ACCESS",
        });

        const dataUrl = await QRCode.toDataURL(qrPayload, {
          width: 256,
          margin: 1,
          color: {
            dark: "#1A050A",
            light: "#FFFBEB",
          },
        });
        setQrDataUrl(dataUrl);
      } catch (err) {
        console.error("QR Code generation error:", err);
      }
    }

    makeQr();
  }, [effectiveGuestName, accessTier, ticketSerial]);

  const handleRegenerateSerial = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setTicketSerial(`LB26-GOLD-${randomNum}`);
  };

  // High-Resolution Native 2D Canvas Renderer (Zero CSS parser dependencies)
  const createGoldenTicketCanvas = async () => {
    const canvas = document.createElement("canvas");
    const width = 1200;
    const height = 620;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    // 1. Background gradient (Rich Dark Velvet Obsidian)
    const bgGrad = ctx.createLinearGradient(0, 0, width, height);
    bgGrad.addColorStop(0, "#190610");
    bgGrad.addColorStop(0.5, "#0D0308");
    bgGrad.addColorStop(1, "#1C0614");
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // 2. Outer golden metallic border
    const goldGrad = ctx.createLinearGradient(0, 0, width, 0);
    goldGrad.addColorStop(0, "#B45309");
    goldGrad.addColorStop(0.2, "#FDE68A");
    goldGrad.addColorStop(0.5, "#F59E0B");
    goldGrad.addColorStop(0.8, "#FEF08A");
    goldGrad.addColorStop(1, "#B45309");

    // Top and bottom shimmer gold banners
    ctx.fillStyle = goldGrad;
    ctx.fillRect(0, 0, width, 12);
    ctx.fillRect(0, height - 10, width, 10);

    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 3;
    ctx.strokeRect(6, 6, width - 12, height - 12);

    ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
    ctx.lineWidth = 1;
    ctx.strokeRect(18, 18, width - 36, height - 36);

    // 3. Perforated vertical separator line (at x = 860)
    const perfX = 860;
    ctx.strokeStyle = "rgba(245, 158, 11, 0.45)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(perfX, 22);
    ctx.lineTo(perfX, height - 22);
    ctx.stroke();
    ctx.setLineDash([]); // reset

    // Half-circle notch cutouts
    ctx.fillStyle = "#040204";
    ctx.beginPath();
    ctx.arc(perfX, 0, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(perfX, height, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // 4. Logo Crest (Circle badge)
    ctx.save();
    ctx.fillStyle = goldGrad;
    ctx.beginPath();
    ctx.arc(65, 75, 26, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.font = "bold 22px Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("LB", 65, 75);
    ctx.restore();

    // 5. Header texts
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 24px Georgia, serif";
    ctx.textAlign = "left";
    ctx.fillText("LONTHA BOYS PARTY SAGA", 105, 66);

    ctx.fillStyle = "#F59E0B";
    ctx.font = "bold 11px monospace";
    ctx.fillText("OCTOBER 2026 • OFFICIAL RETREAT CREDENTIAL", 105, 88);

    // VIP Pass pill on right of header
    ctx.fillStyle = "rgba(245, 158, 11, 0.18)";
    ctx.strokeStyle = "#F59E0B";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(640, 52, 190, 36, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#FEF08A";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText("GOLDEN VIP PASS", 735, 74);

    // Horizontal divider line
    ctx.strokeStyle = "rgba(245, 158, 11, 0.25)";
    ctx.beginPath();
    ctx.moveTo(40, 120);
    ctx.lineTo(820, 120);
    ctx.stroke();

    // 6. Guest Name Section
    ctx.fillStyle = "#9CA3AF";
    ctx.font = "12px monospace";
    ctx.textAlign = "left";
    ctx.fillText("ADMIT VIP PASS HOLDER:", 40, 155);

    // Large Golden Name
    const nameGrad = ctx.createLinearGradient(40, 0, 700, 0);
    nameGrad.addColorStop(0, "#FEF08A");
    nameGrad.addColorStop(0.5, "#FDE047");
    nameGrad.addColorStop(1, "#F59E0B");
    ctx.fillStyle = nameGrad;
    ctx.font = "bold 46px Georgia, serif";
    ctx.fillText(effectiveGuestName, 40, 215);

    // Access Tier Badge
    ctx.fillStyle = "rgba(245, 158, 11, 0.2)";
    ctx.strokeStyle = "rgba(245, 158, 11, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(40, 240, 260, 32, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#FDE68A";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.fillText(accessTier, 170, 261);

    // Gate Security Key
    ctx.fillStyle = "#E5E7EB";
    ctx.font = "13px monospace";
    ctx.textAlign = "left";
    ctx.fillText("Security Gate Passcode: ", 320, 261);
    ctx.fillStyle = "#EF4444";
    ctx.font = "bold 16px monospace";
    ctx.fillText("LBO26", 515, 261);

    // 7. Event details bottom boxes
    ctx.strokeStyle = "rgba(245, 158, 11, 0.25)";
    ctx.beginPath();
    ctx.moveTo(40, 460);
    ctx.lineTo(820, 460);
    ctx.stroke();

    // Dates
    ctx.fillStyle = "#9CA3AF";
    ctx.font = "11px monospace";
    ctx.fillText("RETREAT DATES", 40, 490);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 18px Georgia, serif";
    ctx.fillText("Oct 30 - Nov 1, 2026", 40, 520);
    ctx.fillStyle = "#EF4444";
    ctx.font = "12px monospace";
    ctx.fillText("3 Days / 2 Nights Saga", 40, 545);

    // Venue
    ctx.fillStyle = "#9CA3AF";
    ctx.font = "11px monospace";
    ctx.fillText("RESORT VENUE", 310, 490);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 18px Georgia, serif";
    ctx.fillText("Canterbury Nature Resort", 310, 520);
    ctx.fillStyle = "#9CA3AF";
    ctx.font = "12px sans-serif";
    ctx.fillText("Udawela Road, Kandy, Sri Lanka", 310, 545);

    // Serial Hash
    ctx.fillStyle = "#9CA3AF";
    ctx.font = "11px monospace";
    ctx.fillText("PASS SERIAL HASH", 610, 490);
    ctx.fillStyle = "#F59E0B";
    ctx.font = "bold 16px monospace";
    ctx.fillText(ticketSerial, 610, 520);
    ctx.fillStyle = "#10B981";
    ctx.font = "11px monospace";
    ctx.fillText("✓ VERIFIED CREDENTIAL", 610, 545);

    // 8. RIGHT STUB: QR Code & Verification
    ctx.fillStyle = "#F59E0B";
    ctx.font = "bold 12px monospace";
    ctx.textAlign = "center";
    ctx.fillText("SCAN TO VERIFY", 1030, 65);

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 15px Georgia, serif";
    ctx.fillText("GATE CHECK-IN", 1030, 90);

    // Draw QR Code Image
    if (qrDataUrl) {
      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      qrImg.src = qrDataUrl;
      await new Promise((resolve) => {
        if (qrImg.complete) resolve();
        else qrImg.onload = resolve;
      });

      // Background card for QR
      ctx.fillStyle = "#FFFBEB";
      ctx.beginPath();
      ctx.roundRect(915, 120, 230, 230, 16);
      ctx.fill();
      ctx.strokeStyle = "#F59E0B";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.drawImage(qrImg, 925, 130, 210, 210);
    }

    // Barcode Graphic Lines
    const barStartY = 420;
    const barStartX = 915;
    ctx.fillStyle = "#F59E0B";
    const barWidths = [3, 1, 4, 2, 5, 1, 3, 2, 4, 1, 2, 5, 2, 3, 1, 4, 2, 3, 5, 2, 1, 4, 2, 3, 1, 4];
    let curX = barStartX + 10;
    barWidths.forEach((w) => {
      ctx.fillRect(curX, barStartY, w, 28);
      curX += w + 4;
    });

    ctx.fillStyle = "#FEF08A";
    ctx.font = "bold 11px monospace";
    ctx.fillText("ADMIT ONE • ALL ACCESS", 1030, 480);

    ctx.fillStyle = "#EF4444";
    ctx.font = "10px monospace";
    ctx.fillText("NO ENTRY WITHOUT PASS", 1030, 510);

    return canvas;
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    setDownloadSuccess(false);

    try {
      const canvas = await createGoldenTicketCanvas();
      const imgData = canvas.toDataURL("image/jpeg", 0.98);

      // Create landscape A5 PDF (210mm x 148mm)
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a5",
      });

      // Page width: 210mm, height: 148mm
      pdf.addImage(imgData, "JPEG", 0, 0, 210, 148);

      const filename = `Lontha_Boys_Golden_VIP_Pass_${effectiveGuestName.replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      )}.pdf`;

      pdf.save(filename);
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert(`PDF generation failed: ${err.message || "Unknown error"}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadImage = async () => {
    try {
      const canvas = await createGoldenTicketCanvas();
      const link = document.createElement("a");
      link.download = `Lontha_Boys_Golden_Ticket_${effectiveGuestName.replace(
        /[^a-zA-Z0-9_-]/g,
        "_"
      )}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("Image export failed:", err);
    }
  };

  return (
    <section
      id="vip-ticket"
      className="glass-panel-crimson rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-amber-500/40 relative overflow-hidden"
    >
      {/* Golden Aura Background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-amber-500/10 via-yellow-500/10 to-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 relative z-10">
        <div>
          <span className="text-[9px] sm:text-[10px] font-semibold text-amber-400 tracking-[0.25em] uppercase flex items-center gap-1.5">
            <i className="fa-solid fa-crown text-amber-400"></i> Official VIP Credential
          </span>
          <h2 className="text-xl sm:text-3xl font-serif-title font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 mt-0.5 sm:mt-1">
            GOLDEN VIP TICKET GENERATOR
          </h2>
          <p className="text-[11px] sm:text-xs text-gray-300 mt-0.5">
            Select your alias or name to generate an official personalized Golden Pass with encrypted QR verification.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-black/80 px-3 py-1.5 rounded-xl border border-amber-500/40 text-xs text-amber-300 w-fit">
          <i className="fa-solid fa-qrcode text-amber-400"></i>
          <span>Live QR &amp; PDF Export</span>
        </div>
      </div>

      {/* Generator Controls Form */}
      <div className="max-w-4xl mx-auto mb-8 bg-black/80 p-4 sm:p-5 rounded-2xl border border-amber-500/30 relative z-10 shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
          {/* Guest Name Selection */}
          <div className="sm:col-span-5 space-y-1">
            <label className="block text-[11px] font-semibold text-amber-200 uppercase tracking-wider">
              1. Select Guest Name / Alias
            </label>
            <div className="relative">
              <select
                value={selectedName}
                onChange={(e) => setSelectedName(e.target.value)}
                className="w-full appearance-none px-3 py-2.5 rounded-xl bg-black border border-amber-500/40 text-amber-100 text-xs font-medium focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                {memberNames.map((name) => (
                  <option key={name} value={name} className="bg-neutral-900 text-white">
                    {name} {name === activeAccount?.alias ? "(Active Profile)" : ""}
                  </option>
                ))}
                <option value="__custom__" className="bg-neutral-900 text-amber-300 font-bold">
                  + Enter Custom Name...
                </option>
              </select>
              <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-400 pointer-events-none"></i>
            </div>

            {selectedName === "__custom__" && (
              <input
                type="text"
                placeholder="Type your VIP Name"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                autoFocus
                className="w-full mt-2 px-3 py-2 rounded-xl bg-black border border-amber-400 text-white text-xs focus:outline-none"
              />
            )}
          </div>

          {/* Access Tier */}
          <div className="sm:col-span-4 space-y-1">
            <label className="block text-[11px] font-semibold text-amber-200 uppercase tracking-wider">
              2. VIP Access Tier
            </label>
            <select
              value={accessTier}
              onChange={(e) => setAccessTier(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl bg-black border border-amber-500/40 text-amber-100 text-xs font-medium focus:outline-none focus:border-amber-400 cursor-pointer"
            >
              <option value="VIP Gold Pass - All Access">VIP Gold Pass - All Access</option>
              <option value="VIP Host & Villa Master">VIP Host &amp; Villa Master</option>
              <option value="VIP Sound & DJ Access">VIP Sound &amp; DJ Access</option>
              <option value="Luxury Villa Resident Pass">Luxury Villa Resident Pass</option>
            </select>
          </div>

          {/* Regenerate Code */}
          <div className="sm:col-span-3">
            <button
              type="button"
              onClick={handleRegenerateSerial}
              className="w-full py-2.5 px-4 rounded-xl font-serif-title font-bold text-xs uppercase tracking-widest bg-white/10 hover:bg-white/15 border border-amber-500/40 text-amber-200 shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <i className="fa-solid fa-arrows-rotate"></i>
              <span>New Passcode</span>
            </button>
          </div>
        </div>
      </div>

      {/* THE GOLDEN VIP TICKET DISPLAY CARD */}
      <div className="max-w-4xl mx-auto mb-6 relative z-10">
        {/* Action Bar Above Ticket */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
            <span className="text-xs text-amber-200 font-mono font-bold tracking-wider">
              PASS SERIAL: {ticketSerial}
            </span>
            {downloadSuccess && (
              <span className="text-xs text-emerald-400 font-bold ml-2 animate-bounce">
                ✓ PDF Downloaded!
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black font-serif-title font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <i className="fa-solid fa-file-pdf"></i>
              <span>{isGeneratingPdf ? "Generating PDF..." : "Download PDF"}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadImage}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white font-serif-title font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
              title="Download PNG image"
            >
              <i className="fa-solid fa-image"></i>
              <span className="hidden sm:inline">Save Image</span>
            </button>
          </div>
        </div>

        {/* Ticket Visual UI */}
        <div
          ref={ticketDisplayRef}
          className="w-full rounded-3xl overflow-hidden relative shadow-[0_15px_60px_-15px_rgba(245,158,11,0.35)] border-2 border-amber-400/80 bg-gradient-to-br from-[#16060E] via-[#0E0308] to-[#1F0814]"
          style={{ minHeight: "260px" }}
        >
          {/* Shimmer Gold Top Edge Banner */}
          <div className="h-2 w-full bg-gradient-to-r from-amber-600 via-yellow-300 to-amber-500"></div>

          {/* Ticket Flex Layout */}
          <div className="flex flex-col md:flex-row items-stretch">
            {/* LEFT / MAIN VIP PASS STUB */}
            <div className="flex-1 p-5 sm:p-7 relative overflow-hidden flex flex-col justify-between">
              {/* Top Row: Event Brand & Pass Type */}
              <div className="flex items-center justify-between gap-3 border-b border-amber-500/20 pb-3 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-yellow-400 flex items-center justify-center text-black font-serif-title font-bold text-sm shadow-md shrink-0">
                    LB
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-serif-title font-bold tracking-widest text-white leading-tight uppercase">
                      LONTHA BOYS PARTY SAGA
                    </h4>
                    <p className="text-[8px] text-amber-400 tracking-[0.2em] uppercase font-mono">
                      OCTOBER 2026 • RETREAT PASS
                    </p>
                  </div>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-400/40 text-[9px] font-bold uppercase tracking-widest shrink-0">
                  GOLDEN VIP PASS
                </span>
              </div>

              {/* Middle: Guest Name & Access Tier */}
              <div className="space-y-1.5 my-2">
                <span className="text-[9px] uppercase tracking-[0.25em] text-gray-400 block font-mono">
                  ADMIT VIP PASS HOLDER:
                </span>
                <h3 className="text-2xl sm:text-4xl font-serif-title font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 tracking-wide leading-tight">
                  {effectiveGuestName}
                </h3>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  <span className="px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] font-bold font-mono">
                    {accessTier}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Gate Key: <strong className="text-white">LBO26</strong>
                  </span>
                </div>
              </div>

              {/* Bottom Row: Dates, Venue, Security Stamp */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border-t border-amber-500/20 pt-3 mt-4 text-[10px]">
                <div>
                  <span className="text-[8px] text-gray-500 uppercase block font-mono">
                    Dates
                  </span>
                  <strong className="text-amber-100 block font-serif-title text-xs">
                    Oct 30 - Nov 1, 2026
                  </strong>
                </div>
                <div>
                  <span className="text-[8px] text-gray-500 uppercase block font-mono">
                    Resort Venue
                  </span>
                  <strong className="text-amber-100 block font-serif-title text-xs truncate">
                    Canterbury Resort, Kandy
                  </strong>
                </div>
                <div className="col-span-2 sm:col-span-1 flex items-center justify-end">
                  <div className="text-right">
                    <span className="text-[8px] text-amber-400/80 uppercase block font-mono">
                      Security Hash
                    </span>
                    <span className="font-mono text-[9px] text-gray-400">
                      {ticketSerial}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* PERFORATED COUPON SEPARATOR LINE */}
            <div className="relative flex md:flex-col items-center justify-between border-t md:border-t-0 md:border-l-2 border-dashed border-amber-400/40 bg-black/40 px-3 py-2 md:px-0">
              {/* Top Notch Hole */}
              <div className="hidden md:block w-5 h-5 rounded-full bg-[#040204] -mt-3.5 -ml-2.5 border border-amber-400/30"></div>
              {/* Bottom Notch Hole */}
              <div className="hidden md:block w-5 h-5 rounded-full bg-[#040204] -mb-3.5 -ml-2.5 border border-amber-400/30"></div>
            </div>

            {/* RIGHT / QR CODE VERIFICATION STUB */}
            <div className="w-full md:w-56 p-5 sm:p-6 bg-gradient-to-b from-black/80 via-neutral-950 to-black/90 flex flex-col items-center justify-between text-center gap-3">
              <div className="w-full text-center">
                <span className="text-[8px] tracking-[0.2em] uppercase font-mono text-amber-300 block">
                  SCAN TO VERIFY
                </span>
                <span className="text-[10px] font-bold font-serif-title text-white">
                  GATE CHECK-IN
                </span>
              </div>

              {/* QR Code Container */}
              <div className="p-2 rounded-2xl bg-[#FFFBEB] border-2 border-amber-400 shadow-md">
                {qrDataUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrDataUrl}
                    alt="Golden Ticket VIP QR Code"
                    className="w-28 h-28 sm:w-32 sm:h-32 object-contain"
                  />
                ) : (
                  <div className="w-28 h-28 flex items-center justify-center text-xs text-gray-400">
                    Generating QR...
                  </div>
                )}
              </div>

              {/* Passcode Reminder & Barcode Lines */}
              <div className="w-full space-y-1">
                <div className="h-3 w-3/4 mx-auto flex items-end justify-center gap-0.5 opacity-60">
                  <span className="w-1 h-3 bg-amber-400"></span>
                  <span className="w-0.5 h-2 bg-amber-200"></span>
                  <span className="w-1.5 h-3 bg-amber-400"></span>
                  <span className="w-0.5 h-1.5 bg-amber-200"></span>
                  <span className="w-1 h-3 bg-amber-400"></span>
                  <span className="w-2 h-2.5 bg-amber-400"></span>
                  <span className="w-0.5 h-3 bg-amber-200"></span>
                </div>
                <p className="text-[9px] font-mono font-bold text-amber-400">
                  NO ENTRY WITHOUT PASS
                </p>
              </div>
            </div>
          </div>

          {/* Shimmer Gold Bottom Edge Banner */}
          <div className="h-1.5 w-full bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-600"></div>
        </div>
      </div>
    </section>
  );
}
