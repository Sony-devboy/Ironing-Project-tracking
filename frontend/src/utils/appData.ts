import { SupabaseClient, User } from "@supabase/supabase-js";

export interface FeatureRow {
  id: string;
  name: string;
  description: string;
  deadline: string | null;
  done: boolean;
  completed_by: string | null;
  completed_name: string | null;
  completed_at: string | null;
  created_by: string;
  author_name: string;
  created_at: string;
}

export interface TicketRow {
  id: string;
  feature_id: string;
  title: string;
  description: string;
  done: boolean;
  created_by: string;
  author_name: string;
  owner_id: string | null;
  owner_name: string | null;
  created_at: string;
}

export interface HistoryRow {
  id: string;
  actor_id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_name: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  display_name: string;
}

export interface NoteRow {
  id: string;
  heading: string;
  body: string;
  kind: "manual" | "ticket";
  created_by: string;
  author_name: string;
  created_at: string;
}

export interface ImprovementRow {
  id: string;
  heading: string;
  body: string;
  done: boolean;
  completed_by: string | null;
  completed_name: string | null;
  completed_at: string | null;
  created_by: string;
  author_name: string;
  created_at: string;
}

export interface MeetingRecordRow {
  id: string;
  title: string;
  meeting_date: string | null;
  file_path: string;
  file_name: string;
  uploaded_by: string;
  uploader_name: string;
  created_at: string;
}

export interface MessageRow {
  id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

export function displayName(user: User | null): string {
  return (
    user?.user_metadata?.display_name ||
    user?.user_metadata?.user_name ||
    user?.email ||
    "Unknown"
  );
}

// Current display names by user id. Rendering resolves names through this
// map (falling back to the name stored on the row), so renaming yourself in
// Settings retroactively updates chats, tickets, history — everything.
export type ProfileMap = Record<string, string>;

export async function loadProfiles(supabase: SupabaseClient): Promise<ProfileMap> {
  const { data, error } = await supabase.from("profiles").select("id, display_name");
  if (error) return {};
  const map: ProfileMap = {};
  for (const row of (data as ProfileRow[]) ?? []) {
    map[row.id] = row.display_name;
  }
  return map;
}

export function nameFor(profiles: ProfileMap, userId: string | null | undefined, fallback: string | null | undefined): string {
  return (userId && profiles[userId]) || fallback || "Unknown";
}

// True when the query failed because the tables have not been created yet
// (setup SQL not run), as opposed to a real error.
export function isMissingTable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST205" ||
    error.code === "42P01" ||
    /schema cache|does not exist/i.test(error.message ?? "")
  );
}

// Record an action in the immutable history log. actor_id is filled in by
// the database from the authenticated session.
export async function recordHistory(
  supabase: SupabaseClient,
  user: User | null,
  action: string,
  entityType: string,
  entityName: string,
  details?: Record<string, unknown>
): Promise<void> {
  const { error } = await supabase.from("history").insert({
    actor_name: displayName(user),
    action,
    entity_type: entityType,
    entity_name: entityName,
    details: details ?? null,
  });
  if (error) {
    console.error("Failed to record history entry", error);
  }
}

export const ACTION_LABELS: Record<string, string> = {
  added_feature: "added feature",
  archived_feature: "archived feature",
  updated_feature: "updated feature",
  completed_feature: "completed feature",
  added_ticket: "added ticket",
  deleted_ticket: "deleted ticket",
  completed_ticket: "completed ticket",
  reopened_ticket: "reopened ticket",
  took_ticket: "took ticket",
  dropped_ticket: "dropped ticket",
  updated_display_name: "changed display name to",
  added_note: "added note",
  added_improvement: "suggested improvement",
  completed_improvement: "marked improvement done",
  added_meeting_record: "added meeting record",
  deleted_meeting_record: "deleted meeting record",
};

// Insert a note and log it. Used by the Notes tab (manual) and by the
// ticket-completion popup (kind: "ticket", heading = ticket title).
export async function addNote(
  supabase: SupabaseClient,
  user: User | null,
  heading: string,
  body: string,
  kind: "manual" | "ticket"
): Promise<{ error: { message?: string } | null }> {
  const { error } = await supabase.from("notes").insert({
    heading,
    body,
    kind,
    author_name: displayName(user),
  });
  if (!error) {
    await recordHistory(supabase, user, "added_note", "note", heading);
  }
  return { error };
}

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replaceAll("_", " ");
}

export function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}
