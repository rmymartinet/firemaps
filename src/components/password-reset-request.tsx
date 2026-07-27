"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { useLanguage } from "@/i18n/language-context";

export function PasswordResetRequest({ onBack }: { onBack?: () => void }) {
  const { tr } = useLanguage();
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
      setError(result.error.message || tr("Impossible d’envoyer l’e-mail.", "Unable to send the email."));
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="grid gap-4 text-center">
        <h1 className="m-0 text-2xl font-black">{tr("Vérifie tes e-mails", "Check your email")}</h1>
        <p className="m-0 text-sm leading-6 text-[#52615e]">{tr("Si cette adresse correspond à un compte, un lien valable une heure vient d’être envoyé.", "If this address matches an account, a link valid for one hour has been sent.")}</p>
        {onBack
          ? <button className="rounded-[10px_7px_12px_8px] border-[1.5px] border-[#172322] bg-white px-4 py-3 text-sm font-black text-[#172322]" onClick={onBack} type="button">{tr("Retour à la connexion", "Back to sign in")}</button>
          : <Link className="rounded-[10px_7px_12px_8px] border-[1.5px] border-[#172322] px-4 py-3 text-sm font-black text-[#172322] no-underline" href="/">{tr("Retour à la carte", "Back to the map")}</Link>}
      </div>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div>
        <p className="m-0 text-[.68rem] font-black tracking-[.16em] uppercase">{tr("Compte", "Account")}</p>
        <h1 className="mt-1 mb-2 text-2xl font-black">{tr("Mot de passe oublié", "Forgot password")}</h1>
        <p className="m-0 text-sm leading-6 text-[#52615e]">{tr("Indique ton adresse e-mail pour recevoir un lien sécurisé.", "Enter your email address to receive a secure link.")}</p>
      </div>
      <input autoComplete="email" className="min-h-12 rounded-[9px_6px_11px_7px] border-[1.5px] border-[#263532] bg-white px-3 text-sm" name="email" placeholder={tr("Adresse e-mail", "Email address")} required type="email" />
      {error && <p className="m-0 text-xs font-bold text-[#9f291e]">{error}</p>}
      <button className="min-h-12 rounded-[9px_6px_11px_7px] border-2 border-[#172322] bg-[#172322] px-4 text-sm font-black text-white" disabled={submitting} type="submit">
        {submitting ? tr("Envoi…", "Sending…") : tr("Recevoir le lien", "Send reset link")}
      </button>
      {onBack
        ? <button className="justify-self-center border-0 bg-transparent text-sm font-extrabold text-[#195e70] underline decoration-dashed underline-offset-4" onClick={onBack} type="button">{tr("Retour à la connexion", "Back to sign in")}</button>
        : <Link className="text-center text-sm font-extrabold text-[#195e70] underline decoration-dashed underline-offset-4" href="/">{tr("Retour à la carte", "Back to the map")}</Link>}
    </form>
  );
}
