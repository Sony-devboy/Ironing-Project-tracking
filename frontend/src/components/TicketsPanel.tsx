"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { FeatureRow, TicketRow, ProfileMap, addNote, displayName, isMissingTable, loadProfiles, nameFor, recordHistory } from "@/utils/appData";
import { SetupNotice } from "@/components/FeaturesBoard";
import TicketNoteModal from "@/components/TicketNoteModal";

type PanelState = "loading" | "ready" | "no-tables" | "error";

export default function TicketsPanel() {
  const [state, setState] = useState<PanelState>("loading");
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [completing, setCompleting] = useState<{ ticket: TicketRow; featureName: string } | null>(null);
  const supabase = createClient();

  const load = useCallback(async () => {
    const [f, t, p] = await Promise.all([
      supabase.from("features").select("*").order("created_at", { ascending: false }),
      supabase.from("tickets").select("*").order("created_at", { ascending: true }),
      loadProfiles(supabase),
    ]);
    const err = f.error ?? t.error;
    if (err) {
      setState(isMissingTable(err) ? "no-tables" : "error");
      return;
    }
    setFeatures((f.data as FeatureRow[]) ?? []);
    setTickets((t.data as TicketRow[]) ?? []);
    setProfiles(p);
    setState("ready");
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    load();
  }, [supabase, load]);

  async function takeTicket(ticket: TicketRow, featureName: string) {
    if (!user) return;
    const { error } = await supabase
      .from("tickets")
      .update({ owner_id: user.id, owner_name: displayName(user) })
      .eq("id", ticket.id)
      .is("owner_id", null);
    if (!error) {
      await recordHistory(supabase, user, "took_ticket", "ticket", ticket.title, { feature: featureName });
      await load();
    }
  }

  async function dropTicket(ticket: TicketRow, featureName: string) {
    if (!user) return;
    const { error } = await supabase
      .from("tickets")
      .update({ owner_id: null, owner_name: null })
      .eq("id", ticket.id)
      .eq("owner_id", user.id);
    if (!error) {
      await recordHistory(supabase, user, "dropped_ticket", "ticket", ticket.title, { feature: featureName });
      await load();
    }
  }

  function toggleTicket(ticket: TicketRow, featureName: string) {
    if (!ticket.done) {
      setCompleting({ ticket, featureName });
      return;
    }
    reopenTicket(ticket, featureName);
  }

  async function reopenTicket(ticket: TicketRow, featureName: string) {
    const { error } = await supabase
      .from("tickets")
      .update({ done: false })
      .eq("id", ticket.id);
    if (!error) {
      await recordHistory(supabase, user, "reopened_ticket", "ticket", ticket.title, { feature: featureName });
      await load();
    }
  }

  async function completeTicket(note: string) {
    if (!completing) return;
    const { ticket, featureName } = completing;
    setCompleting(null);
    const { error } = await supabase
      .from("tickets")
      .update({ done: true })
      .eq("id", ticket.id);
    if (!error) {
      await recordHistory(supabase, user, "completed_ticket", "ticket", ticket.title, { feature: featureName });
      if (note) {
        await addNote(supabase, user, ticket.title, note, "ticket");
      }
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
      {completing && (
        <TicketNoteModal
          ticketTitle={completing.ticket.title}
          onComplete={completeTicket}
          onCancel={() => setCompleting(null)}
        />
      )}
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
                  {ticket.owner_id ? (
                    <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)", flexShrink: 0, whiteSpace: "nowrap" }}>
                      👤 {nameFor(profiles, ticket.owner_id, ticket.owner_name)}
                    </span>
                  ) : null}
                  {!ticket.owner_id && user && (
                    <button
                      className="btn-ghost"
                      onClick={() => takeTicket(ticket, feature.name)}
                      style={{ padding: "2px 8px", flexShrink: 0 }}
                    >
                      Take
                    </button>
                  )}
                  {ticket.owner_id === user?.id && (
                    <button
                      className="btn-ghost"
                      onClick={() => dropTicket(ticket, feature.name)}
                      style={{ padding: "2px 8px", flexShrink: 0 }}
                    >
                      Drop
                    </button>
                  )}
                </div>
              ))}
          </div>
        ))}
    </div>
  );
}
