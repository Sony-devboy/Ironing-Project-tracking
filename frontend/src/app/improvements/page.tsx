"use client";

import React, { useCallback, useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import {
  ImprovementRow,
  ProfileMap,
  displayName,
  isMissingTable,
  loadProfiles,
  nameFor,
  recordHistory,
  formatTime,
} from "@/utils/appData";
import { SetupNotice } from "@/components/FeaturesBoard";

type PanelState = "loading" | "ready" | "no-tables" | "error";

function ImprovementsBoard() {
  const [state, setState] = useState<PanelState>("loading");
  const [improvements, setImprovements] = useState<ImprovementRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [user, setUser] = useState<User | null>(null);
  const [heading, setHeading] = useState("");
  const [body, setBody] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  const load = useCallback(async () => {
    const [i, p] = await Promise.all([
      supabase.from("improvements").select("*").order("created_at", { ascending: false }),
      loadProfiles(supabase),
    ]);
    if (i.error) {
      setState(isMissingTable(i.error) ? "no-tables" : "error");
      return;
    }
    setImprovements((i.data as ImprovementRow[]) ?? []);
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
      const { error } = await supabase.from("improvements").insert({
        heading: heading.trim(),
        body: body.trim(),
        author_name: displayName(user),
      });
      if (!error) {
        await recordHistory(supabase, user, "added_improvement", "improvement", heading.trim());
        setHeading("");
        setBody("");
        setShowForm(false);
        await load();
      }
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") return <p className="card-desc">Loading improvements...</p>;
  if (state === "no-tables") return <SetupNotice />;
  if (state === "error") {
    return <p className="card-desc" style={{ color: "#d32f2f" }}>Could not load improvements.</p>;
  }

  return (
    <div data-testid="improvements-board">
      {!showForm ? (
        <button className="btn-primary" onClick={() => setShowForm(true)} data-testid="show-improvement-form-btn" style={{ marginBottom: "24px" }}>
          + Add Improvement
        </button>
      ) : (
        <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
          <input
            className="input-field"
            placeholder="Improvement heading"
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            maxLength={120}
            autoFocus
            data-testid="improvement-heading-input"
          />
          <textarea
            className="input-field"
            placeholder="Describe your improvement idea"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={3}
            maxLength={2000}
            data-testid="improvement-body-input"
          />
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="submit" className="btn-primary" disabled={!heading.trim() || busy} data-testid="add-improvement-btn">
              Submit
            </button>
            <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {improvements.length === 0 && (
        <p className="card-desc" data-testid="improvements-empty">
          No improvement suggestions yet. Click the button above to add the first one.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {improvements.map((item) => (
          <div className="card" key={item.id} style={{ padding: "16px 20px" }}>
            <h3 className="card-title" style={{ overflowWrap: "anywhere" }}>💡 {item.heading}</h3>
            {item.body && (
              <p className="card-desc" style={{ overflowWrap: "anywhere", whiteSpace: "pre-wrap" }}>{item.body}</p>
            )}
            <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "8px" }}>
              by <strong>{nameFor(profiles, item.created_by, item.author_name)}</strong> · {formatTime(item.created_at)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ImprovementsPage() {
  return (
    <AuthGuard>
      <div style={{ animation: "fadeIn 0.5s ease-out" }}>
        <header style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "8px", letterSpacing: "-0.02em" }}>
            Improvements
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Suggestions for making this tracker better — everyone can pitch in
          </p>
        </header>

        <ImprovementsBoard />

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
