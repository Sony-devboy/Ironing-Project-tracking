"use client";

import React, { useState } from "react";

interface TicketNoteModalProps {
  ticketTitle: string;
  onComplete: (note: string) => void; // empty string = complete without note
  onCancel: () => void;
}

// Popup shown when a ticket is being marked done: asks for a work note.
// The note is saved to the Notes tab with the ticket name as its heading.
export default function TicketNoteModal({ ticketTitle, onComplete, onCancel }: TicketNoteModalProps) {
  const [note, setNote] = useState("");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Complete ticket ${ticketTitle}`}
      data-testid="ticket-note-modal"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: "16px",
      }}
      onClick={onCancel}
    >
      <div
        className="card"
        style={{ maxWidth: "440px", width: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="card-title">Complete “{ticketTitle}”</h2>
        <p className="card-desc" style={{ marginBottom: "12px" }}>
          Add a note about the work done — it will appear in the Notes tab under this ticket&apos;s name.
        </p>
        <textarea
          className="input-field"
          placeholder="What was done? (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={4}
          maxLength={2000}
          autoFocus
          data-testid="ticket-note-input"
        />
        <div style={{ display: "flex", gap: "8px", marginTop: "14px", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button className="btn-ghost" onClick={onCancel} data-testid="ticket-note-cancel">
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() => onComplete(note.trim())}
            data-testid="ticket-note-confirm"
          >
            {note.trim() ? "Complete with Note" : "Complete without Note"}
          </button>
        </div>
      </div>
    </div>
  );
}
