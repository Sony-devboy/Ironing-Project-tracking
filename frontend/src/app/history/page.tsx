"use client";

import React, { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { createClient } from "@/utils/supabase/client";
import { HistoryRow, ProfileMap, actionLabel, formatTime, isMissingTable, loadProfiles, nameFor } from "@/utils/appData";
import { SetupNotice } from "@/components/FeaturesBoard";

type PanelState = "loading" | "ready" | "no-tables" | "error";

interface ArchivedTicket {
  title: string;
  done: boolean;
  author_name: string;
}

function HistoryList() {
  const [state, setState] = useState<PanelState>("loading");
  const [entries, setEntries] = useState<HistoryRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [view, setView] = useState<"feed" | "table">("feed");
  const [memberFilter, setMemberFilter] = useState<string>("all"); // actor_id or "all"
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [{ data, error }, profileMap] = await Promise.all([
        supabase
          .from("history")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(200),
        loadProfiles(supabase),
      ]);
      if (error) {
        setState(isMissingTable(error) ? "no-tables" : "error");
        return;
      }
      setEntries((data as HistoryRow[]) ?? []);
      setProfiles(profileMap);
      setState("ready");
    }
    load();
  }, [supabase]);

  if (state === "loading") return <p className="card-desc">Loading history...</p>;
  if (state === "no-tables") return <SetupNotice />;
  if (state === "error") {
    return <p className="card-desc" style={{ color: "#d32f2f" }}>Could not load history.</p>;
  }

  if (entries.length === 0) {
    return <p className="card-desc" data-testid="history-empty">No activity recorded yet. Everything members add, complete, delete, or archive will show up here.</p>;
  }

  // Distinct members who appear in the log, for the per-user filter.
  const members = Array.from(
    new Map(entries.map((e) => [e.actor_id, nameFor(profiles, e.actor_id, e.actor_name)])).entries()
  ).map(([id, label]) => ({ id, label }));

  const filtered = memberFilter === "all" ? entries : entries.filter((e) => e.actor_id === memberFilter);

  const controls = (
    <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center", marginBottom: "20px" }}>
      <div className="subtabs-nav" role="tablist" aria-label="History view" style={{ marginBottom: 0 }}>
        <button className={`subtab-btn ${view === "feed" ? "active" : ""}`} onClick={() => setView("feed")} data-testid="history-view-feed">
          Feed
        </button>
        <button className={`subtab-btn ${view === "table" ? "active" : ""}`} onClick={() => setView("table")} data-testid="history-view-table">
          Table
        </button>
      </div>
      <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "8px" }}>
        Member
        <select
          className="input-field"
          value={memberFilter}
          onChange={(e) => setMemberFilter(e.target.value)}
          style={{ width: "auto" }}
          data-testid="history-member-filter"
        >
          <option value="all">Everyone</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
      </label>
    </div>
  );

  if (view === "table") {
    return (
      <div data-testid="history-list">
        {controls}
        <div className="card" style={{ padding: 0, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }} data-testid="history-table">
            <thead>
              <tr style={{ textAlign: "left", color: "var(--text-secondary)" }}>
                <th style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-color)", whiteSpace: "nowrap" }}>Time</th>
                <th style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-color)", whiteSpace: "nowrap" }}>Member</th>
                <th style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-color)" }}>Action</th>
                <th style={{ padding: "10px 16px", borderBottom: "1px solid var(--border-color)" }}>Item</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => (
                <tr key={entry.id}>
                  <td style={{ padding: "8px 16px", borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)", whiteSpace: "nowrap" }}>
                    {formatTime(entry.created_at)}
                  </td>
                  <td style={{ padding: "8px 16px", borderBottom: "1px solid var(--border-color)", fontWeight: 600, whiteSpace: "nowrap" }}>
                    {nameFor(profiles, entry.actor_id, entry.actor_name)}
                  </td>
                  <td style={{ padding: "8px 16px", borderBottom: "1px solid var(--border-color)", color: "var(--text-secondary)" }}>
                    {actionLabel(entry.action)}
                  </td>
                  <td style={{ padding: "8px 16px", borderBottom: "1px solid var(--border-color)", overflowWrap: "anywhere" }}>
                    {entry.entity_name}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="history-list">
      {controls}
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {filtered.map((entry) => {
        const archivedTickets = (entry.details?.tickets as ArchivedTicket[] | undefined) ?? [];
        const archivedDescription = entry.details?.description as string | undefined;

        return (
          <div className="card" key={entry.id} style={{ padding: "16px 20px" }}>
            <p style={{ fontSize: "0.9rem" }}>
              <strong>{nameFor(profiles, entry.actor_id, entry.actor_name)}</strong>{" "}
              <span style={{ color: "var(--text-secondary)" }}>{actionLabel(entry.action)}</span>{" "}
              <strong style={{ overflowWrap: "anywhere" }}>{entry.entity_name}</strong>
            </p>
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "4px" }}>
              {formatTime(entry.created_at)}
            </p>

            {/* Archived feature snapshot: keeps the data readable forever */}
            {entry.action === "archived_feature" && (
              <div style={{ marginTop: "10px", borderTop: "1px solid var(--border-color)", paddingTop: "10px" }}>
                {archivedDescription && (
                  <p className="card-desc" style={{ overflowWrap: "anywhere" }}>{archivedDescription}</p>
                )}
                {archivedTickets.length > 0 && (
                  <ul style={{ listStyle: "none", marginTop: "8px" }}>
                    {archivedTickets.map((t, i) => (
                      <li key={i} style={{ fontSize: "0.85rem", color: "var(--text-secondary)", padding: "2px 0" }}>
                        {t.done ? "✅" : "⬜"} {t.title}
                        {t.author_name && <span style={{ fontSize: "0.7rem" }}> — {t.author_name}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}

export default function HistoryPage() {
  return (
    <AuthGuard>
      <div style={{ animation: "fadeIn 0.5s ease-out" }}>
        <header style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "8px", letterSpacing: "-0.02em" }}>
            History
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Archive and audit log of everything members have done
          </p>
        </header>

        <HistoryList />

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
