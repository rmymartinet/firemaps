"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { useLanguage } from "@/i18n/language-context";

export function PasswordResetForm({ invalidToken, token }: { invalidToken: boolean; token: string | null }) {
  const { tr } = useLanguage();
  const [error, setError] = useState<string | null>(null);
  const [complete, setComplete] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    setError(null);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");
    if (password !== confirmation) {
      setError(tr("Les deux mots de passe ne correspondent pas.", "The passwords do not match."));
      return;
    }
    setSubmitting(true);
    const result = await authClient.resetPassword({ newPassword: password, token });
    setSubmitting(false);
    if (result.error) {
      setError(result.error.message || tr("Ce lien est invalide ou a expiré.", "This link is invalid or has expired."));
      return;
    }
    setComplete(true);
  };

  if (complete) {
    return (
      <div className="grid gap-4 text-center">
        <h1 className="m-0 text-2xl font-black">{tr("Mot de passe modifié", "Password updated")}</h1>
        <p className="m-0 text-sm leading-6 text-[#52615e]">{tr("Tu peux maintenant te reconnecter à Firemaps.", "You can now sign back in to Firemaps.")}</p>
        <Link className="rounded-[10px_7px_12px_8px] border-2 border-[#172322] bg-[#172322] px-4 py-3 text-center text-sm font-black !text-white no-underline" href="/">{tr("Se connecter", "Sign in")}</Link>
      </div>
    );
  }

  if (invalidToken) {
    return (
      <div className="grid gap-4 text-center">
        <h1 className="m-0 text-2xl font-black">{tr("Lien invalide", "Invalid link")}</h1>
        <p className="m-0 text-sm leading-6 text-[#52615e]">{tr("Ce lien a expiré ou a déjà été utilisé.", "This link has expired or has already been used.")}</p>
        <Link className="rounded-[10px_7px_12px_8px] border-[1.5px] border-[#172322] px-4 py-3 text-sm font-black text-[#172322] no-underline" href="/mot-de-passe-oublie">{tr("Demander un nouveau lien", "Request a new link")}</Link>
        <Link className="text-sm font-extrabold text-[#195e70] underline decoration-dashed underline-offset-4" href="/">{tr("Retour à la carte", "Back to the map")}</Link>
      </div>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div>
        <p className="m-0 text-[.68rem] font-black tracking-[.16em] uppercase">{tr("Sécurité", "Security")}</p>
        <h1 className="mt-1 mb-2 text-2xl font-black">{tr("Nouveau mot de passe", "New password")}</h1>
        <p className="m-0 text-sm leading-6 text-[#52615e]">{tr("Choisis au moins 10 caractères.", "Use at least 10 characters.")}</p>
      </div>
      <input autoComplete="new-password" className="min-h-12 rounded-[9px_6px_11px_7px] border-[1.5px] border-[#263532] bg-white px-3 text-sm" minLength={10} name="password" placeholder={tr("Nouveau mot de passe", "New password")} required type="password" />
      <input autoComplete="new-password" className="min-h-12 rounded-[9px_6px_11px_7px] border-[1.5px] border-[#263532] bg-white px-3 text-sm" minLength={10} name="confirmation" placeholder={tr("Confirmer le mot de passe", "Confirm password")} required type="password" />
      {error && <p className="m-0 text-xs font-bold text-[#9f291e]">{error}</p>}
      <button className="min-h-12 rounded-[9px_6px_11px_7px] border-2 border-[#172322] bg-[#172322] px-4 text-sm font-black text-white" disabled={submitting || !token} type="submit">
        {submitting ? tr("Modification…", "Updating…") : tr("Modifier mon mot de passe", "Update my password")}
      </button>
    </form>
  );
}
