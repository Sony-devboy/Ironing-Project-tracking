"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import {
  MeetingRecordRow,
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

const BUCKET = "meeting-records";
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

function formatMeetingDate(d: string | null): string {
  if (!d) return "";
  try {
    return new Date(d + "T00:00:00").toLocaleDateString(undefined, { dateStyle: "medium" });
  } catch {
    return d;
  }
}

export default function MeetingRecords() {
  const [state, setState] = useState<PanelState>("loading");
  const [records, setRecords] = useState<MeetingRecordRow[]>([]);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [user, setUser] = useState<User | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const supabase = createClient();

  const load = useCallback(async () => {
    const [r, p] = await Promise.all([
      supabase.from("meeting_records").select("*").order("created_at", { ascending: false }),
      loadProfiles(supabase),
    ]);
    if (r.error) {
      setState(isMissingTable(r.error) ? "no-tables" : "error");
      return;
    }
    setRecords((r.data as MeetingRecordRow[]) ?? []);
    setProfiles(p);
    setState("ready");
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null));
    load();
  }, [supabase, load]);

  function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    setErrorMsg("");
    const f = e.target.files?.[0] ?? null;
    if (f && f.type !== "application/pdf") {
      setErrorMsg("Please choose a PDF file.");
      setFile(null);
      return;
    }
    if (f && f.size > MAX_BYTES) {
      setErrorMsg("File is too large (max 25 MB).");
      setFile(null);
      return;
    }
    setFile(f);
  }

  function resetForm() {
    setTitle("");
    setMeetingDate("");
    setFile(null);
    setErrorMsg("");
    setShowForm(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !file || busy) return;
    setBusy(true);
    setErrorMsg("");
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user?.id ?? "anon"}/${Date.now()}-${safeName}`;
      const up = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: "application/pdf",
        upsert: false,
      });
      if (up.error) {
        setErrorMsg(`Upload failed: ${up.error.message}`);
        return;
      }
      const { error } = await supabase.from("meeting_records").insert({
        title: title.trim(),
        meeting_date: meetingDate || null,
        file_path: path,
        file_name: file.name,
        uploader_name: displayName(user),
      });
      if (error) {
        // Roll back the orphaned file if the metadata insert failed
        await supabase.storage.from(BUCKET).remove([path]);
        setErrorMsg(`Could not save record: ${error.message}`);
        return;
      }
      await recordHistory(supabase, user, "added_meeting_record", "meeting", title.trim());
      resetForm();
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function openPdf(record: MeetingRecordRow) {
    const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(record.file_path, 120);
    if (error || !data) {
      window.alert("Could not open the file. It may have been removed.");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  async function deleteRecord(record: MeetingRecordRow) {
    if (!window.confirm(`Delete meeting record "${record.title}"? This removes the PDF too.`)) return;
    const { error } = await supabase.from("meeting_records").delete().eq("id", record.id);
    if (!error) {
      await supabase.storage.from(BUCKET).remove([record.file_path]);
      await recordHistory(supabase, user, "deleted_meeting_record", "meeting", record.title);
      await load();
    }
  }

  if (state === "loading") return <p className="card-desc">Loading meeting records...</p>;
  if (state === "no-tables") return <SetupNotice />;
  if (state === "error") {
    return <p className="card-desc" style={{ color: "#d32f2f" }}>Could not load meeting records.</p>;
  }

  return (
    <div data-testid="meeting-records">
      {!showForm ? (
        <button className="btn-primary" onClick={() => setShowForm(true)} data-testid="show-meeting-form-btn" style={{ marginBottom: "24px" }}>
          + Add Meeting Record
        </button>
      ) : (
        <form onSubmit={submit} className="card" style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
          <input
            className="input-field"
            placeholder="Meeting title (e.g. Q3 Strategy Sync)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={160}
            autoFocus
            data-testid="meeting-title-input"
          />
          <label style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: "8px" }}>
            Meeting date
            <input
              type="date"
              className="input-field"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              style={{ width: "auto" }}
              data-testid="meeting-date-input"
            />
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            onChange={pickFile}
            data-testid="meeting-file-input"
            style={{ fontSize: "0.85rem" }}
          />
          {errorMsg && <p style={{ color: "#d32f2f", fontSize: "0.8rem" }}>{errorMsg}</p>}
          <div style={{ display: "flex", gap: "8px" }}>
            <button type="submit" className="btn-primary" disabled={!title.trim() || !file || busy} data-testid="upload-meeting-btn">
              {busy ? "Uploading…" : "Upload PDF"}
            </button>
            <button type="button" className="btn-ghost" onClick={resetForm}>Cancel</button>
          </div>
        </form>
      )}

      {records.length === 0 && (
        <p className="card-desc" data-testid="meetings-empty">
          No meeting records yet. Upload a minutes-of-meeting PDF above.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {records.map((record) => (
          <div className="card" key={record.id} style={{ padding: "16px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <h3 className="card-title" style={{ overflowWrap: "anywhere", marginBottom: "4px" }}>📄 {record.title}</h3>
                <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  {record.meeting_date && <>{formatMeetingDate(record.meeting_date)} · </>}
                  uploaded by <strong>{nameFor(profiles, record.uploaded_by, record.uploader_name)}</strong> · {formatTime(record.created_at)}
                </p>
              </div>
              <div style={{ display: "flex", gap: "8px", flexShrink: 0 }}>
                <button className="btn-ghost" onClick={() => openPdf(record)} data-testid={`open-meeting-${record.id}`}>
                  View PDF
                </button>
                {record.uploaded_by === user?.id && (
                  <button className="btn-ghost" onClick={() => deleteRecord(record)} aria-label={`Delete ${record.title}`}>
                    ✕
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
