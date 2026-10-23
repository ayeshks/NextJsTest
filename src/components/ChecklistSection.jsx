"use client";

import { useState, useEffect } from "react";

export default function ChecklistSection({ currentAlias, activeAccount }) {
  const [items, setItems] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [customItemName, setCustomItemName] = useState("");
  const [customItemCategory, setCustomItemCategory] = useState("Essentials");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filter, setFilter] = useState("all"); // 'all' | 'unclaimed' | 'claimed'
  const [selectedClaimers, setSelectedClaimers] = useState({});
  const [customNames, setCustomNames] = useState({});
  const [claimErrors, setClaimErrors] = useState({});

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/items");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setItems(json.data);
      }
    } catch (err) {
      console.warn("Failed to fetch items:", err);
    }
  };

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
      console.warn("Failed to fetch members for checklist:", err);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchMembers();
  }, []);

  // Compute combined unique names from accounts + attendees
  const memberOptions = Array.from(
    new Set([
      ...(currentAlias ? [currentAlias] : []),
      ...(activeAccount?.alias ? [activeAccount.alias] : []),
      ...accounts.map((a) => a.alias || a.name),
      ...attendees.map((att) => att.name),
    ].filter(Boolean))
  );

  const claimedCount = items.filter((item) => item.status).length;
  const percentage =
    items.length > 0 ? Math.round((claimedCount / items.length) * 100) : 0;

  const filteredItems = items.filter((item) => {
    if (filter === "claimed") return item.status;
    if (filter === "unclaimed") return !item.status;
    return true;
  });

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!customItemName.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customItemName.trim(),
          category: customItemCategory,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setItems((prev) => [...prev, json.data]);
        setCustomItemName("");
      }
    } catch (err) {
      console.error("Add item error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClaimerChange = (itemId, value) => {
    setSelectedClaimers((prev) => ({
      ...prev,
      [itemId]: value,
    }));
    if (claimErrors[itemId]) {
      setClaimErrors((prev) => ({ ...prev, [itemId]: null }));
    }
  };

  const handleCustomNameChange = (itemId, value) => {
    setCustomNames((prev) => ({
      ...prev,
      [itemId]: value,
    }));
    if (claimErrors[itemId]) {
      setClaimErrors((prev) => ({ ...prev, [itemId]: null }));
    }
  };

  const handleClaim = async (item) => {
    const selected = selectedClaimers[item.id] || currentAlias || memberOptions[0];

    let finalName = selected;
    if (selected === "__custom__") {
      finalName = customNames[item.id]?.trim();
    }

    if (!finalName) {
      setClaimErrors((prev) => ({
        ...prev,
        [item.id]: "Please select or type who will bring this item",
      }));
      return;
    }

    try {
      const res = await fetch("/api/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          status: true,
          claimedBy: finalName,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setItems((prev) =>
          prev.map((i) => (String(i.id) === String(item.id) ? json.data : i))
        );
        // Clear errors
        setClaimErrors((prev) => ({ ...prev, [item.id]: null }));
      }
    } catch (err) {
      console.error("Claim item error:", err);
    }
  };

  const handleReleaseClaim = async (item) => {
    try {
      const res = await fetch("/api/items", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          status: false,
          claimedBy: "",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setItems((prev) =>
          prev.map((i) => (String(i.id) === String(item.id) ? json.data : i))
        );
      }
    } catch (err) {
      console.error("Release claim error:", err);
    }
  };

  return (
    <section
      id="checklist"
      className="glass-panel-crimson rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-[#DC2626]/40"
    >
      {/* Header and Progress */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <span className="text-[9px] sm:text-[10px] font-semibold text-[#EF4444] tracking-[0.25em] uppercase">
            Event Preparation
          </span>
          <h2 className="text-xl sm:text-3xl font-serif-title font-bold text-white mt-0.5 sm:mt-1">
            ITEMS TO BRING CHECKLIST
          </h2>
          <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
            Select who will bring each essential item from the dropdown, then click Claim.
          </p>
        </div>

        {/* Progress Bar Widget */}
        <div className="w-full md:w-64 bg-black/80 p-3.5 rounded-2xl border border-[#DC2626]/30">
          <div className="flex justify-between text-xs font-serif-title font-bold mb-1.5">
            <span className="text-gray-300 uppercase tracking-wider">
              {claimedCount} of {items.length} Claimed
            </span>
            <span className="text-rose-300 font-bold">{percentage}%</span>
          </div>
          <div className="w-full bg-gray-950 rounded-full h-2.5 overflow-hidden p-0.5 border border-white/5">
            <div
              className="bg-gradient-to-r from-[#7F1D1D] via-[#DC2626] to-rose-400 h-full rounded-full transition-all duration-700 shadow-neon-crimson"
              style={{ width: `${percentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Add Custom Item Form */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        {/* Filters */}
        <div className="flex items-center gap-1.5 bg-black/80 p-1 rounded-xl border border-[#DC2626]/30 w-fit">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-serif-title font-bold transition-all ${
              filter === "all"
                ? "bg-[#DC2626] text-white shadow-neon-crimson"
                : "text-gray-400 hover:text-white"
            }`}
          >
            All ({items.length})
          </button>
          <button
            onClick={() => setFilter("unclaimed")}
            className={`px-3 py-1.5 rounded-lg text-xs font-serif-title font-bold transition-all ${
              filter === "unclaimed"
                ? "bg-[#DC2626] text-white shadow-neon-crimson"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Unclaimed ({items.length - claimedCount})
          </button>
          <button
            onClick={() => setFilter("claimed")}
            className={`px-3 py-1.5 rounded-lg text-xs font-serif-title font-bold transition-all ${
              filter === "claimed"
                ? "bg-emerald-600 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Claimed ({claimedCount})
          </button>
        </div>

        {/* Add custom item form */}
        <form
          onSubmit={handleAddItem}
          className="flex flex-wrap sm:flex-nowrap gap-2 max-w-lg w-full"
        >
          <input
            type="text"
            value={customItemName}
            onChange={(e) => setCustomItemName(e.target.value)}
            placeholder="Add new item (e.g. Ice Boxes, Mixers)"
            className="flex-1 min-w-[180px] px-3.5 py-2 rounded-xl bg-black border border-[#DC2626]/30 text-white text-xs focus:outline-none focus:border-[#EF4444]"
          />
          <select
            value={customItemCategory}
            onChange={(e) => setCustomItemCategory(e.target.value)}
            className="px-2.5 py-2 rounded-xl bg-black border border-[#DC2626]/30 text-gray-300 text-xs focus:outline-none focus:border-[#EF4444] shrink-0"
          >
            <option value="Essentials">Essentials</option>
            <option value="Drinks">Drinks</option>
            <option value="Food">Food</option>
            <option value="Audio">Audio</option>
            <option value="Visuals">Visuals</option>
            <option value="Party Favors">Favors</option>
          </select>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-2 bg-[#DC2626]/25 hover:bg-[#DC2626]/40 border border-[#DC2626]/50 text-rose-200 rounded-xl font-serif-title text-xs font-bold transition-all cursor-pointer disabled:opacity-50 shrink-0"
          >
            {isSubmitting ? "Adding..." : "+ Add"}
          </button>
        </form>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const selectedValue =
            selectedClaimers[item.id] ||
            currentAlias ||
            memberOptions[0] ||
            "";
          const isCustom = selectedValue === "__custom__";
          const hasError = Boolean(claimErrors[item.id]);

          return (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                item.status
                  ? "border-emerald-500/40 bg-gradient-to-br from-black/90 via-emerald-950/20 to-black/90 shadow-[0_0_20px_rgba(16,185,129,0.12)]"
                  : "border-[#DC2626]/30 bg-black/80 hover:border-[#EF4444]/60"
              }`}
            >
              {/* Top Row: Icon, Title, Category Badge */}
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs shrink-0 transition-transform ${
                      item.status
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                        : "bg-[#DC2626]/20 text-rose-300 border border-[#DC2626]/30"
                    }`}
                  >
                    <i
                      className={`fa-solid ${
                        item.status ? "fa-check text-sm" : "fa-box-open"
                      }`}
                    ></i>
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs sm:text-sm font-bold text-white font-serif-title tracking-wide truncate">
                      {item.name}
                    </h4>
                    {item.status ? (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <p className="text-[11px] text-emerald-400 font-medium truncate">
                          Claimed by <span className="font-bold underline decoration-emerald-500/50">{item.claimedBy}</span>
                        </p>
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                        Unclaimed • Needs someone to bring
                      </p>
                    )}
                  </div>
                </div>

                {item.category && (
                  <span className="text-[8px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-gray-400 border border-white/10 shrink-0 font-medium">
                    {item.category}
                  </span>
                )}
              </div>

              {/* Error Message if any */}
              {hasError && (
                <div className="text-[10px] text-red-400 flex items-center gap-1 bg-red-950/40 px-2 py-1 rounded-lg border border-red-500/30">
                  <i className="fa-solid fa-circle-exclamation text-[9px]"></i>
                  <span>{claimErrors[item.id]}</span>
                </div>
              )}

              {/* Bottom Action Area: Dropdown & Claim / Release */}
              <div className="pt-3 border-t border-white/5">
                {item.status ? (
                  // Item is ALREADY CLAIMED
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-[10px] font-bold">
                        {(item.claimedBy || "LB").substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-[11px] font-serif-title text-emerald-300 truncate max-w-[120px]">
                        {item.claimedBy}
                      </span>
                    </div>

                    <button
                      onClick={() => handleReleaseClaim(item)}
                      className="text-[11px] font-medium text-gray-400 hover:text-red-400 transition-colors flex items-center gap-1 cursor-pointer py-1 px-2 rounded-lg hover:bg-white/5"
                      title="Release this claim so someone else can bring it"
                    >
                      <i className="fa-solid fa-rotate-left text-[10px]"></i>
                      <span>Release Claim</span>
                    </button>
                  </div>
                ) : (
                  // Item is UNCLAIMED: UX with dropdown selector on right side & claim button
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium hidden sm:block">
                      Who brings:
                    </div>

                    <div className="flex items-center gap-2 flex-1 sm:flex-initial justify-end">
                      {isCustom ? (
                        // Custom text input
                        <div className="flex items-center gap-1 flex-1 sm:w-36">
                          <input
                            type="text"
                            placeholder="Type Name"
                            value={customNames[item.id] || ""}
                            onChange={(e) =>
                              handleCustomNameChange(item.id, e.target.value)
                            }
                            autoFocus
                            className="w-full px-2.5 py-1.5 rounded-lg bg-black border border-[#DC2626]/50 text-white text-xs focus:outline-none focus:border-[#EF4444]"
                          />
                          <button
                            type="button"
                            onClick={() => handleClaimerChange(item.id, memberOptions[0] || "")}
                            className="text-gray-400 hover:text-white p-1 text-xs"
                            title="Back to list"
                          >
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        </div>
                      ) : (
                        // Member Dropdown Select
                        <div className="relative flex-1 sm:flex-initial">
                          <select
                            value={selectedValue}
                            onChange={(e) =>
                              handleClaimerChange(item.id, e.target.value)
                            }
                            className="w-full sm:w-36 appearance-none px-2.5 py-1.5 pr-6 rounded-lg bg-black/90 border border-[#DC2626]/40 text-rose-200 text-xs font-medium focus:outline-none focus:border-[#EF4444] cursor-pointer"
                          >
                            {memberOptions.map((name) => (
                              <option key={name} value={name} className="bg-neutral-900 text-white">
                                {name} {name === currentAlias ? "(You)" : ""}
                              </option>
                            ))}
                            <option value="__custom__" className="bg-neutral-900 text-rose-300 font-bold">
                              + Custom Name...
                            </option>
                          </select>
                          <i className="fa-solid fa-chevron-down absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-rose-300/70 pointer-events-none"></i>
                        </div>
                      )}

                      {/* Claim Button */}
                      <button
                        onClick={() => handleClaim(item)}
                        className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-[#7F1D1D] via-[#DC2626] to-red-500 text-white font-serif-title font-bold text-xs uppercase tracking-wider shadow-neon-crimson hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <span>Claim</span>
                        <i className="fa-solid fa-hand-holding-heart text-[10px]"></i>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
