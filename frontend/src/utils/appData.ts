import { SupabaseClient, User } from "@supabase/supabase-js";

export interface FeatureRow {
  id: string;
  name: string;
  description: string;
  author_name: string;
  created_at: string;
}

export interface TicketRow {
  id: string;
  feature_id: string;
  title: string;
  done: boolean;
  author_name: string;
  created_at: string;
}

export interface HistoryRow {
  id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_name: string;
  details: Record<string, unknown> | null;
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
  return user?.user_metadata?.user_name || user?.email || "Unknown";
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
  added_ticket: "added ticket",
  deleted_ticket: "deleted ticket",
  completed_ticket: "completed ticket",
  reopened_ticket: "reopened ticket",
};

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
