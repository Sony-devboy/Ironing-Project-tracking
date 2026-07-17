"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { HistoryRow, actionLabel, formatTime, isMissingTable } from "@/utils/appData";
import { SetupNotice } from "@/components/FeaturesBoard";

type PanelState = "loading" | "ready" | "no-tables" | "error";

export default function OverviewPanel() {
  const [state, setState] = useState<PanelState>("loading");
  const [featureCount, setFeatureCount] = useState(0);
  const [openTickets, setOpenTickets] = useState(0);
  const [doneTickets, setDoneTickets] = useState(0);
  const [recent, setRecent] = useState<HistoryRow[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [f, t, h] = await Promise.all([
        supabase.from("features").select("id"),
        supabase.from("tickets").select("id, done"),
        supabase.from("history").select("*").order("created_at", { ascending: false }).limit(5),
      ]);
      const err = f.error ?? t.error ?? h.error;
      if (err) {
        setState(isMissingTable(err) ? "no-tables" : "error");
        return;
      }
      const ticketRows = (t.data as { id: string; done: boolean }[]) ?? [];
      setFeatureCount((f.data ?? []).length);
      setOpenTickets(ticketRows.filter((row) => !row.done).length);
      setDoneTickets(ticketRows.filter((row) => row.done).length);
      setRecent((h.data as HistoryRow[]) ?? []);
      setState("ready");
    }
    load();
  }, [supabase]);

  if (state === "loading") return <p className="card-desc">Loading overview...</p>;
  if (state === "no-tables") return <SetupNotice />;
  if (state === "error") {
    return <p className="card-desc" style={{ color: "#d32f2f" }}>Could not load overview data.</p>;
  }

  const stats = [
    { label: "Features", value: featureCount, icon: "🧩" },
    { label: "Open Tickets", value: openTickets, icon: "🎟" },
    { label: "Done Tickets", value: doneTickets, icon: "✅" },
  ];

  return (
    <div data-testid="overview-panel">
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        {stats.map((s) => (
          <div className="card" key={s.label} style={{ padding: "16px", textAlign: "center" }}>
            <span aria-hidden="true" style={{ fontSize: "1.4rem" }}>{s.icon}</span>
            <p style={{ fontSize: "1.6rem", fontWeight: 800, margin: "4px 0" }}>{s.value}</p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "10px" }}>Recent Activity</h3>
      {recent.length === 0 ? (
        <p className="card-desc">Nothing has happened yet. Add a feature to get started.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {recent.map((entry) => (
            <p key={entry.id} style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              <strong style={{ color: "var(--text-primary)" }}>{entry.actor_name}</strong>{" "}
              {actionLabel(entry.action)}{" "}
              <strong style={{ color: "var(--text-primary)", overflowWrap: "anywhere" }}>{entry.entity_name}</strong>
              <span style={{ fontSize: "0.75rem" }}> · {formatTime(entry.created_at)}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
