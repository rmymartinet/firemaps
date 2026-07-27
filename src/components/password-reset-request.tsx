"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function PasswordResetRequest({ onBack }: { onBack?: () => void }) {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const result = await authClient.requestPasswordReset({
      email,
      redirectTo: `${window.location.origin}/reinitialiser-mot-de-passe`,
    });
    setSubmitting(false);
    if (result.error) {
      setError(result.error.message || "Impossible d’envoyer l’e-mail.");
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="grid gap-4 text-center">
        <h1 className="m-0 text-2xl font-black">Vérifie tes e-mails</h1>
        <p className="m-0 text-sm leading-6 text-[#52615e]">Si cette adresse correspond à un compte, un lien valable une heure vient d’être envoyé.</p>
        {onBack
          ? <button className="rounded-[10px_7px_12px_8px] border-[1.5px] border-[#172322] bg-white px-4 py-3 text-sm font-black text-[#172322]" onClick={onBack} type="button">Retour à la connexion</button>
          : <Link className="rounded-[10px_7px_12px_8px] border-[1.5px] border-[#172322] px-4 py-3 text-sm font-black text-[#172322] no-underline" href="/">Retour à la carte</Link>}
      </div>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div>
        <p className="m-0 text-[.68rem] font-black tracking-[.16em] uppercase">Compte</p>
        <h1 className="mt-1 mb-2 text-2xl font-black">Mot de passe oublié</h1>
        <p className="m-0 text-sm leading-6 text-[#52615e]">Indique ton adresse e-mail pour recevoir un lien sécurisé.</p>
      </div>
      <input autoComplete="email" className="min-h-12 rounded-[9px_6px_11px_7px] border-[1.5px] border-[#263532] bg-white px-3 text-sm" name="email" placeholder="Adresse e-mail" required type="email" />
      {error && <p className="m-0 text-xs font-bold text-[#9f291e]">{error}</p>}
      <button className="min-h-12 rounded-[9px_6px_11px_7px] border-2 border-[#172322] bg-[#172322] px-4 text-sm font-black text-white" disabled={submitting} type="submit">
        {submitting ? "Envoi…" : "Recevoir le lien"}
      </button>
      {onBack
        ? <button className="justify-self-center border-0 bg-transparent text-sm font-extrabold text-[#195e70] underline decoration-dashed underline-offset-4" onClick={onBack} type="button">Retour à la connexion</button>
        : <Link className="text-center text-sm font-extrabold text-[#195e70] underline decoration-dashed underline-offset-4" href="/">Retour à la carte</Link>}
    </form>
  );
}
