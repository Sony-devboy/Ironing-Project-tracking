"use client";

import React, { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import {
  TicketRow,
  ProfileMap,
  addNote,
  displayName,
  nameFor,
  recordHistory,
} from "@/utils/appData";
import TicketNoteModal from "@/components/TicketNoteModal";

interface TicketItemProps {
  ticket: TicketRow;
  featureName: string;
  user: User | null;
  profiles: ProfileMap;
  onChanged: () => void | Promise<void>;
  showDelete?: boolean;
}

// A single ticket row shared by the Features board, Tickets panel and My
// Workspace. Completion rules live here so every surface enforces them:
//   • only the ticket's owner can mark it done
//   • a completed ticket is locked — it cannot be reopened
export default function TicketItem({ ticket, featureName, user, profiles, onChanged, showDelete }: TicketItemProps) {
  const [completing, setCompleting] = useState(false);
  const supabase = createClient();

  const isOwner = !!user && ticket.owner_id === user.id;

  async function takeTicket() {
    if (!user) return;
    const { error } = await supabase
      .from("tickets")
      .update({ owner_id: user.id, owner_name: displayName(user) })
      .eq("id", ticket.id)
      .is("owner_id", null);
    if (!error) {
      await recordHistory(supabase, user, "took_ticket", "ticket", ticket.title, { feature: featureName });
      await onChanged();
    }
  }

  async function dropTicket() {
    if (!user) return;
    const { error } = await supabase
      .from("tickets")
      .update({ owner_id: null, owner_name: null })
      .eq("id", ticket.id)
      .eq("owner_id", user.id);
    if (!error) {
      await recordHistory(supabase, user, "dropped_ticket", "ticket", ticket.title, { feature: featureName });
      await onChanged();
    }
  }

  async function completeTicket(note: string) {
    setCompleting(false);
    if (!isOwner || ticket.done) return; // guard: owner-only, one-way
    const { error } = await supabase.from("tickets").update({ done: true }).eq("id", ticket.id);
    if (!error) {
      await recordHistory(supabase, user, "completed_ticket", "ticket", ticket.title, { feature: featureName });
      if (note) await addNote(supabase, user, ticket.title, note, "ticket");
      await onChanged();
    }
  }

  async function deleteTicket() {
    if (!window.confirm(`Delete ticket "${ticket.title}"? It will be recorded in History.`)) return;
    const { error } = await supabase.from("tickets").delete().eq("id", ticket.id);
    if (!error) {
      await recordHistory(supabase, user, "deleted_ticket", "ticket", ticket.title, {
        feature: featureName,
        done: ticket.done,
      });
      await onChanged();
    }
  }

  // Checkbox is only actionable by the owner on an open ticket. Completed
  // tickets show a locked, checked box (no reopen).
  const checkboxDisabled = ticket.done || !isOwner;

  return (
    <div style={{ padding: "8px 0", borderTop: "1px solid var(--border-color)" }} data-testid={`ticket-${ticket.id}`}>
      {completing && (
        <TicketNoteModal
          ticketTitle={ticket.title}
          onComplete={completeTicket}
          onCancel={() => setCompleting(false)}
        />
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <input
          type="checkbox"
          checked={ticket.done}
          disabled={checkboxDisabled}
          onChange={() => { if (isOwner && !ticket.done) setCompleting(true); }}
          aria-label={ticket.done ? `${ticket.title} completed` : `Complete "${ticket.title}"`}
          title={ticket.done ? "Completed — locked" : isOwner ? "Mark done" : "Only the owner can complete this ticket"}
          style={{ width: "16px", height: "16px", cursor: checkboxDisabled ? "not-allowed" : "pointer", flexShrink: 0 }}
        />
        <span style={{
          fontSize: "0.9rem",
          fontWeight: 600,
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
        {!ticket.owner_id && !ticket.done && user && (
          <button className="btn-ghost" onClick={takeTicket} style={{ padding: "2px 8px", flexShrink: 0 }}>
            Take
          </button>
        )}
        {isOwner && !ticket.done && (
          <button className="btn-ghost" onClick={dropTicket} style={{ padding: "2px 8px", flexShrink: 0 }}>
            Drop
          </button>
        )}
        {showDelete && (
          <button
            className="btn-ghost"
            onClick={deleteTicket}
            aria-label={`Delete ticket ${ticket.title}`}
            style={{ padding: "2px 8px", flexShrink: 0 }}
          >
            ✕
          </button>
        )}
      </div>
      {ticket.description && (
        <p style={{
          fontSize: "0.8rem",
          color: "var(--text-secondary)",
          margin: "4px 0 0 26px",
          overflowWrap: "anywhere",
          whiteSpace: "pre-wrap",
        }}>
          {ticket.description}
        </p>
      )}
    </div>
  );
}
