"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { FeatureRow, TicketRow, isMissingTable, recordHistory, formatTime } from "@/utils/appData";
import { SetupNotice } from "@/components/FeaturesBoard";

type PanelState = "loading" | "ready" | "no-tables" | "error";

export default function TicketsPanel() {
  const [state, setState] = useState<PanelState>("loading");
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    const [f, t] = await Promise.all([
      supabase.from("features").select("*").order("created_at", { ascending: false }),
      supabase.from("tickets").select("*").order("created_at", { ascending: true }),
    ]);
    const err = f.error ?? t.error;
    if (err) {
      setState(isMissingTable(err) ? "no-tables" : "error");
      return;
    }
    setFeatures((f.data as FeatureRow[]) ?? []);
    setTickets((t.data as TicketRow[]) ?? []);
    setState("ready");
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    load();
  }, [supabase, load]);

  async function toggleTicket(ticket: TicketRow, featureName: string) {
    const { error } = await supabase
      .from("tickets")
      .update({ done: !ticket.done })
      .eq("id", ticket.id);
    if (!error) {
      await recordHistory(
        supabase,
        user,
        ticket.done ? "reopened_ticket" : "completed_ticket",
        "ticket",
        ticket.title,
        { feature: featureName }
      );
      await load();
    }
  }

  if (state === "loading") return <p className="card-desc">Loading tickets...</p>;
  if (state === "no-tables") return <SetupNotice />;
  if (state === "error") {
    return <p className="card-desc" style={{ color: "#d32f2f" }}>Could not load tickets.</p>;
  }

  if (tickets.length === 0) {
    return <p className="card-desc" data-testid="tickets-empty">No tickets yet. Add them from the Features tab — each feature has its own task list.</p>;
  }

  return (
    <div data-testid="tickets-panel" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {features
        .filter((f) => tickets.some((t) => t.feature_id === f.id))
        .map((feature) => (
          <div className="card" key={feature.id}>
            <h3 className="card-title" style={{ overflowWrap: "anywhere" }}>{feature.name}</h3>
            {tickets
              .filter((t) => t.feature_id === feature.id)
              .map((ticket) => (
                <div key={ticket.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 0" }}>
                  <input
                    type="checkbox"
                    checked={ticket.done}
                    onChange={() => toggleTicket(ticket, feature.name)}
                    aria-label={`Mark "${ticket.title}" ${ticket.done ? "open" : "done"}`}
                    style={{ width: "16px", height: "16px", cursor: "pointer", flexShrink: 0 }}
                  />
                  <span style={{
                    fontSize: "0.9rem",
                    flexGrow: 1,
                    overflowWrap: "anywhere",
                    textDecoration: ticket.done ? "line-through" : "none",
                    color: ticket.done ? "var(--text-secondary)" : "var(--text-primary)",
                  }}>
                    {ticket.title}
                  </span>
                  <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", flexShrink: 0 }}>
                    {ticket.author_name} · {formatTime(ticket.created_at)}
                  </span>
                </div>
              ))}
          </div>
        ))}
    </div>
  );
}
