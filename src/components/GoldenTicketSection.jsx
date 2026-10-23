"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import QRCode from "qrcode";
import jsPDF from "jspdf";

// Curated Vibrant VIP Party Palette
const PARTY_PALETTES = [
  { hex: "#10B981", name: "Neon Mint", glow: "rgba(16, 185, 129, 0.75)", text: "#064E3B", border: "#34D399" },
  { hex: "#9333EA", name: "Royal Amethyst", glow: "rgba(147, 51, 234, 0.75)", text: "#581C87", border: "#A855F7" },
  { hex: "#2563EB", name: "Electric Sapphire", glow: "rgba(37, 99, 235, 0.75)", text: "#1E3A8A", border: "#3B82F6" },
  { hex: "#DC2626", name: "Neon Crimson", glow: "rgba(220, 38, 38, 0.75)", text: "#7F1D1D", border: "#EF4444" },
  { hex: "#0D9488", name: "Teal Matrix", glow: "rgba(13, 148, 136, 0.75)", text: "#134E4A", border: "#14B8A6" },
  { hex: "#EA580C", name: "Solar Lava", glow: "rgba(234, 88, 12, 0.75)", text: "#7C2D12", border: "#F97316" },
  { hex: "#C026D3", name: "Cyber Fuchsia", glow: "rgba(192, 38, 211, 0.75)", text: "#701A75", border: "#D946EF" },
  { hex: "#4F46E5", name: "Deep Indigo", glow: "rgba(79, 70, 229, 0.75)", text: "#312E81", border: "#6366F1" },
  { hex: "#E11D48", name: "Ruby Flare", glow: "rgba(225, 29, 72, 0.75)", text: "#881337", border: "#F43F5E" },
  { hex: "#059669", name: "Emerald Cyber", glow: "rgba(5, 150, 105, 0.75)", text: "#064E3B", border: "#10B981" },
  { hex: "#D97706", name: "Golden Amber", glow: "rgba(217, 119, 6, 0.75)", text: "#78350F", border: "#F59E0B" },
  { hex: "#7C3AED", name: "Midnight Violet", glow: "rgba(124, 58, 237, 0.75)", text: "#4C1D95", border: "#8B5CF6" },
  { hex: "#0891B2", name: "Oceanic Cyan", glow: "rgba(8, 145, 178, 0.75)", text: "#164E63", border: "#06B6D4" },
  { hex: "#EC4899", name: "Hot Pink", glow: "rgba(236, 72, 153, 0.75)", text: "#831843", border: "#F472B6" },
  { hex: "#8B5CF6", name: "Ultra Violet", glow: "rgba(139, 92, 246, 0.75)", text: "#4C1D95", border: "#A78BFA" },
  { hex: "#F59E0B", name: "Radiant Gold", glow: "rgba(245, 158, 11, 0.75)", text: "#78350F", border: "#FBBF24" },
];

// Deterministic FNV-1a Color Hash: Same name ALWAYS produces the exact same signature color
export function getPartyColorForName(name) {
  if (!name || typeof name !== "string") {
    return PARTY_PALETTES[0];
  }

  const clean = name.trim().toLowerCase();
  let hash = 2166136261;
  for (let i = 0; i < clean.length; i++) {
    hash ^= clean.charCodeAt(i);
    hash +=
      (hash << 1) +
      (hash << 4) +
      (hash << 7) +
      (hash << 8) +
      (hash << 24);
  }

  const index = Math.abs(hash >>> 0) % PARTY_PALETTES.length;
  const picked = PARTY_PALETTES[index];
  return {
    ...picked,
    bgLight: `${picked.hex}25`,
  };
}

