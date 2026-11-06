"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { authCallbackUrl } from "@/lib/punnett/auth";

export function AuthControls({ signedIn = false }: { signedIn?: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function authenticate() {
    setPending(true);
    setError(null);
    try {
      const supabase = createClient();
      if (signedIn) {
        const { error } = await supabase.auth.signOut({ scope: "local" });
        if (error) throw error;
        router.replace("/");
        router.refresh();
        setPending(false);
      } else {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: authCallbackUrl(window.location.origin), skipBrowserRedirect: true },
        });
        if (error || !data.url) throw error ?? new Error("Sign-in could not start.");
        window.location.assign(data.url);
      }
    } catch {
      setError(signedIn ? "Sign-out failed. Please try again." : "Google sign-in could not start. Please try again.");
      setPending(false);
    }
  }

  return <div className="auth-controls"><button className="app-button" onClick={authenticate} disabled={pending}>
    {pending ? "One moment…" : signedIn ? "Sign out" : "Sign in with Google"}
  </button>{error ? <p className="form-error" role="alert">{error}</p> : null}</div>;
}
