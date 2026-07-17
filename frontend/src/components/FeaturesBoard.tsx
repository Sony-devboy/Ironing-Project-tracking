"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import {
  FeatureRow,
  TicketRow,
  displayName,
  isMissingTable,
  recordHistory,
  formatTime,
} from "@/utils/appData";

type BoardState = "loading" | "ready" | "no-tables" | "error";

export function SetupNotice() {
  return (
    <div className="card" data-testid="setup-notice">
      <h2 className="card-title">Database setup required</h2>
      <p className="card-desc">
        The data tables have not been created yet. Run <code>supabase/setup.sql</code> in
        your Supabase dashboard (SQL Editor) once, then reload this page.
      </p>
    </div>
  );
}

export default function FeaturesBoard() {
  const [state, setState] = useState<BoardState>("loading");
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [ticketDrafts, setTicketDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
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

  async function addFeature(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("features").insert({
        name: name.trim(),
        description: description.trim(),
        author_name: displayName(user),
      });
      if (!error) {
        await recordHistory(supabase, user, "added_feature", "feature", name.trim(), {
          description: description.trim(),
        });
        setName("");
        setDescription("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function addTicket(feature: FeatureRow) {
    const title = (ticketDrafts[feature.id] ?? "").trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("tickets").insert({
        feature_id: feature.id,
        title,
        author_name: displayName(user),
      });
      if (!error) {
        await recordHistory(supabase, user, "added_ticket", "ticket", title, {
          feature: feature.name,
        });
        setTicketDrafts((d) => ({ ...d, [feature.id]: "" }));
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleTicket(ticket: TicketRow, feature: FeatureRow) {
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
        { feature: feature.name }
      );
      await load();
    }
  }

  async function deleteTicket(ticket: TicketRow, feature: FeatureRow) {
    if (!window.confirm(`Delete ticket "${ticket.title}"? It will be recorded in History.`)) return;
    const { error } = await supabase.from("tickets").delete().eq("id", ticket.id);
    if (!error) {
      await recordHistory(supabase, user, "deleted_ticket", "ticket", ticket.title, {
        feature: feature.name,
        done: ticket.done,
      });
      await load();
    }
  }

  async function archiveFeature(feature: FeatureRow) {
    if (!window.confirm(`Archive feature "${feature.name}"? It and its tickets move to History.`)) return;
    const featureTickets = tickets.filter((t) => t.feature_id === feature.id);
    // Snapshot goes into history first so nothing is lost, then delete
    // (tickets cascade-delete with the feature).
    await recordHistory(supabase, user, "archived_feature", "feature", feature.name, {
      description: feature.description,
      author_name: feature.author_name,
      created_at: feature.created_at,
      tickets: featureTickets.map((t) => ({ title: t.title, done: t.done, author_name: t.author_name })),
    });
    const { error } = await supabase.from("features").delete().eq("id", feature.id);
    if (!error) {
      await load();
    }
  }

  if (state === "loading") {
    return <p className="card-desc">Loading features...</p>;
  }
  if (state === "no-tables") {
    return <SetupNotice />;
  }
  if (state === "error") {
    return (
      <p className="card-desc" style={{ color: "#d32f2f" }} data-testid="features-error">
        Could not load features. Check your connection and try again.
      </p>
    );
  }

  return (
    <div data-testid="features-board">
      {/* Add feature form */}
      <form onSubmit={addFeature} style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
        <input
          className="input-field"
          placeholder="Feature name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={120}
          data-testid="feature-name-input"
        />
        <textarea
          className="input-field"
          placeholder="Description — what is this feature?"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          maxLength={1000}
          data-testid="feature-desc-input"
        />
        <button type="submit" className="btn-primary" disabled={!name.trim() || busy} data-testid="add-feature-btn" style={{ alignSelf: "flex-start" }}>
          + Add Feature
        </button>
      </form>

      {features.length === 0 && (
        <p className="card-desc" data-testid="features-empty">No features yet. Add the first one above.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {features.map((feature) => {
          const featureTickets = tickets.filter((t) => t.feature_id === feature.id);
          const doneCount = featureTickets.filter((t) => t.done).length;

          return (
            <div className="card" key={feature.id} data-testid={`feature-${feature.id}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
                <div style={{ minWidth: 0 }}>
                  <h3 className="card-title" style={{ overflowWrap: "anywhere" }}>{feature.name}</h3>
                  {feature.description && (
                    <p className="card-desc" style={{ overflowWrap: "anywhere" }}>{feature.description}</p>
                  )}
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "6px" }}>
                    by <strong>{feature.author_name || "Unknown"}</strong> · {formatTime(feature.created_at)}
                    {featureTickets.length > 0 && <> · {doneCount}/{featureTickets.length} tickets done</>}
                  </p>
                </div>
                <button className="btn-ghost" onClick={() => archiveFeature(feature)} data-testid={`archive-feature-${feature.id}`}>
                  🗃 Archive
                </button>
              </div>

              {/* Tickets for this feature */}
              <div style={{ marginTop: "14px", borderTop: "1px solid var(--border-color)", paddingTop: "12px" }}>
                {featureTickets.length === 0 && (
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>No tickets yet — add the tasks needed to build this.</p>
                )}
                {featureTickets.map((ticket) => (
                  <div key={ticket.id} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "6px 0" }}>
                    <input
                      type="checkbox"
                      checked={ticket.done}
                      onChange={() => toggleTicket(ticket, feature)}
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
                    <button
                      className="btn-ghost"
                      onClick={() => deleteTicket(ticket, feature)}
                      aria-label={`Delete ticket ${ticket.title}`}
                      style={{ padding: "2px 8px" }}
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                  <input
                    className="input-field"
                    placeholder="New ticket (task for this feature)"
                    value={ticketDrafts[feature.id] ?? ""}
                    onChange={(e) => setTicketDrafts((d) => ({ ...d, [feature.id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTicket(feature);
                      }
                    }}
                    maxLength={200}
                  />
                  <button
                    className="btn-primary"
                    onClick={() => addTicket(feature)}
                    disabled={!(ticketDrafts[feature.id] ?? "").trim() || busy}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
