"use client";

import React, { useCallback, useEffect, useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { FeatureRow, TicketRow, ProfileMap, isMissingTable, loadProfiles } from "@/utils/appData";
import { SetupNotice } from "@/components/FeaturesBoard";
import TicketItem from "@/components/TicketItem";

type PanelState = "loading" | "ready" | "no-tables" | "error";
type SubTab = "active" | "completed";

function Workspace() {
  const [state, setState] = useState<PanelState>("loading");
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [tickets, setTickets] = useState<TicketRow[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [subTab, setSubTab] = useState<SubTab>("active");
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const currentUser = sessionData.session?.user ?? null;
    setUser(currentUser);
    if (!currentUser) {
      setState("ready");
      return;
    }
    const [f, t, p] = await Promise.all([
      supabase.from("features").select("*").order("created_at", { ascending: false }),
      // Only the signed-in member's owned tickets
      supabase.from("tickets").select("*").eq("owner_id", currentUser.id).order("created_at", { ascending: true }),
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

  useEffect(() => { load(); }, [load]);

  if (state === "loading") return <p className="card-desc">Loading your workspace...</p>;
  if (state === "no-tables") return <SetupNotice />;
  if (state === "error") {
    return <p className="card-desc" style={{ color: "#d32f2f" }}>Could not load your workspace.</p>;
  }

  const activeCount = tickets.filter((t) => !t.done).length;
  const completedCount = tickets.length - activeCount;
  const matches = (t: TicketRow) => (subTab === "completed" ? t.done : !t.done);
  const featuresWithMatches = features.filter((f) => tickets.some((t) => t.feature_id === f.id && matches(t)));

  return (
    <div data-testid="workspace-panel">
      <div className="subtabs-nav" role="tablist" aria-label="My ticket status">
        <button
          className={`subtab-btn ${subTab === "active" ? "active" : ""}`}
          onClick={() => setSubTab("active")}
          data-testid="workspace-subtab-active"
        >
          Active ({activeCount})
        </button>
        <button
          className={`subtab-btn ${subTab === "completed" ? "active" : ""}`}
          onClick={() => setSubTab("completed")}
          data-testid="workspace-subtab-completed"
        >
          Completed ({completedCount})
        </button>
      </div>

      {featuresWithMatches.length === 0 && (
        <p className="card-desc" data-testid="workspace-empty">
          {subTab === "active"
            ? "You don't own any active tickets. Head to the Main App and Take a ticket to get started."
            : "You haven't completed any tickets yet."}
        </p>
      )}

      <div className="two-col-grid">
        {featuresWithMatches.map((feature) => (
          <div className="card" key={feature.id}>
            <h3 className="card-title" style={{ overflowWrap: "anywhere" }}>
              {feature.done && "✅ "}{feature.name}
            </h3>
            {tickets
              .filter((t) => t.feature_id === feature.id && matches(t))
              .map((ticket) => (
                <TicketItem
                  key={ticket.id}
                  ticket={ticket}
                  featureName={feature.name}
                  user={user}
                  profiles={profiles}
                  onChanged={load}
                />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WorkspacePage() {
  return (
    <AuthGuard>
      <div style={{ animation: "fadeIn 0.5s ease-out" }}>
        <header style={{ marginBottom: "32px" }}>
          <h1 style={{ fontSize: "2rem", fontWeight: 800, marginBottom: "8px", letterSpacing: "-0.02em" }}>
            My Workspace
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
            Every ticket you own, in one place
          </p>
        </header>

        <Workspace />

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
