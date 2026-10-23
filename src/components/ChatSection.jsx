"use client";

import { useState, useEffect, useRef } from "react";

export default function ChatSection({ activeAccount, onSelectAccount }) {
  const [messages, setMessages] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [senderAlias, setSenderAlias] = useState(activeAccount?.alias || "");
  const [text, setText] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [newAlias, setNewAlias] = useState("");
  const [newRole, setNewRole] = useState("VIP Member");

  const chatContainerRef = useRef(null);

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/accounts");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setAccounts(json.data);
      }
    } catch (err) {
      console.warn("Failed to fetch accounts:", err);
    }
  };

  const fetchMessages = async () => {
    try {
      const res = await fetch("/api/chat");
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setMessages(json.data);
      }
    } catch (err) {
      console.warn("Failed to fetch chat:", err);
    }
  };

  useEffect(() => {
    fetchAccounts();
    fetchMessages();

    // Polling interval for live chat
    const interval = setInterval(() => {
      fetchMessages();
    }, 3500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeAccount?.alias) {
      setSenderAlias(activeAccount.alias);
    }
  }, [activeAccount]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!text.trim() || !senderAlias.trim()) return;

    setIsSending(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: senderAlias.trim(),
          text: text.trim(),
          accountId: activeAccount?.id,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMessages((prev) => [...prev, json.data]);
        setText("");
        // Also refresh accounts list in case a new alias was registered
        fetchAccounts();
      }
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!newAlias.trim()) return;

    try {
      const res = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          alias: newAlias.trim(),
          name: newAlias.trim(),
          role: newRole,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setAccounts((prev) => [...prev, json.data]);
        onSelectAccount(json.data);
        setSenderAlias(json.data.alias);
        setShowAccountModal(false);
        setNewAlias("");
      }
    } catch (err) {
      console.error("Create account error:", err);
    }
  };

  return (
    <section
      id="chat"
      className="glass-panel-crimson rounded-2xl sm:rounded-3xl p-4 sm:p-8 border border-[#DC2626]/40"
    >
      {/* Chat Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 sm:mb-5">
        <div>
          <span className="text-[9px] sm:text-[10px] font-semibold text-[#EF4444] tracking-[0.25em] uppercase">
            Private Communication
          </span>
          <h2 className="text-xl sm:text-3xl font-serif-title font-bold text-white mt-0.5 sm:mt-1">
            VIP PARTY CHATROOM
          </h2>
          <p className="text-[11px] sm:text-xs text-gray-400 mt-0.5">
            Synced with <span className="text-rose-300 font-mono">accounts.json</span> &amp;{" "}
            <span className="text-rose-300 font-mono">chat.json</span>.
          </p>
        </div>

        {/* Live Status and Account Selector */}
        <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => setShowAccountModal(true)}
            className="flex items-center gap-1.5 sm:gap-2 bg-black/80 px-2.5 sm:px-3 py-1.5 rounded-xl border border-[#DC2626]/40 text-xs text-rose-200 hover:border-[#EF4444] transition-all cursor-pointer"
          >
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
              style={{ backgroundColor: activeAccount?.color || "#DC2626" }}
            >
              {activeAccount?.avatar || "LB"}
            </div>
            <span className="max-w-[100px] sm:max-w-[140px] truncate text-[11px] sm:text-xs">
              {activeAccount?.alias || "Select Account"}
            </span>
            <i className="fa-solid fa-chevron-down text-[8px] sm:text-[9px] text-gray-400"></i>
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 bg-black/80 px-2.5 sm:px-3.5 py-1.5 rounded-xl border border-[#DC2626]/30 text-rose-300 shrink-0">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span className="text-[11px] sm:text-xs">{messages.length} msgs</span>
          </div>
        </div>
      </div>

      {/* Account Switcher Modal (Fully Mobile Responsive) */}
      {showAccountModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4">
          <div className="max-w-md w-full glass-panel-glow p-5 sm:p-6 rounded-2xl border border-[#DC2626]/50 max-h-[90vh] flex flex-col shadow-ruby-glow">
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h3 className="font-serif-title font-bold text-base sm:text-lg text-white flex items-center gap-2">
                <i className="fa-solid fa-id-card text-[#EF4444]"></i> Select VIP Account
              </h3>
              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                className="text-gray-400 hover:text-white p-1 text-sm"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            <p className="text-[11px] sm:text-xs text-gray-400 mb-3 shrink-0">
              Chat messages are linked to accounts stored in{" "}
              <code className="text-rose-300">data/accounts.json</code>.
            </p>

            {/* List of accounts */}
            <div className="space-y-2 mb-4 overflow-y-auto pr-1 flex-1 min-h-0">
              {accounts.map((acc) => (
                <div
                  key={acc.id}
                  onClick={() => {
                    onSelectAccount(acc);
                    setSenderAlias(acc.alias);
                    setShowAccountModal(false);
                  }}
                  className={`p-2.5 sm:p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    activeAccount?.id === acc.id
                      ? "bg-[#DC2626]/30 border-[#EF4444]"
                      : "bg-black/60 border-[#DC2626]/20 hover:border-[#EF4444]/50"
                  }`}
                >
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs text-white shrink-0"
                      style={{ backgroundColor: acc.color || "#DC2626" }}
                    >
                      {acc.avatar || acc.alias.substring(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white truncate">
                        {acc.name || acc.alias}
                      </h4>
                      <p className="text-[10px] text-gray-400">{acc.role || "VIP Member"}</p>
                    </div>
                  </div>
                  {activeAccount?.id === acc.id && (
                    <i className="fa-solid fa-check text-[#EF4444] text-xs shrink-0 ml-2"></i>
                  )}
                </div>
              ))}
            </div>

            {/* Create new account form */}
            <form
              onSubmit={handleCreateAccount}
              className="pt-3 border-t border-white/10 space-y-2.5 shrink-0"
            >
              <h4 className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-rose-300">
                + Create New VIP Profile
              </h4>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  placeholder="Your Alias / Name"
                  value={newAlias}
                  onChange={(e) => setNewAlias(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-black border border-[#DC2626]/30 text-white text-xs focus:outline-none focus:border-[#EF4444]"
                />
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-black border border-[#DC2626]/30 text-gray-300 text-xs focus:outline-none focus:border-[#EF4444]"
                >
                  <option value="VIP Member">VIP Member</option>
                  <option value="VIP Host">VIP Host</option>
                  <option value="DJ & Sound">DJ & Sound</option>
                  <option value="Party Crew">Party Crew</option>
                </select>
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-gradient-to-r from-[#7F1D1D] to-[#DC2626] text-white text-xs font-bold rounded-xl uppercase tracking-wider shadow-neon-crimson"
              >
                Save Account &amp; Use
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Chat Room Feed & Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-12 bg-black/90 rounded-2xl border border-[#DC2626]/30 overflow-hidden flex flex-col h-[420px] sm:h-[460px]">
          {/* Feed Header */}
          <div className="bg-gradient-to-r from-[#7F1D1D]/60 to-black p-3 sm:p-3.5 border-b border-[#DC2626]/30 flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#DC2626]/30 border border-[#EF4444] flex items-center justify-center text-rose-300 text-xs shrink-0">
                <i className="fa-solid fa-comments"></i>
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-bold text-white font-serif-title uppercase tracking-wider truncate">
                  Lontha Boys Live Feed
                </h4>
                <p className="text-[9px] text-gray-400 truncate">
                  Account JSON Linked • Encrypted Channel
                </p>
              </div>
            </div>
            <span className="text-[8px] sm:text-[9px] text-[#EF4444] font-mono uppercase bg-[#DC2626]/10 px-2 py-0.5 rounded border border-[#DC2626]/30 shrink-0 ml-2">
              Live
            </span>
          </div>

          {/* Messages list (Mobile-optimized scroll & wrapping) */}
          <div
            ref={chatContainerRef}
            className="flex-1 p-2.5 sm:p-3.5 space-y-2 sm:space-y-2.5 overflow-y-auto bg-[#040205]"
          >
            {messages.length === 0 ? (
              <p className="text-xs text-gray-500 italic text-center py-12">
                No messages yet. Start the conversation below!
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-black/60 p-2.5 sm:p-3 rounded-xl border border-[#DC2626]/20 flex flex-col gap-1 sm:gap-1.5 hover:border-[#EF4444]/40 transition-all"
                >
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                      <div
                        className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-bold text-white shadow-neon-crimson shrink-0"
                        style={{
                          backgroundColor: msg.account?.color || "#DC2626",
                        }}
                      >
                        {msg.account?.avatar ||
                          (msg.sender || "LB").substring(0, 2).toUpperCase()}
                      </div>
                      <span className="text-xs font-bold font-serif-title text-rose-300 truncate max-w-[110px] sm:max-w-none">
                        {msg.sender}
                      </span>
                      {msg.account?.role && (
                        <span className="text-[7px] sm:text-[8px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10 shrink-0">
                          {msg.account.role}
                        </span>
                      )}
                    </div>
                    <span className="text-[8px] sm:text-[9px] text-gray-500 shrink-0">
                      {msg.time}
                    </span>
                  </div>
                  <p className="text-xs text-gray-200 pl-6 sm:pl-8 leading-relaxed break-words">
                    {msg.text}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Chat Input Form (Optimized for Mobile Keyboards and Widths) */}
          <form
            onSubmit={handleSendMessage}
            className="p-2 sm:p-2.5 bg-black border-t border-[#DC2626]/30 flex items-center gap-1.5 sm:gap-2"
          >
            <input
              type="text"
              placeholder="Alias"
              value={senderAlias}
              onChange={(e) => setSenderAlias(e.target.value)}
              required
              title="Your Alias"
              className="w-20 sm:w-32 px-2.5 py-2 rounded-xl bg-black/90 border border-[#DC2626]/30 text-white text-xs focus:outline-none focus:border-[#EF4444] font-medium text-center sm:text-left shrink-0"
            />
            <input
              type="text"
              placeholder="Type message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              className="flex-1 min-w-0 px-3 py-2 rounded-xl bg-black/90 border border-[#DC2626]/30 text-white text-xs focus:outline-none focus:border-[#EF4444]"
            />
            <button
              type="submit"
              disabled={isSending}
              className="px-3 sm:px-4 py-2 rounded-xl font-serif-title font-bold text-xs uppercase bg-gradient-to-r from-[#7F1D1D] via-[#DC2626] to-red-500 text-white shadow-neon-crimson hover:opacity-90 active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <span className="hidden sm:inline">Send</span>
              <i className="fa-solid fa-paper-plane text-xs"></i>
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
