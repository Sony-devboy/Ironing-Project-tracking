"use client";

import React, { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import {
  NoteRow,
  ProfileMap,
  addNote,
  isMissingTable,
  loadProfiles,
  nameFor,
  formatTime,
} from "@/utils/appData";
import { SetupNotice } from "@/components/FeaturesBoard";

type PanelState = "loading" | "ready" | "no-tables" | "error";

export default function NotesPanel() {
  const [state, setState] = useState<PanelState>("loading");
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [user, setUser] = useState<User | null>(null);
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  const load = useCallback(async () => {
    const [n, p] = await Promise.all([
      supabase.from("notes").select("*").order("created_at", { ascending: false }),
      loadProfiles(supabase),
    ]);
    if (n.error) {
      setState(isMissingTable(n.error) ? "no-tables" : "error");
      return;
    }
    setNotes((n.data as NoteRow[]) ?? []);
    setProfiles(p);
    setState("ready");
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    load();
  }, [supabase, load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!heading.trim() || busy) return;
    setBusy(true);
    try {
      const { error } = await addNote(supabase, user, heading.trim(), body.trim(), "manual");
      if (!error) {
        setHeading("");
        setBody("");
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return <p className="card-desc">Loading notes...</p>;
  if (state === "no-tables") return <SetupNotice />;
  if (state === "error") {
    return <p className="card-desc" style={{ color: "#d32f2f" }}>Could not load notes.</p>;
  }

  return (
    <div data-testid="notes-panel">
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
        <input
          className="input-field"
          placeholder="Note heading"
          value={heading}
          onChange={(e) => setHeading(e.target.value)}
          maxLength={120}
          data-testid="note-heading-input"
        />
        <textarea
          className="input-field"
          placeholder="Description"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={2000}
          data-testid="note-body-input"
        />
        <button type="submit" className="btn-primary" disabled={!heading.trim() || busy} data-testid="add-note-btn" style={{ alignSelf: "flex-start" }}>
          + Add Note
        </button>
      </form>

      {notes.length === 0 && (
        <p className="card-desc" data-testid="notes-empty">
          No notes yet. Add one above, or complete a ticket — its completion note lands here automatically.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {notes.map((note) => (
          <div className="card" key={note.id} style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
              <h3 className="card-title" style={{ marginBottom: 0, overflowWrap: "anywhere" }}>{note.heading}</h3>
              {note.kind === "ticket" && (
                <span style={{
                  fontSize: "0.65rem",
                  fontWeight: 700,
                  color: "var(--text-secondary)",
                  background: "var(--bg-primary)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "8px",
                  padding: "2px 8px",
                }}>
                  🎟 ticket
                </span>
              )}
            </div>
            {note.body && (
              <p className="card-desc" style={{ marginTop: "6px", overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>
                {note.body}
              </p>
            )}
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "8px" }}>
              by <strong>{nameFor(profiles, note.created_by, note.author_name)}</strong> · {formatTime(note.created_at)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
