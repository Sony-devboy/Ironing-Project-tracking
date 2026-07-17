"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { FeatureRow, TicketRow, isMissingTable, recordHistory } from "@/utils/appData";

type CardState = "checking" | "anon" | "loading" | "ready" | "no-tables" | "error";

export default function MyTicketsCard() {
  const [state, setState] = useState<CardState>("checking");
  const [user, setUser] = useState<User | null>(null);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const supabase = createClient();

  const load = useCallback(async (currentUser: User) => {
    const [t, f] = await Promise.all([
      supabase
        .from("tickets")
        .select("*")
        .eq("owner_id", currentUser.id)
        .order("created_at", { ascending: true }),
      supabase.from("features").select("*"),
    ]);
    const err = t.error ?? f.error;
    if (err) {
      setState(isMissingTable(err) ? "no-tables" : "error");
      return;
    }
    setTickets((t.data as TicketRow[]) ?? []);
    setFeatures((f.data as FeatureRow[]) ?? []);
    setState("ready");
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const sessionUser = data.session?.user ?? null;
      setUser(sessionUser);
      if (!sessionUser) {
        setState("anon");
        return;
      }
      setState("loading");
      load(sessionUser);
    });
    return () => {
      cancelled = true;
    };
  }, [supabase, load]);

  async function toggleTicket(ticket: TicketRow) {
    if (!user) return;
    const featureName = features.find((f) => f.id === ticket.feature_id)?.name ?? "";
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
      await load(user);
    }
  }

  const openTickets = tickets.filter((t) => !t.done);
  const doneTickets = tickets.filter((t) => t.done);

  return (
    <div className="card" data-testid="my-tickets-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
        <span aria-hidden="true" style={{ fontSize: "1.5rem" }}>🎯</span>
        {state === "ready" && (
          <span style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-secondary)" }}>
            {openTickets.length} open
          </span>
        )}
      </div>
      <h2 className="card-title">My Tickets</h2>

      {state === "checking" || state === "loading" ? (
        <p className="card-desc">Loading your tickets...</p>
      ) : state === "anon" ? (
        <p className="card-desc">Log in to see the tickets you have taken.</p>
      ) : state === "no-tables" ? (
        <p className="card-desc">Database setup pending — run <code>supabase/setup.sql</code> first.</p>
      ) : state === "error" ? (
        <p className="card-desc" style={{ color: "#d32f2f" }}>Could not load your tickets.</p>
      ) : tickets.length === 0 ? (
        <p className="card-desc" data-testid="my-tickets-empty">
          You have not taken any tickets yet. Use the <strong>Take</strong> button on tickets in Main App.
        </p>
      ) : (
        <div style={{ marginTop: "4px" }}>
          {[...openTickets, ...doneTickets].map((ticket) => {
            const featureName = features.find((f) => f.id === ticket.feature_id)?.name;
            return (
              <div key={ticket.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "5px 0" }}>
                <input
                  type="checkbox"
                  checked={ticket.done}
                  onChange={() => toggleTicket(ticket)}
                  aria-label={`Mark "${ticket.title}" ${ticket.done ? "open" : "done"}`}
                  style={{ width: "15px", height: "15px", cursor: "pointer", flexShrink: 0 }}
                />
                <span style={{
                  fontSize: "0.85rem",
                  flexGrow: 1,
                  overflowWrap: "anywhere",
                  textDecoration: ticket.done ? "line-through" : "none",
                  color: ticket.done ? "var(--text-secondary)" : "var(--text-primary)",
                }}>
                  {ticket.title}
                </span>
                {featureName && (
                  <span style={{
                    fontSize: "0.65rem",
                    color: "var(--text-secondary)",
                    background: "var(--bg-primary)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "2px 8px",
                    flexShrink: 0,
                    maxWidth: "40%",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}>
                    {featureName}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
