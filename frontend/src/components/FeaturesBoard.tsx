"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import {
  FeatureRow,
  TicketRow,
  ProfileMap,
  displayName,
  isMissingTable,
  loadProfiles,
  nameFor,
  recordHistory,
  formatTime,
} from "@/utils/appData";
import TicketItem from "@/components/TicketItem";

type BoardState = "loading" | "ready" | "no-tables" | "error";
type SubTab = "active" | "completed";

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

// Format an ISO date (yyyy-mm-dd) for display.
function formatDate(d: string): string {
  try {
    return new Date(d + "T00:00:00").toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return d;
  }
}

function isOverdue(deadline: string | null, done: boolean): boolean {
  if (!deadline || done) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(deadline + "T00:00:00") < today;
}

interface TicketDraft {
  title: string;
  description: string;
}

export default function FeaturesBoard() {
  const [state, setState] = useState<BoardState>("loading");
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [subTab, setSubTab] = useState<SubTab>("active");

  // Add-feature collapsible form
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [busy, setBusy] = useState(false);

  // Per-feature ticket drafts + edit state
  const [ticketDrafts, setTicketDrafts] = useState<Record<string, TicketDraft>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDeadline, setEditDeadline] = useState("");

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

  async function addFeature(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("features").insert({
        name: name.trim(),
        description: description.trim(),
        deadline: deadline || null,
        author_name: displayName(user),
      });
      if (!error) {
        await recordHistory(supabase, user, "added_feature", "feature", name.trim(), {
          description: description.trim(),
          deadline: deadline || null,
        });
        setName("");
        setDescription("");
        setDeadline("");
        setShowAddForm(false);
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  function startEdit(feature: FeatureRow) {
    setEditingId(feature.id);
    setEditName(feature.name);
    setEditDescription(feature.description);
    setEditDeadline(feature.deadline ?? "");
  }

  async function saveEdit(feature: FeatureRow) {
    if (!editName.trim() || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase
        .from("features")
        .update({
          name: editName.trim(),
          description: editDescription.trim(),
          deadline: editDeadline || null,
        })
        .eq("id", feature.id);
      if (!error) {
        await recordHistory(supabase, user, "updated_feature", "feature", editName.trim(), {
          description: editDescription.trim(),
          deadline: editDeadline || null,
        });
        setEditingId(null);
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function addTicket(feature: FeatureRow) {
    const draft = ticketDrafts[feature.id] ?? { title: "", description: "" };
    const title = draft.title.trim();
    if (!title || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.from("tickets").insert({
        feature_id: feature.id,
        title,
        description: draft.description.trim(),
        author_name: displayName(user),
      });
      if (!error) {
        await recordHistory(supabase, user, "added_ticket", "ticket", title, { feature: feature.name });
        setTicketDrafts((d) => ({ ...d, [feature.id]: { title: "", description: "" } }));
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  async function completeFeature(feature: FeatureRow) {
    const { error } = await supabase
      .from("features")
      .update({
        done: true,
        completed_by: user?.id ?? null,
        completed_name: displayName(user),
        completed_at: new Date().toISOString(),
      })
      .eq("id", feature.id);
    if (!error) {
      await recordHistory(supabase, user, "completed_feature", "feature", feature.name);
      await load();
    }
  }

  async function reopenFeature(feature: FeatureRow) {
    const { error } = await supabase
      .from("features")
      .update({ done: false, completed_by: null, completed_name: null, completed_at: null })
      .eq("id", feature.id);
    if (!error) {
      await load();
    }
  }

  async function archiveFeature(feature: FeatureRow) {
    if (!window.confirm(`Archive feature "${feature.name}"? It and its tickets move to History.`)) return;
    const featureTickets = tickets.filter((t) => t.feature_id === feature.id);
    await recordHistory(supabase, user, "archived_feature", "feature", feature.name, {
      description: feature.description,
      author_name: feature.author_name,
      created_at: feature.created_at,
      tickets: featureTickets.map((t) => ({ title: t.title, done: t.done, author_name: t.author_name })),
    });
    const { error } = await supabase.from("features").delete().eq("id", feature.id);
    if (!error) await load();
  }

  if (state === "loading") return <p className="card-desc">Loading features...</p>;
  if (state === "no-tables") return <SetupNotice />;
  if (state === "error") {
    return (
      <p className="card-desc" style={{ color: "#d32f2f" }} data-testid="features-error">
        Could not load features. Check your connection and try again.
      </p>
    );
  }

  const visibleFeatures = features.filter((f) => (subTab === "completed" ? f.done : !f.done));
  const activeCount = features.filter((f) => !f.done).length;
  const completedCount = features.length - activeCount;

  return (
    <div data-testid="features-board">
      {/* Add feature — collapsible box */}
      {!showAddForm ? (
        <button
          className="btn-primary"
          onClick={() => setShowAddForm(true)}
          data-testid="show-feature-form-btn"
          style={{ marginBottom: "24px" }}
        >
          + Add Feature
        </button>
      ) : (
        <form onSubmit={addFeature} className="card" style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
          <input
            className="input-field"
            placeholder="Feature name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            autoFocus
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
          <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "8px" }}>
            Deadline
            <input
              type="date"
              className="input-field"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              style={{ width: "auto" }}
              data-testid="feature-deadline-input"
            />
          </label>
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="submit" className="btn-primary" disabled={!name.trim() || busy} data-testid="add-feature-btn">
              Add Feature
            </button>
            <button type="button" className="btn-ghost" onClick={() => setShowAddForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Active / Completed sub-tabs */}
      <div className="subtabs-nav" role="tablist" aria-label="Feature status">
        <button
          className={`subtab-btn ${subTab === "active" ? "active" : ""}`}
          onClick={() => setSubTab("active")}
          data-testid="features-subtab-active"
        >
          Active ({activeCount})
        </button>
        <button
          className={`subtab-btn ${subTab === "completed" ? "active" : ""}`}
          onClick={() => setSubTab("completed")}
          data-testid="features-subtab-completed"
        >
          Completed ({completedCount})
        </button>
      </div>

      {visibleFeatures.length === 0 && (
        <p className="card-desc" data-testid="features-empty">
          {subTab === "active" ? "No active features. Add one above." : "No completed features yet."}
        </p>
      )}

      <div className="two-col-grid">
        {visibleFeatures.map((feature) => {
          const featureTickets = tickets.filter((t) => t.feature_id === feature.id);
          const doneCount = featureTickets.filter((t) => t.done).length;
          const overdue = isOverdue(feature.deadline, feature.done);
          const editing = editingId === feature.id;
          const draft = ticketDrafts[feature.id] ?? { title: "", description: "" };

          return (
            <div className="card" key={feature.id} data-testid={`feature-${feature.id}`}>
              {editing ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <input
                    className="input-field"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    maxLength={120}
                    data-testid={`edit-feature-name-${feature.id}`}
                  />
                  <textarea
                    className="input-field"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    rows={2}
                    maxLength={1000}
                  />
                  <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "8px" }}>
                    Deadline
                    <input
                      type="date"
                      className="input-field"
                      value={editDeadline}
                      onChange={(e) => setEditDeadline(e.target.value)}
                      style={{ width: "auto" }}
                    />
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button className="btn-primary" onClick={() => saveEdit(feature)} disabled={!editName.trim() || busy} style={{ padding: "6px 14px" }}>
                      Save
                    </button>
                    <button className="btn-ghost" onClick={() => setEditingId(null)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                    <h3 className="card-title" style={{ overflowWrap: "anywhere", marginBottom: 0 }}>
                      {feature.done && "✅ "}{feature.name}
                    </h3>
                    {feature.deadline && (
                      <span className={`deadline-pill ${overdue ? "overdue" : ""}`} style={{ flexShrink: 0 }}>
                        {overdue ? "⚠ Due " : "Due "}{formatDate(feature.deadline)}
                      </span>
                    )}
                  </div>
                  {feature.description && (
                    <p className="card-desc" style={{ overflowWrap: "anywhere", marginTop: "6px" }}>{feature.description}</p>
                  )}
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "6px" }}>
                    by <strong>{nameFor(profiles, feature.created_by, feature.author_name)}</strong> · {formatTime(feature.created_at)}
                    {featureTickets.length > 0 && <> · {doneCount}/{featureTickets.length} tickets done</>}
                    {feature.done && feature.completed_at && (
                      <> · completed by <strong>{nameFor(profiles, feature.completed_by, feature.completed_name)}</strong></>
                    )}
                  </p>

                  <div style={{ display: "flex", gap: "8px", marginTop: "10px", flexWrap: "wrap" }}>
                    {!feature.done ? (
                      <>
                        <button className="btn-ghost" onClick={() => completeFeature(feature)} data-testid={`complete-feature-${feature.id}`}>
                          ✓ Complete
                        </button>
                        <button className="btn-ghost" onClick={() => startEdit(feature)} data-testid={`edit-feature-${feature.id}`}>
                          ✎ Edit
                        </button>
                      </>
                    ) : (
                      <button className="btn-ghost" onClick={() => reopenFeature(feature)} data-testid={`reopen-feature-${feature.id}`}>
                        ↺ Reopen
                      </button>
                    )}
                    <button className="btn-ghost" onClick={() => archiveFeature(feature)} data-testid={`archive-feature-${feature.id}`}>
                      🗃 Archive
                    </button>
                  </div>
                </>
              )}

              {/* Tickets */}
              <div style={{ marginTop: "14px", borderTop: "1px solid var(--border-color)", paddingTop: "6px" }}>
                {featureTickets.length === 0 && (
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", padding: "6px 0" }}>
                    No tickets yet — add the tasks needed to build this.
                  </p>
                )}
                {featureTickets.map((ticket) => (
                  <TicketItem
                    key={ticket.id}
                    ticket={ticket}
                    featureName={feature.name}
                    user={user}
                    profiles={profiles}
                    onChanged={load}
                    showDelete
                  />
                ))}

                {!feature.done && (
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "10px" }}>
                    <input
                      className="input-field"
                      placeholder="New ticket title"
                      value={draft.title}
                      onChange={(e) => setTicketDrafts((d) => ({ ...d, [feature.id]: { ...draft, title: e.target.value } }))}
                      maxLength={200}
                      data-testid={`ticket-title-input-${feature.id}`}
                    />
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        className="input-field"
                        placeholder="Description (optional)"
                        value={draft.description}
                        onChange={(e) => setTicketDrafts((d) => ({ ...d, [feature.id]: { ...draft, description: e.target.value } }))}
                        maxLength={1000}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTicket(feature); } }}
                      />
                      <button
                        className="btn-primary"
                        onClick={() => addTicket(feature)}
                        disabled={!draft.title.trim() || busy}
                        style={{ flexShrink: 0 }}
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
