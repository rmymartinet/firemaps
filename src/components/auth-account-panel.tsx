"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { PasswordResetRequest } from "@/components/password-reset-request";

type AuthMode = "forgot-password" | "sign-in" | "sign-up";

export function AuthAccountPanel() {
  const { data: session, isPending } = authClient.useSession();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const name = String(form.get("name") ?? "").trim();

    const result = mode === "sign-up"
      ? await authClient.signUp.email({ email, name, password })
      : await authClient.signIn.email({ email, password });

    if (result.error) setError(result.error.message || "La connexion a échoué.");
    setSubmitting(false);
  };

  if (isPending) return <p className="m-0 text-xs text-muted">Vérification du compte…</p>;

  if (session?.user) {
    return (
      <div className="grid gap-2">
        <div className="rounded-[10px_7px_12px_8px] border-[1.5px] border-[#263532] p-3">
          <strong className="block text-sm">{session.user.name}</strong>
          <small className="text-muted">{session.user.email}</small>
        </div>
        <button
          className="min-h-10 rounded-[9px_6px_11px_7px] border-[1.5px] border-[#263532] bg-transparent px-3 text-sm font-extrabold"
          onClick={() => authClient.signOut()}
          type="button"
        >
          Se déconnecter
        </button>
      </div>
    );
  }

  if (mode === "forgot-password") {
    return <PasswordResetRequest onBack={() => setMode("sign-in")} />;
  }

  return (
    <div className="grid gap-3">
      <div className="grid grid-cols-2 gap-1 rounded-[10px_7px_12px_8px] border-[1.5px] border-[#263532] p-1">
        <button className={`min-h-9 rounded-[8px_6px_9px_7px] border-0 text-xs font-extrabold ${mode === "sign-in" ? "bg-[#172322] text-white" : "bg-transparent"}`} onClick={() => setMode("sign-in")} type="button">Connexion</button>
        <button className={`min-h-9 rounded-[8px_6px_9px_7px] border-0 text-xs font-extrabold ${mode === "sign-up" ? "bg-[#172322] text-white" : "bg-transparent"}`} onClick={() => setMode("sign-up")} type="button">Créer un compte</button>
      </div>
      <form className="grid gap-2" onSubmit={submit}>
        {mode === "sign-up" && <input className="min-h-11 rounded-[9px_6px_11px_7px] border-[1.5px] border-[#263532] bg-transparent px-3 text-sm" name="name" placeholder="Prénom ou pseudonyme" required />}
        <input autoComplete="email" className="min-h-11 rounded-[9px_6px_11px_7px] border-[1.5px] border-[#263532] bg-transparent px-3 text-sm" name="email" placeholder="Adresse e-mail" required type="email" />
        <input autoComplete={mode === "sign-up" ? "new-password" : "current-password"} className="min-h-11 rounded-[9px_6px_11px_7px] border-[1.5px] border-[#263532] bg-transparent px-3 text-sm" minLength={10} name="password" placeholder="Mot de passe · 10 caractères minimum" required type="password" />
        {mode === "sign-in" && (
          <button className="justify-self-end border-0 bg-transparent p-0 text-xs font-extrabold text-[#195e70] underline decoration-dashed underline-offset-4" onClick={() => setMode("forgot-password")} type="button">
            Mot de passe oublié ?
          </button>
        )}
        {error && <p className="m-0 text-xs font-bold text-[#9f291e]">{error}</p>}
        <button className="min-h-11 rounded-[9px_6px_11px_7px] border-2 border-[#172322] bg-[#172322] px-3 text-sm font-black text-white" disabled={submitting} type="submit">
          {submitting ? "Un instant…" : mode === "sign-up" ? "Créer mon compte" : "Se connecter"}
        </button>
      </form>
    </div>
  );
}
