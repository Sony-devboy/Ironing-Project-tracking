"use client";

import React, { useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { createClient } from "@/utils/supabase/client";
import { HistoryRow, actionLabel, formatTime, isMissingTable } from "@/utils/appData";
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
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from("history")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) {
        setState(isMissingTable(error) ? "no-tables" : "error");
        return;
      }
      setEntries((data as HistoryRow[]) ?? []);
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }} data-testid="history-list">
      {entries.map((entry) => {
        const archivedTickets = (entry.details?.tickets as ArchivedTicket[] | undefined) ?? [];
        const archivedDescription = entry.details?.description as string | undefined;

        return (
          <div className="card" key={entry.id} style={{ padding: "16px 20px" }}>
            <p style={{ fontSize: "0.9rem" }}>
              <strong>{entry.actor_name}</strong>{" "}
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
