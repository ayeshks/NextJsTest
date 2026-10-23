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
  const [ticketSerial, setTicketSerial] = useState("LB26-WONKA-7749");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const ticketCardRef = useRef(null);

  // Fetch registered accounts and attendees from MongoDB Atlas / API
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

  // Generate QR code for verification with full party details
  useEffect(() => {
    async function makeQr() {
      try {
        const qrPayload = JSON.stringify({
          ticket: "WILLY WONKA GOLDEN TICKET",
          event: "Lontha Boys Party Saga 2026",
          guest: effectiveGuestName,
          tier: accessTier,
          serial: ticketSerial,
          dates: "Oct 30 - Nov 1, 2026",
          time: "8:00 P.M. (Check-in 2:00 P.M.)",
          venue: "Canterbury Nature & Wellness Resort, Kandy, Sri Lanka",
          gateCode: "LBO26",
          admittance: "ENSURED_VIP",
        });

        const dataUrl = await QRCode.toDataURL(qrPayload, {
          width: 320,
          margin: 1,
          color: {
            dark: "#1A0F05",
            light: "#FDF5C4",
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
    setTicketSerial(`LB26-WONKA-${randomNum}`);
  };

  // Helper to draw the authentic circular factory crest
  const drawFactoryStamp = (ctx, x, y, radius) => {
    ctx.save();
    ctx.translate(x, y);

    // Double circle boundary
    ctx.strokeStyle = "#1A1008";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, radius - 8, 0, Math.PI * 2);
    ctx.stroke();

    // Dotted decorative ring
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, radius - 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Arched text "LONTHA BOYS" along top curve
    const text = "LONTHA BOYS";
    ctx.font = "bold 18px 'Cinzel', Georgia, serif";
    ctx.fillStyle = "#1A1008";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const totalAngle = Math.PI * 0.65;
    const startAngle = -Math.PI / 2 - totalAngle / 2;
    const angleStep = totalAngle / (text.length - 1);
    const textRadius = radius - 24;

    for (let i = 0; i < text.length; i++) {
      const angle = startAngle + i * angleStep;
      ctx.save();
      ctx.rotate(angle + Math.PI / 2);
      ctx.translate(0, -textRadius);
      ctx.fillText(text[i], 0, 0);
      ctx.restore();
    }

    // Factory Silhouette in center
    ctx.fillStyle = "#1A1008";
    ctx.fillRect(-radius * 0.55, radius * 0.32, radius * 1.1, 4); // ground
    ctx.fillRect(-radius * 0.45, radius * 0.05, radius * 0.9, radius * 0.28); // base

    // Chimneys
    ctx.fillRect(-radius * 0.35, -radius * 0.28, radius * 0.14, radius * 0.34);
    ctx.fillRect(-radius * 0.37, -radius * 0.32, radius * 0.18, 5);

    ctx.fillRect(-radius * 0.08, -radius * 0.46, radius * 0.16, radius * 0.52);
    ctx.fillRect(-radius * 0.1, -radius * 0.5, radius * 0.2, 5);

    ctx.fillRect(radius * 0.2, -radius * 0.24, radius * 0.14, radius * 0.3);
    ctx.fillRect(radius * 0.18, -radius * 0.28, radius * 0.18, 5);

    // Billowing smoke puffs
    ctx.strokeStyle = "#1A1008";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(radius * 0.02, -radius * 0.6, 7, Math.PI * 0.5, Math.PI * 1.7);
    ctx.arc(radius * 0.14, -radius * 0.7, 10, Math.PI * 0.8, Math.PI * 2);
    ctx.arc(radius * 0.3, -radius * 0.66, 12, Math.PI, Math.PI * 2.2);
    ctx.stroke();

    // Bottom stars
    const starAngles = [-0.3, -0.15, 0, 0.15, 0.3];
    starAngles.forEach((a) => {
      ctx.save();
      ctx.rotate(Math.PI / 2 + a);
      ctx.translate(0, radius - 22);
      ctx.beginPath();
      ctx.arc(0, 0, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    ctx.restore();
  };

  // High-Resolution 300+ DPI Wonka Golden Ticket Canvas Renderer
  const createWonkaCanvas = async () => {
    if (typeof document !== "undefined" && document.fonts) {
      await document.fonts.ready;
    }

    const canvas = document.createElement("canvas");
    // Aspect ratio 2.2 : 1 (matches 176mm x 80mm PDF dimensions at ~305 DPI)
    const width = 2112;
    const height = 960;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    const toothIndent = 32;
    const toothCount = 18;
    const toothHeight = height / toothCount;

    // 1. Saw-tooth serrated clipping path on left & right
    ctx.beginPath();
    ctx.moveTo(toothIndent, 0);
    ctx.lineTo(width - toothIndent, 0);

    for (let i = 0; i < toothCount; i++) {
      const yTop = i * toothHeight;
      const yMid = (i + 0.5) * toothHeight;
      const yBot = (i + 1) * toothHeight;
      ctx.lineTo(width - toothIndent, yTop);
      ctx.lineTo(width, yMid);
      ctx.lineTo(width - toothIndent, yBot);
    }

    ctx.lineTo(toothIndent, height);

    for (let i = toothCount - 1; i >= 0; i--) {
      const yBot = (i + 1) * toothHeight;
      const yMid = (i + 0.5) * toothHeight;
      const yTop = i * toothHeight;
      ctx.lineTo(toothIndent, yBot);
      ctx.lineTo(0, yMid);
      ctx.lineTo(toothIndent, yTop);
    }
    ctx.closePath();
    ctx.clip();

    // 2. Base Metallic Golden Foil Linear Gradient
    const goldGrad = ctx.createLinearGradient(0, 0, width, 0);
    goldGrad.addColorStop(0.0, "#C49220");
    goldGrad.addColorStop(0.08, "#E6BF55");
    goldGrad.addColorStop(0.2, "#FFF5BD");
    goldGrad.addColorStop(0.35, "#D5A42E");
    goldGrad.addColorStop(0.5, "#FFF7C6");
    goldGrad.addColorStop(0.65, "#E2B743");
    goldGrad.addColorStop(0.8, "#FEE382");
    goldGrad.addColorStop(0.92, "#BE8917");
    goldGrad.addColorStop(1.0, "#C49220");
    ctx.fillStyle = goldGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle horizontal brushed foil streaks
    for (let y = 0; y < height; y += 4) {
      const opacity = 0.02 + Math.sin(y * 0.15) * 0.02;
      ctx.fillStyle =
        y % 8 === 0
          ? `rgba(255, 255, 255, ${opacity * 1.8})`
          : `rgba(120, 75, 10, ${opacity})`;
      ctx.fillRect(0, y, width, 2);
    }

    // 3. Top Left Factory Stamp
    drawFactoryStamp(ctx, 230, 195, 95);

    // 4. Center Top Vintage Script: "Wonka"
    ctx.fillStyle = "#150D06";
    ctx.font = "142px 'Great Vibes', 'Alex Brush', cursive";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Wonka", width / 2, 195);

    // 5. Upper Horizontal Divider Line
    const dividerMargin = toothIndent + 40;
    ctx.fillStyle = "#150D06";
    ctx.fillRect(dividerMargin, 280, width - dividerMargin * 2, 4.5);

    // 6. Giant Bold Compressed Headline: "GOLDEN TICKET"
    ctx.fillStyle = "#150D06";
    ctx.save();
    ctx.translate(width / 2, 435);
    ctx.scale(0.92, 1.25);
    ctx.font = "900 152px 'Cinzel', 'Playfair Display', Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = "10px";
    ctx.fillText("GOLDEN TICKET", 0, 0);
    ctx.restore();

    // 7. Lower Horizontal Divider Line
    ctx.fillStyle = "#150D06";
    ctx.fillRect(dividerMargin, 555, width - dividerMargin * 2, 4.5);

    // 8. Three Information Columns with Party Details
    const col1X = 380;
    const col2X = 980;
    const col3X = 1580;

    // Headers
    ctx.fillStyle = "#2D1D10";
    ctx.font = "bold 26px 'Cinzel', Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = "3px";
    ctx.fillText("DATE", col1X, 605);
    ctx.fillText("TIME", col2X, 605);
    ctx.fillText("PLACE", col3X, 605);

    // Values (Party Details)
    ctx.fillStyle = "#150D06";
    ctx.font = "bold 52px 'Cinzel', Georgia, serif";
    ctx.fillText("OCT. 30", col1X, 665);
    ctx.fillText("8:00 P.M.", col2X, 665);
    ctx.fillText("CANTERBURY", col3X, 665);

    // Subtext Details
    ctx.font = "bold 22px 'Cinzel', Georgia, serif";
    ctx.fillStyle = "#3D2714";
    ctx.fillText("2026 RETREAT", col1X, 715);
    ctx.fillText("(CHECK-IN 2 P.M.)", col2X, 715);
    ctx.fillText("KANDY RESORT", col3X, 715);

    // 9. Personalized VIP Inscription Row
    ctx.strokeStyle = "rgba(21, 13, 6, 0.35)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(dividerMargin + 50, 760);
    ctx.lineTo(width - dividerMargin - 50, 760);
    ctx.stroke();

    ctx.fillStyle = "#1A1008";
    ctx.font = "bold 28px 'Cinzel', Georgia, serif";
    ctx.textAlign = "center";
    ctx.letterSpacing = "2px";
    ctx.fillText(`PRESENTED TO: ${effectiveGuestName.toUpperCase()}`, width / 2, 800);

    ctx.font = "bold 18px monospace";
    ctx.fillStyle = "#3D2714";
    ctx.fillText(
      `SERIAL: ${ticketSerial}   •   SECURITY KEY: LBO26   •   ${accessTier.toUpperCase()}`,
      width / 2,
      838
    );

    // 10. QR Code Seal on Right Side
    if (qrDataUrl) {
      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      qrImg.src = qrDataUrl;
      await new Promise((resolve) => {
        if (qrImg.complete) resolve();
        else qrImg.onload = resolve;
      });

      const qrSize = 175;
      const qrX = width - toothIndent - 235;
      const qrY = 595;

      ctx.fillStyle = "#FDF7C8";
      ctx.beginPath();
      ctx.roundRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 10);
      ctx.fill();
      ctx.strokeStyle = "#1A1008";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    }

    // 11. Bottom Admittance Guarantee Banner
    ctx.fillStyle = "#150D06";
    ctx.font = "bold 24px 'Cinzel', Georgia, serif";
    ctx.textAlign = "center";
    ctx.letterSpacing = "4px";
    ctx.fillText(
      "THIS GOLDEN TICKET ENSURES ADMITTANCE TO LONTHA BOYS PARTY SAGA.",
      width / 2,
      905
    );

    return canvas;
  };

  // TRUE-SIZE POCKET TICKET PDF (176mm x 80mm, Pixel-Perfect)
  const handleDownloadPocketPdf = async () => {
    setIsGeneratingPdf(true);
    setDownloadSuccess(false);

    try {
      const canvas = await createWonkaCanvas();
      const imgData = canvas.toDataURL("image/png");

      const ticketWidthMm = 176;
      const ticketHeightMm = 80;

      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [ticketHeightMm, ticketWidthMm],
      });

      pdf.addImage(imgData, "PNG", 0, 0, ticketWidthMm, ticketHeightMm, undefined, "FAST");

      const safeName = effectiveGuestName.replace(/[^a-zA-Z0-9_-]/g, "_");
      pdf.save(`Lontha_Boys_Wonka_Golden_Ticket_${safeName}.pdf`);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error("Pocket PDF generation failed:", err);
      alert(`PDF download error: ${err.message || "Failed to generate PDF"}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // A4 PRINTABLE SHEET PDF (Centered on standard A4 paper with scissor cut marks)
  const handleDownloadA4PrintablePdf = async () => {
    setIsGeneratingPdf(true);
    setDownloadSuccess(false);

    try {
      const canvas = await createWonkaCanvas();
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageW = 210;
      const ticketW = 176;
      const ticketH = 80;
      const posX = (pageW - ticketW) / 2;
      const posY = 55;

      pdf.setDrawColor(160, 120, 60);
      pdf.setLineDashPattern([2.5, 2.5], 0);
      pdf.rect(posX - 1.5, posY - 1.5, ticketW + 3, ticketH + 3);

      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(8.5);
      pdf.setTextColor(110, 80, 40);
      pdf.text(
        "✂  CUT ALONG DASHED LINE FOR PHYSICAL WONKA GOLDEN TICKET  ✂",
        pageW / 2,
        posY - 5,
        { align: "center" }
      );

      pdf.addImage(imgData, "PNG", posX, posY, ticketW, ticketH, undefined, "FAST");

      pdf.setFont("times", "italic");
      pdf.setFontSize(10);
      pdf.setTextColor(90, 70, 40);
      pdf.text(
        "Lontha Boys Party Saga • Oct 30 - Nov 1, 2026 • Canterbury Nature Resort, Kandy • Code: LBO26",
        pageW / 2,
        posY + ticketH + 15,
        { align: "center" }
      );

      const safeName = effectiveGuestName.replace(/[^a-zA-Z0-9_-]/g, "_");
      pdf.save(`Lontha_Boys_Wonka_Ticket_A4_Print_${safeName}.pdf`);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 4000);
    } catch (err) {
      console.error("A4 PDF generation failed:", err);
      alert(`A4 PDF download error: ${err.message || "Failed to generate PDF"}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // High-Resolution 300 DPI PNG Download
  const handleDownloadPng = async () => {
    try {
      const canvas = await createWonkaCanvas();
      const link = document.createElement("a");
      const safeName = effectiveGuestName.replace(/[^a-zA-Z0-9_-]/g, "_");
      link.download = `Lontha_Boys_Wonka_Golden_Ticket_${safeName}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("PNG export error:", err);
    }
  };

  return (
    <section
      id="vip-ticket"
      className="glass-panel-crimson rounded-2xl sm:rounded-3xl p-3 sm:p-8 border border-amber-500/40 relative overflow-hidden"
    >
      {/* Golden Aura Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-gradient-to-r from-amber-500/15 via-yellow-400/15 to-red-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 relative z-10">
        <div>
          <span className="text-[10px] font-semibold text-amber-400 tracking-[0.25em] uppercase flex items-center gap-1.5">
            <i className="fa-solid fa-crown text-amber-400"></i> Official Lontha Boys 2026 Pass
          </span>
          <h2 className="text-xl sm:text-3xl font-serif-title font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 mt-1">
            WONKA GOLDEN TICKET GENERATOR
          </h2>
          <p className="text-xs text-gray-300 mt-0.5">
            Featuring your Lontha Boys party dates, Kandy resort venue, security key, serrated edges, and pixel-perfect mobile &amp; laptop scaling.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-black/80 px-3.5 py-1.5 rounded-xl border border-amber-500/40 text-xs text-amber-300 w-fit shrink-0">
          <i className="fa-solid fa-database text-amber-400"></i>
          <span>Atlas DB Connected</span>
        </div>
      </div>

      {/* Generator Controls Form */}
      <div className="max-w-4xl mx-auto mb-6 bg-black/85 p-3.5 sm:p-5 rounded-2xl border border-amber-500/35 relative z-10 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
          {/* Guest Name Selection */}
          <div className="sm:col-span-6 space-y-1">
            <label className="block text-[11px] font-semibold text-amber-200 uppercase tracking-wider">
              1. Guest of Honor / Alias
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
          <div className="sm:col-span-3 space-y-1">
            <label className="block text-[11px] font-semibold text-amber-200 uppercase tracking-wider">
              2. VIP Tier
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

          {/* Regenerate Serial */}
          <div className="sm:col-span-3">
            <button
              type="button"
              onClick={handleRegenerateSerial}
              className="w-full py-2.5 px-3 rounded-xl font-serif-title font-bold text-xs uppercase tracking-wider bg-white/10 hover:bg-white/15 border border-amber-500/40 text-amber-200 shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <i className="fa-solid fa-arrows-rotate"></i>
              <span>New Serial Key</span>
            </button>
          </div>
        </div>
      </div>

      {/* THE PROPORTIONAL WONKA GOLDEN TICKET DISPLAY */}
      {/* Container query ensures MOBILE and LAPTOP display identical aspect ratio and typography */}
      <div className="max-w-4xl mx-auto mb-6 relative z-10">
        {/* Action Bar Above Ticket */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
            <span className="text-xs text-amber-200 font-mono font-bold tracking-wider">
              NO. {ticketSerial}
            </span>
            {downloadSuccess && (
              <span className="text-xs text-emerald-400 font-bold ml-2 animate-bounce flex items-center gap-1">
                <i className="fa-solid fa-circle-check"></i> True-Size PDF Downloaded!
              </span>
            )}
          </div>

          {/* Download Buttons Group */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleDownloadPocketPdf}
              disabled={isGeneratingPdf}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black font-wonka-title font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="Compact 176mm x 80mm pocket golden ticket PDF"
            >
              <i className="fa-solid fa-file-pdf"></i>
              <span>{isGeneratingPdf ? "Generating..." : "Download Ticket (PDF)"}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadA4PrintablePdf}
              disabled={isGeneratingPdf}
              className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-amber-500/40 text-amber-200 font-wonka-title font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="A4 Printable Sheet with scissor cutting guide"
            >
              <i className="fa-solid fa-scissors text-amber-400"></i>
              <span>Print Sheet (A4)</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPng}
              className="px-3 py-2 rounded-xl bg-black/60 hover:bg-black/90 border border-white/20 text-gray-200 font-wonka-title font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
              title="Download 300 DPI PNG"
            >
              <i className="fa-solid fa-image"></i>
              <span>PNG</span>
            </button>
          </div>
        </div>

        {/* CONTAINER QUERY WRAPPER FOR MATHEMATICALLY IDENTICAL MOBILE & LAPTOP PRESENTATION */}
        <div
          className="w-full @container"
          style={{ containerType: "inline-size" }}
        >
          <div
            ref={ticketCardRef}
            className="w-full relative shadow-[0_20px_60px_-15px_rgba(234,179,8,0.45)] select-none overflow-hidden rounded-md"
            style={{
              aspectRatio: "2.2 / 1",
              background:
                "linear-gradient(90deg, #C28E1E 0%, #E8C156 10%, #FFF3B8 22%, #D5A42E 36%, #FFF8C9 50%, #E2B743 65%, #FEE382 80%, #BE8917 92%, #C28E1E 100%)",
              color: "#150D06",
            }}
          >
            {/* Saw-tooth Perforated Edges on Left and Right */}
            <div
              className="absolute left-0 top-0 bottom-0 z-20 pointer-events-none"
              style={{
                width: "1.5cqw",
                background:
                  "radial-gradient(circle at 0px 50%, transparent 60%, #040204 62%)",
                backgroundSize: "1.5cqw 5.5cqh",
              }}
            ></div>
            <div
              className="absolute right-0 top-0 bottom-0 z-20 pointer-events-none"
              style={{
                width: "1.5cqw",
                background:
                  "radial-gradient(circle at 100% 50%, transparent 60%, #040204 62%)",
                backgroundSize: "1.5cqw 5.5cqh",
              }}
            ></div>

            {/* Ticket Surface Layout using cqw units for exact mobile & laptop parity */}
            <div
              className="w-full h-full relative z-10 flex flex-col justify-between"
              style={{
                padding: "3.2cqw 4.5cqw 2.8cqw 4.5cqw",
              }}
            >
              {/* Top Row: Factory Stamp + "Wonka" Script Logo + QR Badge */}
              <div className="relative flex items-center justify-center w-full">
                {/* Circular Factory Stamp (Top Left) */}
                <div
                  className="absolute left-0 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-full border border-[#1A1008] p-0.5 opacity-90"
                  style={{ width: "9.5cqw", height: "9.5cqw" }}
                >
                  <div className="w-full h-full rounded-full border border-dashed border-[#1A1008] flex flex-col items-center justify-center text-center p-0.5">
                    <span
                      className="font-bold tracking-widest uppercase font-wonka-title leading-none"
                      style={{ fontSize: "0.8cqw" }}
                    >
                      LONTHA BOYS
                    </span>
                    <i
                      className="fa-solid fa-industry text-[#1A1008]"
                      style={{ fontSize: "1.8cqw", margin: "0.2cqw 0" }}
                    ></i>
                    <span
                      className="font-bold font-mono tracking-widest text-[#1A1008]"
                      style={{ fontSize: "0.7cqw" }}
                    >
                      OCT 2026
                    </span>
                  </div>
                </div>

                {/* Center "Wonka" script */}
                <h1
                  className="font-wonka-script text-[#150D06] tracking-wide select-none leading-none"
                  style={{ fontSize: "6.8cqw" }}
                >
                  Wonka
                </h1>

                {/* QR Verification Badge (Top Right) */}
                <div
                  className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 bg-[#FDF7C8]/90 rounded border border-[#1A1008]/40 shadow-sm"
                  style={{ padding: "0.4cqw" }}
                >
                  {qrDataUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={qrDataUrl}
                      alt="Scan Golden Ticket"
                      style={{ width: "5cqw", height: "5cqw" }}
                      className="object-contain"
                    />
                  )}
                  <div
                    className="font-wonka-title font-bold leading-tight text-[#1A1008] hidden sm:block"
                    style={{ fontSize: "0.8cqw" }}
                  >
                    <span>CANTERBURY</span>
                    <br />
                    <span>VERIFIED</span>
                  </div>
                </div>
              </div>

              {/* Divider Line 1 (Above Title) */}
              <div
                className="bg-[#150D06] w-full"
                style={{ height: "0.25cqw", margin: "0.6cqw 0" }}
              ></div>

              {/* Main Title: GOLDEN TICKET (Giant Compressed Slab Serif) */}
              <div className="text-center w-full">
                <h2
                  className="font-wonka-title font-black text-[#150D06] uppercase leading-none drop-shadow-sm select-none"
                  style={{
                    fontSize: "7.2cqw",
                    letterSpacing: "0.4cqw",
                  }}
                >
                  GOLDEN TICKET
                </h2>
              </div>

              {/* Divider Line 2 (Below Title) */}
              <div
                className="bg-[#150D06] w-full"
                style={{ height: "0.25cqw", margin: "0.6cqw 0" }}
              ></div>

              {/* Three Information Columns with Party Details */}
              <div className="grid grid-cols-3 gap-1 text-center w-full">
                <div>
                  <span
                    className="block font-wonka-title font-bold tracking-widest text-[#2D1D10]"
                    style={{ fontSize: "1.3cqw" }}
                  >
                    DATE
                  </span>
                  <span
                    className="block font-wonka-title font-extrabold text-[#150D06] tracking-wide leading-tight"
                    style={{ fontSize: "2.6cqw", marginTop: "0.2cqw" }}
                  >
                    OCT. 30 - NOV. 1
                  </span>
                  <span
                    className="block font-wonka-title font-bold text-[#3D2714]"
                    style={{ fontSize: "1.1cqw", marginTop: "0.1cqw" }}
                  >
                    2026 RETREAT
                  </span>
                </div>

                <div>
                  <span
                    className="block font-wonka-title font-bold tracking-widest text-[#2D1D10]"
                    style={{ fontSize: "1.3cqw" }}
                  >
                    TIME
                  </span>
                  <span
                    className="block font-wonka-title font-extrabold text-[#150D06] tracking-wide leading-tight"
                    style={{ fontSize: "2.6cqw", marginTop: "0.2cqw" }}
                  >
                    8:00 P.M.
                  </span>
                  <span
                    className="block font-wonka-title font-bold text-[#3D2714]"
                    style={{ fontSize: "1.1cqw", marginTop: "0.1cqw" }}
                  >
                    CHECK-IN: 2:00 P.M.
                  </span>
                </div>

                <div>
                  <span
                    className="block font-wonka-title font-bold tracking-widest text-[#2D1D10]"
                    style={{ fontSize: "1.3cqw" }}
                  >
                    PLACE
                  </span>
                  <span
                    className="block font-wonka-title font-extrabold text-[#150D06] tracking-wide leading-tight truncate"
                    style={{ fontSize: "2.6cqw", marginTop: "0.2cqw" }}
                  >
                    CANTERBURY RESORT
                  </span>
                  <span
                    className="block font-wonka-title font-bold text-[#3D2714] truncate"
                    style={{ fontSize: "1.1cqw", marginTop: "0.1cqw" }}
                  >
                    KANDY, SRI LANKA
                  </span>
                </div>
              </div>

              {/* Guest of Honor Inscription Row */}
              <div
                className="border-t border-[#150D06]/35 text-center w-full"
                style={{
                  paddingTop: "0.4cqw",
                  marginTop: "0.4cqw",
                }}
              >
                <p
                  className="font-wonka-title font-bold tracking-wider text-[#1A1008] leading-tight"
                  style={{ fontSize: "1.4cqw" }}
                >
                  PRESENTED TO:{" "}
                  <strong className="underline decoration-[#150D06]/50">
                    {effectiveGuestName.toUpperCase()}
                  </strong>
                </p>
                <p
                  className="font-mono text-[#3D2714] tracking-wider leading-tight"
                  style={{ fontSize: "1.0cqw", marginTop: "0.1cqw" }}
                >
                  NO. {ticketSerial} • GATE CODE: LBO26 • {accessTier}
                </p>
              </div>

              {/* Bottom Admittance Banner */}
              <div className="text-center w-full" style={{ paddingTop: "0.2cqw" }}>
                <span
                  className="font-wonka-title font-bold tracking-[0.25em] uppercase text-[#150D06] block leading-none"
                  style={{ fontSize: "1.25cqw" }}
                >
                  THIS GOLDEN TICKET ENSURES ADMITTANCE TO LONTHA BOYS PARTY SAGA.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
