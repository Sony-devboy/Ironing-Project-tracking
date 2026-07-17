"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
  mobileOpen?: boolean;
  onNavigate?: () => void;
}

const navItems = [
  { label: "Home", href: "/", id: "nav-home", abbr: "H", membersOnly: false },
  { label: "Main App", href: "/mainapp", id: "nav-mainapp", abbr: "MA", membersOnly: true },
  { label: "Company Info", href: "/company", id: "nav-company", abbr: "CI", membersOnly: true },
  { label: "History", href: "/history", id: "nav-history", abbr: "HX", membersOnly: true },
  { label: "Local Chat", href: "/chat", id: "nav-chat", abbr: "LC", membersOnly: true },
  { label: "Settings", href: "/settings", id: "nav-settings", abbr: "S", membersOnly: false },
];

export default function Sidebar({ isCollapsed, onToggle, mobileOpen, onNavigate }: SidebarProps) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
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

            return (
              <Link
                key={item.id}
                href={item.href}
                className={`sidebar-item ${isActive ? "active" : ""}`}
                data-testid={item.id}
                onClick={onNavigate}
              >
                <span className="sidebar-text-short" aria-hidden="true">
                  {item.abbr}
                </span>
                <span className="sidebar-text">
                  {item.label}
                </span>
              </Link>
            );
          })}
      </nav>
    </aside>
  );
}
