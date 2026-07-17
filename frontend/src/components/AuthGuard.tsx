"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

type GuardState = "checking" | "authed" | "anon";

// Client-side gate for member-only pages. Note: this only hides the UI —
// actual data protection is enforced by Supabase Row Level Security, which
// rejects anonymous queries at the database regardless of what the client does.
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GuardState>("checking");
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!cancelled) {
        setState(session?.user ? "authed" : "anon");
      }
    }
    check();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setState(session?.user ? "authed" : "anon");
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (state === "authed") {
    return <>{children}</>;
  }

  if (state === "checking") {
    return (
      <div className="card" data-testid="auth-guard-checking" style={{ maxWidth: "480px" }}>
        <p className="card-desc">Checking access...</p>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn 0.5s ease-out" }}>
      <div className="card" data-testid="auth-guard-locked" style={{ maxWidth: "480px" }}>
        <span aria-hidden="true" style={{ fontSize: "2rem", display: "block", marginBottom: "12px" }}>🔒</span>
        <h2 className="card-title">Sign in required</h2>
        <p className="card-desc">
          This area is only available to logged-in members. Use the{" "}
          <strong>Log In</strong> button in the top bar to continue with GitHub.
        </p>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `
      }} />
    </div>
  );
}
