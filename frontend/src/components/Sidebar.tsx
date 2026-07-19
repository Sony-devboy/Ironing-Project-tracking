"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { isMissingTable } from "@/utils/appData";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onNavigate?: () => void;
}

const navItems = [
  { label: "Home", href: "/", id: "nav-home", abbr: "H", membersOnly: false },
  { label: "Main App", href: "/mainapp", id: "nav-mainapp", abbr: "MA", membersOnly: true },
  { label: "My Workspace", href: "/workspace", id: "nav-workspace", abbr: "MW", membersOnly: true },
  { label: "Company Info", href: "/company", id: "nav-company", abbr: "CI", membersOnly: true },
  { label: "History", href: "/history", id: "nav-history", abbr: "HX", membersOnly: true },
  { label: "Local Chat", href: "/chat", id: "nav-chat", abbr: "LC", membersOnly: true },
  { label: "Improvements", href: "/improvements", id: "nav-improvements", abbr: "IM", membersOnly: true },
  { label: "Settings", href: "/settings", id: "nav-settings", abbr: "S", membersOnly: false },
];

const UNREAD_POLL_MS = 10000;

export default function Sidebar({ isCollapsed, onToggle, mobileOpen, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [unread, setUnread] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    async function getSession() {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    }
    getSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase]);

  // Unread chat count: messages from other people newer than this user's last
  // seen timestamp (stored server-side in message_reads, so it syncs across
  // devices). Degrades to 0 silently if the table isn't set up yet.
  const fetchUnread = useCallback(async () => {
    if (!user) {
      setUnread(0);
      return;
    }
    try {
      const { data: readRow, error: readErr } = await supabase
        .from("message_reads")
        .select("last_seen_at")
        .eq("user_id", user.id)
        .maybeSingle();
      if (readErr && isMissingTable(readErr)) return;
      const lastSeen = readRow?.last_seen_at ?? "1970-01-01T00:00:00Z";
      const { count, error } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .gt("created_at", lastSeen)
        .neq("author_id", user.id);
      if (!error) setUnread(count ?? 0);
    } catch {
      // Badge is best-effort; never let it break the sidebar.
    }
  }, [supabase, user]);

  // Poll for unread, and refresh whenever the route changes (so opening the
  // chat page, which marks messages read, clears the badge promptly).
  useEffect(() => {
    fetchUnread();
    const interval = setInterval(fetchUnread, UNREAD_POLL_MS);
    return () => clearInterval(interval);
  }, [fetchUnread, pathname]);

  return (
    <aside
      className={`sidebar ${isCollapsed ? "sidebar-collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}
      data-testid="sidebar-aside"
    >
      <div
        className="sidebar-header"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "flex-end",
          padding: "12px 16px",
          borderBottom: "1px solid var(--border-color)",
          minHeight: "56px"
        }}
      >
        <button
          className="collapse-btn-icon"
          onClick={onToggle}
          aria-expanded={!isCollapsed}
          aria-label="Toggle Sidebar"
          data-testid="sidebar-toggle-btn"
          style={{
            background: "var(--bg-primary)",
            border: "1px solid var(--border-color)",
            borderRadius: "6px",
            width: "32px",
            height: "32px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-primary)",
            fontSize: "0.8rem",
            boxShadow: "var(--shadow)",
            transition: "all var(--transition-speed) var(--transition-bezier)"
          }}
        >
          <span>{isCollapsed ? "▶" : "◀"}</span>
        </button>
      </div>

      <nav className="sidebar-nav">
        {navItems
          // Member-only sections are hidden entirely until someone signs in
          .filter((item) => !item.membersOnly || user)
          .map((item) => {
            const isActive = pathname === item.href;
            const showBadge = item.href === "/chat" && unread > 0;

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`sidebar-item ${isActive ? "active" : ""}`}
                data-testid={item.id}
                onClick={onNavigate}
              >
                <span className="sidebar-text-short" aria-hidden="true" style={{ position: "relative" }}>
                  {item.abbr}
                  {showBadge && (
                    <span
                      className="count-badge"
                      style={{ position: "absolute", top: "-8px", right: "-12px" }}
                      aria-hidden="true"
                    >
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </span>
                <span className="sidebar-text" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {item.label}
                  {showBadge && (
                    <span className="count-badge" data-testid="chat-unread-badge" aria-label={`${unread} unread messages`}>
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </span>
              </Link>
            );
          })}
      </nav>
    </aside>
  );
}
