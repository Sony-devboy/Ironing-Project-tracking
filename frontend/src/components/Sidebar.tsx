"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { label: "Home", href: "/", id: "nav-home", abbr: "H" },
  { label: "Main App", href: "/mainapp", id: "nav-mainapp", abbr: "MA" },
  { label: "Company Info", href: "/company", id: "nav-company", abbr: "CI" },
  { label: "Settings", href: "/settings", id: "nav-settings", abbr: "S" },
];

export default function Sidebar({ isCollapsed, onToggle }: SidebarProps) {
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
      className={`sidebar ${isCollapsed ? "sidebar-collapsed" : ""}`}
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
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const isProtected = item.href !== "/";
          const showWarning = !user && isProtected;

          return (
            <Link 
              key={item.id}
              href={item.href} 
              className={`sidebar-item ${isActive ? "active" : ""}`} 
              data-testid={item.id}
              title={showWarning ? "Log in to load and sync data for this view" : undefined}
              style={{
                opacity: showWarning ? 0.7 : 1,
              }}
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