export default function GoldenTicketSection({ activeAccount }) {
  const [accounts, setAccounts] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [selectedName, setSelectedName] = useState("");
  const [customName, setCustomName] = useState("");
  const [accessTier, setAccessTier] = useState("VIP Gold Pass - All Access");
  const [ticketSerial, setTicketSerial] = useState("LB26-LONTHA-7749");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // VIP Registration Form State
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberTier, setNewMemberTier] = useState("VIP Gold Pass - All Access");
  const [isSubmittingMember, setIsSubmittingMember] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(null);
  const [tableSearch, setTableSearch] = useState("");

  const ticketCardRef = useRef(null);

  // Fetch registered accounts and attendees from MongoDB Atlas / API
  const fetchMembers = async () => {
    try {
      const [accRes, attRes] = await Promise.all([
        fetch("/api/accounts"),
        fetch("/api/attendees"),
      ]);
      const [accJson, attJson] = await Promise.all([
        accRes.json(),
        attRes.json(),
      ]);

      if (accJson.success && Array.isArray(accJson.data)) {
        setAccounts(accJson.data);
      }
      if (attJson.success && Array.isArray(attJson.data)) {
        setAttendees(attJson.data);
      }
    } catch (err) {
      console.warn("Failed to load members for ticket:", err);
    }
  };

  useEffect(() => {
    fetchMembers();
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
      : selectedName || activeAccount?.alias || memberNames[0] || "Ayesh";

  // Deterministic personal party color for current selected name
  const currentPartyColor = useMemo(
    () => getPartyColorForName(effectiveGuestName),
    [effectiveGuestName]
  );

  // Live preview color for the registration input
  const previewNewColor = useMemo(
    () => getPartyColorForName(newMemberName.trim() || "Guest"),
    [newMemberName]
  );

  // Generate QR code for verification with full party details
  useEffect(() => {
    async function makeQr() {
      try {
        const qrPayload = JSON.stringify({
          ticket: "LONTHA GOLDEN TICKET",
          event: "Lontha Boys Party Saga 2026",
          guest: effectiveGuestName,
          tier: accessTier,
          partyColor: currentPartyColor.name,
          colorHex: currentPartyColor.hex,
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
  }, [effectiveGuestName, accessTier, ticketSerial, currentPartyColor]);

  const handleRegenerateSerial = () => {
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    setTicketSerial(`LB26-LONTHA-${randomNum}`);
  };

  // Register New Member into MongoDB Atlas
  const handleRegisterMember = async (e) => {
    e.preventDefault();
    const cleanName = newMemberName.trim();
    if (!cleanName) return;

    setIsSubmittingMember(true);
    const colorObj = getPartyColorForName(cleanName);

    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alias: cleanName,
          name: cleanName,
          role: newMemberTier,
          color: colorObj.hex,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setRegisterSuccess(`✓ ${cleanName} saved to MongoDB Atlas with color ${colorObj.name}!`);
        await fetchMembers();
        setSelectedName(cleanName);
        setAccessTier(newMemberTier);
        setNewMemberName("");
        setIsRegisterOpen(false);
        setTimeout(() => setRegisterSuccess(null), 4500);

        // Scroll smoothly to ticket
        ticketCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      } else {
        alert(json.error || "Failed to register member");
      }
    } catch (err) {
      console.error("Member registration error:", err);
      alert("Network error while connecting to MongoDB Atlas.");
    } finally {
      setIsSubmittingMember(false);
    }
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

    // 4. Center Top Vintage Script: "Lontha"
    ctx.fillStyle = "#150D06";
    ctx.font = "146px 'Great Vibes', 'Alex Brush', cursive";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Lontha", width / 2, 195);

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
    ctx.font = "bold 30px 'Cinzel', Georgia, serif";
    ctx.textAlign = "center";
    ctx.letterSpacing = "2px";
    ctx.fillText(`PRESENTED TO: ${effectiveGuestName.toUpperCase()}`, width / 2, 800);

    // Inscribed Name Underline in Generated Party Color
    ctx.fillStyle = currentPartyColor.hex;
    ctx.fillRect(width / 2 - 200, 818, 400, 4);

    ctx.font = "bold 18px monospace";
    ctx.fillStyle = "#3D2714";
    ctx.fillText(
      `SERIAL: ${ticketSerial}   •   SECURITY KEY: LBO26   •   ${accessTier.toUpperCase()}`,
      width / 2,
      842
    );

    // 10. QR Code Seal on Right Side (Upper)
    if (qrDataUrl) {
      const qrImg = new Image();
      qrImg.crossOrigin = "anonymous";
      qrImg.src = qrDataUrl;
      await new Promise((resolve) => {
        if (qrImg.complete) resolve();
        else qrImg.onload = resolve;
      });

      const qrSize = 160;
      const qrX = width - toothIndent - 225;
      const qrY = 590;

      ctx.fillStyle = "#FDF7C8";
      ctx.beginPath();
      ctx.roundRect(qrX - 6, qrY - 6, qrSize + 12, qrSize + 12, 10);
      ctx.fill();
      ctx.strokeStyle = "#1A1008";
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
    }

    // 11. Right Side Bottom: YOUR PARTY COLOR BADGE (Exact requirement)
    const colorBadgeX = width - toothIndent - 235;
    const colorBadgeY = 790;
    const colorBadgeW = 180;
    const colorBadgeH = 50;

    ctx.save();
    ctx.fillStyle = "rgba(253, 245, 196, 0.9)";
    ctx.beginPath();
    ctx.roundRect(colorBadgeX, colorBadgeY, colorBadgeW, colorBadgeH, 12);
    ctx.fill();
    ctx.strokeStyle = currentPartyColor.hex;
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = currentPartyColor.hex;
    ctx.beginPath();
    ctx.arc(colorBadgeX + 22, colorBadgeY + 25, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#1A1008";
    ctx.font = "bold 11px monospace";
    ctx.textAlign = "left";
    ctx.fillText("YOUR PARTY COLOR", colorBadgeX + 40, colorBadgeY + 20);

    ctx.fillStyle = currentPartyColor.hex;
    ctx.font = "bold 13px 'Cinzel', Georgia, serif";
    ctx.fillText(currentPartyColor.name.toUpperCase(), colorBadgeX + 40, colorBadgeY + 38);
    ctx.restore();

    // 12. Bottom Admittance Guarantee Banner
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
      pdf.save(`Lontha_Golden_Ticket_${safeName}.pdf`);

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
        "✂  CUT ALONG DASHED LINE FOR PHYSICAL LONTHA GOLDEN TICKET  ✂",
        pageW / 2,
        posY - 5,
        { align: "center" }
      );

      pdf.addImage(imgData, "PNG", posX, posY, ticketW, ticketH, undefined, "FAST");

      pdf.setFont("times", "italic");
      pdf.setFontSize(10);
      pdf.setTextColor(90, 70, 40);
      pdf.text(
        `Lontha Boys Party Saga • ${effectiveGuestName} • Party Color: ${currentPartyColor.name} (${currentPartyColor.hex})`,
        pageW / 2,
        posY + ticketH + 15,
        { align: "center" }
      );

      const safeName = effectiveGuestName.replace(/[^a-zA-Z0-9_-]/g, "_");
      pdf.save(`Lontha_Golden_Ticket_A4_Print_${safeName}.pdf`);

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
      link.download = `Lontha_Golden_Ticket_${safeName}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (err) {
      console.error("PNG export error:", err);
    }
  };

  // Unified list of members for the table and registry
  const tableMembers = useMemo(() => {
    const list = memberNames.map((name) => {
      const accountMatch = accounts.find(
        (a) => (a.alias || a.name || "").toLowerCase() === name.toLowerCase()
      );
      return {
        name,
        role: accountMatch?.role || "VIP Member",
        color: getPartyColorForName(name),
      };
    });

    if (tableSearch.trim()) {
      const q = tableSearch.trim().toLowerCase();
      return list.filter((m) => m.name.toLowerCase().includes(q) || m.role.toLowerCase().includes(q));
    }
    return list;
  }, [memberNames, accounts, tableSearch]);

  return (
    <section
      id="vip-ticket"
      className="glass-panel-crimson rounded-2xl sm:rounded-3xl p-3.5 sm:p-8 border border-amber-500/40 relative overflow-hidden"
    >
      {/* Dynamic Party Color Aura Background Glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[450px] rounded-full blur-3xl pointer-events-none transition-all duration-700 opacity-20"
        style={{
          background: `radial-gradient(circle, ${currentPartyColor.hex} 0%, rgba(245, 158, 11, 0.4) 50%, transparent 70%)`,
        }}
      ></div>

      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 relative z-10">
        <div>
          <span className="text-[10px] font-semibold text-amber-400 tracking-[0.25em] uppercase flex items-center gap-1.5">
            <i className="fa-solid fa-crown text-amber-400"></i> Official Lontha Boys 2026 Pass
          </span>
          <h2 className="text-xl sm:text-3xl font-serif-title font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-400 mt-1">
            LONTHA GOLDEN TICKET GENERATOR
          </h2>
          <p className="text-xs text-gray-300 mt-0.5">
            Personalized with your signature party color, retreat credentials, and mathematically identical scaling across mobile and laptop.
          </p>
        </div>

        {/* Live Active Party Color Tag + Register Button */}
        <div className="flex items-center gap-2 flex-wrap">
          <div
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl border text-xs font-mono transition-all shadow-md w-fit shrink-0"
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              borderColor: currentPartyColor.hex,
              color: "#FFF",
            }}
          >
            <span
              className="w-3 h-3 rounded-full animate-ping"
              style={{ backgroundColor: currentPartyColor.hex }}
            ></span>
            <span>
              {effectiveGuestName}&apos;s Color:{" "}
              <strong style={{ color: currentPartyColor.hex }}>
                {currentPartyColor.name}
              </strong>
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsRegisterOpen(!isRegisterOpen)}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-serif-title font-bold text-xs uppercase tracking-wider shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <i className={`fa-solid ${isRegisterOpen ? "fa-xmark" : "fa-user-plus"}`}></i>
            <span>{isRegisterOpen ? "Close Form" : "Register VIP Member"}</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {registerSuccess && (
        <div className="max-w-4xl mx-auto mb-4 p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between gap-2 shadow-lg animate-bounce">
          <div className="flex items-center gap-2">
            <i className="fa-solid fa-circle-check text-emerald-400 text-sm"></i>
            <span className="font-medium">{registerSuccess}</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-300">Synced with MongoDB Atlas</span>
        </div>
      )}

      {/* VIP REGISTRATION MODAL / INLINE FORM */}
      {isRegisterOpen && (
        <div className="max-w-4xl mx-auto mb-6 bg-neutral-950/95 p-4 sm:p-6 rounded-2xl border-2 border-emerald-500/50 shadow-2xl relative z-20 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-sm border border-emerald-500/40">
                <i className="fa-solid fa-id-card"></i>
              </div>
              <div>
                <h3 className="font-serif-title font-bold text-base text-white">
                  REGISTER NEW VIP PARTY MEMBER
                </h3>
                <p className="text-[11px] text-gray-400">
                  Adds guest to MongoDB Atlas database and generates their permanent party color.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsRegisterOpen(false)}
              className="text-gray-400 hover:text-white p-1"
            >
              <i className="fa-solid fa-xmark text-sm"></i>
            </button>
          </div>

          <form onSubmit={handleRegisterMember} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-5 space-y-1">
                <label className="block text-[11px] font-semibold text-emerald-300 uppercase tracking-wider font-mono">
                  VIP Alias / Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kasun, Ruwan, Saman"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  required
                  autoFocus
                  className="w-full px-3.5 py-2.5 rounded-xl bg-black border border-emerald-500/40 text-white text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div className="sm:col-span-4 space-y-1">
                <label className="block text-[11px] font-semibold text-emerald-300 uppercase tracking-wider font-mono">
                  VIP Access Tier
                </label>
                <select
                  value={newMemberTier}
                  onChange={(e) => setNewMemberTier(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-black border border-emerald-500/40 text-amber-100 text-xs font-medium focus:outline-none focus:border-emerald-400 cursor-pointer"
                >
                  <option value="VIP Gold Pass - All Access">VIP Gold Pass - All Access</option>
                  <option value="VIP Host & Villa Master">VIP Host &amp; Villa Master</option>
                  <option value="VIP Sound & DJ Access">VIP Sound &amp; DJ Access</option>
                  <option value="Luxury Villa Resident Pass">Luxury Villa Resident Pass</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <button
                  type="submit"
                  disabled={isSubmittingMember || !newMemberName.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 text-white font-serif-title font-bold text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <i className="fa-solid fa-cloud-arrow-up"></i>
                  <span>{isSubmittingMember ? "Saving..." : "Save to DB"}</span>
                </button>
              </div>
            </div>

            {/* Live Color Preview for the input name */}
            {newMemberName.trim() && (
              <div className="p-3 rounded-xl bg-black/80 border border-white/10 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded-full border border-white/40 shadow-sm"
                    style={{ backgroundColor: previewNewColor.hex }}
                  ></span>
                  <span className="text-xs text-gray-300">
                    Generated Signature Party Color:{" "}
                    <strong style={{ color: previewNewColor.hex }}>
                      {previewNewColor.name} ({previewNewColor.hex})
                    </strong>
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400">
                  Ready to Persist in Atlas
                </span>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Generator Controls Form */}
      <div className="max-w-4xl mx-auto mb-6 bg-black/85 p-3.5 sm:p-5 rounded-2xl border border-amber-500/35 relative z-10 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
          {/* Guest Name Selection */}
          <div className="sm:col-span-5 space-y-1">
            <label className="block text-[11px] font-semibold text-amber-200 uppercase tracking-wider">
              1. Guest of Honor / Alias
            </label>
            <div className="relative">
              <select
                value={selectedName}
                onChange={(e) => setSelectedName(e.target.value)}
                className="w-full appearance-none px-3 py-2.5 rounded-xl bg-black border border-amber-500/40 text-amber-100 text-xs font-medium focus:outline-none focus:border-amber-400 cursor-pointer"
              >
                {memberNames.map((name) => {
                  const col = getPartyColorForName(name);
                  return (
                    <option key={name} value={name} className="bg-neutral-900 text-white">
                      {name} {name === activeAccount?.alias ? "(Active)" : ""} • {col.name}
                    </option>
                  );
                })}
                <option value="__custom__" className="bg-neutral-900 text-amber-300 font-bold">
                  + Enter Custom Name...
                </option>
              </select>
              <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-400 pointer-events-none"></i>
            </div>

            {selectedName === "__custom__" && (
              <input
                type="text"
                placeholder="Type VIP Name (Live Color Generates)"
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
      <div className="max-w-4xl mx-auto mb-8 relative z-10">
        {/* Action Bar Above Ticket */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: currentPartyColor.hex,
                boxShadow: `0 0 10px ${currentPartyColor.hex}`,
              }}
            ></span>
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
              {/* Top Row: Factory Stamp + "Lontha" Script Logo + QR Badge */}
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

                {/* Center "Lontha" script (Replaced Wonka with Lontha) */}
                <h1
                  className="font-wonka-script text-[#150D06] tracking-wide select-none leading-none"
                  style={{ fontSize: "6.8cqw" }}
                >
                  Lontha
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

              {/* Guest Inscription Row + Right-Side Party Color Badge */}
              <div
                className="border-t border-[#150D06]/35 relative flex items-center justify-between w-full"
                style={{
                  paddingTop: "0.4cqw",
                  marginTop: "0.4cqw",
                }}
              >
                {/* Guest Inscription */}
                <div className="text-left" style={{ maxWidth: "70%" }}>
                  <p
                    className="font-wonka-title font-bold tracking-wider text-[#1A1008] leading-tight"
                    style={{ fontSize: "1.4cqw" }}
                  >
                    PRESENTED TO:{" "}
                    <span
                      className="font-black px-1.5 py-0.5 rounded"
                      style={{
                        backgroundColor: currentPartyColor.bgLight,
                        color: currentPartyColor.text,
                        borderBottom: `2px solid ${currentPartyColor.hex}`,
                      }}
                    >
                      {effectiveGuestName.toUpperCase()}
                    </span>
                  </p>
                  <p
                    className="font-mono text-[#3D2714] tracking-wider leading-tight"
                    style={{ fontSize: "1.0cqw", marginTop: "0.2cqw" }}
                  >
                    NO. {ticketSerial} • CODE: LBO26 • {accessTier}
                  </p>
                </div>

                {/* Right Side Bottom: YOUR PARTY COLOR BADGE (Exact requirement) */}
                <div
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md border shadow-sm shrink-0"
                  style={{
                    backgroundColor: "rgba(253, 247, 200, 0.95)",
                    borderColor: currentPartyColor.hex,
                  }}
                >
                  <span
                    className="rounded-full shrink-0 shadow-sm"
                    style={{
                      width: "1.6cqw",
                      height: "1.6cqw",
                      backgroundColor: currentPartyColor.hex,
                      boxShadow: `0 0 6px ${currentPartyColor.hex}`,
                    }}
                  ></span>
                  <div className="text-left leading-tight">
                    <span
                      className="block font-mono font-bold tracking-wider uppercase text-gray-700"
                      style={{ fontSize: "0.8cqw" }}
                    >
                      YOUR PARTY COLOR
                    </span>
                    <span
                      className="block font-wonka-title font-bold tracking-wide"
                      style={{
                        fontSize: "1.1cqw",
                        color: currentPartyColor.text,
                      }}
                    >
                      {currentPartyColor.name}
                    </span>
                  </div>
                </div>
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

      {/* VIP GUEST & PARTY COLOR DATABASE TABLE (User requirement) */}
      <div className="max-w-4xl mx-auto bg-black/85 rounded-2xl border border-amber-500/35 p-4 sm:p-6 relative z-10 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-white/10 pb-4">
          <div>
            <h3 className="text-sm sm:text-base font-serif-title font-bold text-white flex items-center gap-2">
              <i className="fa-solid fa-table-list text-amber-400"></i>
              <span>VIP GUEST &amp; COLOR REGISTRY DATABASE</span>
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Live MongoDB Atlas collection with permanent signature colors. Select any guest to load their personalized pass.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search member..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="px-3 py-1.5 pl-8 rounded-xl bg-black border border-white/20 text-white text-xs placeholder:text-gray-500 focus:outline-none focus:border-amber-400 w-40 sm:w-48"
              />
              <i className="fa-solid fa-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 pointer-events-none"></i>
            </div>

            <button
              type="button"
              onClick={() => setIsRegisterOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/50 text-emerald-200 text-xs font-serif-title font-bold uppercase transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <i className="fa-solid fa-plus text-xs"></i>
              <span>New Guest</span>
            </button>
          </div>
        </div>

        {/* Database Table */}
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/60">
          <table className="w-full text-left text-xs min-w-[550px]">
            <thead className="bg-white/5 border-b border-white/10 uppercase tracking-wider text-[10px] text-gray-400 font-mono">
              <tr>
                <th className="py-3 px-4">VIP Member</th>
                <th className="py-3 px-4">Access Tier</th>
                <th className="py-3 px-4">Signature Party Color</th>
                <th className="py-3 px-4">Database</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {tableMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-gray-500 italic">
                    No matching members found. Click &quot;New Guest&quot; to register someone to Atlas DB.
                  </td>
                </tr>
              ) : (
                tableMembers.map((member) => {
                  const color = member.color;
                  const isSelected = effectiveGuestName.toLowerCase() === member.name.toLowerCase();

                  return (
                    <tr
                      key={member.name}
                      className={`transition-colors hover:bg-white/5 ${
                        isSelected ? "bg-amber-500/10" : ""
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span
                            className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shadow-sm shrink-0"
                            style={{
                              backgroundColor: color.hex,
                              boxShadow: `0 0 10px ${color.glow}`,
                            }}
                          >
                            {member.name.substring(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <p className="font-bold text-white font-serif-title text-sm leading-tight">
                              {member.name}
                            </p>
                            <p className="text-[10px] text-gray-400 font-mono leading-none mt-0.5">
                              {member.name.toLowerCase()}@vip
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-mono">
                          {member.role || "VIP Member"}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm shrink-0"
                            style={{
                              backgroundColor: color.hex,
                              boxShadow: `0 0 6px ${color.glow}`,
                            }}
                          ></span>
                          <div>
                            <span
                              className="font-bold text-xs block leading-tight"
                              style={{ color: color.hex }}
                            >
                              {color.name}
                            </span>
                            <span className="font-mono text-[9px] text-gray-400">
                              {color.hex}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                          <span>Atlas Synced</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedName(member.name);
                            setCustomName("");
                            if (member.role) setAccessTier(member.role);
                            ticketCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-serif-title font-bold uppercase tracking-wider transition-all cursor-pointer ${
                            isSelected
                              ? "bg-amber-400 text-black shadow-md scale-105"
                              : "bg-white/10 hover:bg-white/20 text-amber-200 border border-amber-500/30"
                          }`}
                        >
                          {isSelected ? "Active Pass" : "View Pass"}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
