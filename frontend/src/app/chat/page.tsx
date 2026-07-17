"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { MessageRow, displayName, isMissingTable, formatTime } from "@/utils/appData";
import { SetupNotice } from "@/components/FeaturesBoard";

type PanelState = "loading" | "ready" | "no-tables" | "error";

const POLL_INTERVAL_MS = 5000;

function ChatRoom() {
  const [state, setState] = useState<PanelState>("loading");
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) {
      setState((prev) => (prev === "ready" ? prev : isMissingTable(error) ? "no-tables" : "error"));
      return;
    }
    setMessages(((data as MessageRow[]) ?? []).slice().reverse());
    setState("ready");
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [supabase, load]);

  // Keep the newest message in view
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || sending) return;
    setSending(true);
    try {
      const { error } = await supabase.from("messages").insert({
        content,
        author_id: user?.id,
        author_name: displayName(user),
      });
      if (!error) {
        setDraft("");
        await load();
      }
    } finally {
      setSending(false);
    }
  }

  if (state === "loading") return <p className="card-desc">Loading chat...</p>;
  if (state === "no-tables") return <SetupNotice />;
  if (state === "error") {
    return <p className="card-desc" style={{ color: "#d32f2f" }}>Could not load the chat.</p>;
  }

  return (
    <div className="card" style={{ display: "flex", flexDirection: "column", height: "min(65vh, 640px)", padding: "16px" }} data-testid="chat-room">
      <div ref={scrollRef} style={{ flexGrow: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "10px", paddingRight: "4px" }}>
        {messages.length === 0 && (
          <p className="card-desc" data-testid="chat-empty">No messages yet. Say hello!</p>
        )}
        {messages.map((msg) => {
          const mine = msg.author_id === user?.id;
          return (
            <div
              key={msg.id}
              style={{
                alignSelf: mine ? "flex-end" : "flex-start",
                maxWidth: "85%",
                background: mine ? "var(--text-primary)" : "var(--bg-primary)",
                color: mine ? "var(--bg-secondary)" : "var(--text-primary)",
                border: "1px solid var(--border-color)",
                borderRadius: mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                padding: "8px 12px",
              }}
            >
              {!mine && (
                <p style={{ fontSize: "0.7rem", fontWeight: 700, marginBottom: "2px", color: "var(--text-secondary)" }}>
                  {msg.author_name}
                </p>
              )}
              <p style={{ fontSize: "0.9rem", overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>{msg.content}</p>
              <p style={{ fontSize: "0.65rem", opacity: 0.7, marginTop: "3px", textAlign: "right" }}>
                {formatTime(msg.created_at)}
              </p>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} style={{ display: "flex", gap: "8px", marginTop: "12px", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
        <input
          className="input-field"
          placeholder="Type a message..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          data-testid="chat-input"
        />
        <button type="submit" className="btn-primary" disabled={!draft.trim() || sending} data-testid="chat-send-btn">
          Send
        </button>
      </form>
    </div>
  );
}

export default function ChatPage() {
  return (
    <AuthGuard>
      <div style={{ animation: "fadeIn 0.5s ease-out" }}>
        <header style={{ marginBottom: "24px" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "8px", letterSpacing: "-0.02em" }}>
            Local Chat
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Team chat for signed-in members (refreshes every few seconds)
          </p>
        </header>

        <ChatRoom />

        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `
        }} />
      </div>
    </AuthGuard>
  );
}
