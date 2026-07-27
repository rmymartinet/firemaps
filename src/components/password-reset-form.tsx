"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function PasswordResetForm({ invalidToken, token }: { invalidToken: boolean; token: string | null }) {
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
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setSubmitting(true);
    const result = await authClient.resetPassword({ newPassword: password, token });
    setSubmitting(false);
    if (result.error) {
      setError(result.error.message || "Ce lien est invalide ou a expiré.");
      return;
    }
    setComplete(true);
  };

  if (complete) {
    return (
      <div className="grid gap-4 text-center">
        <h1 className="m-0 text-2xl font-black">Mot de passe modifié</h1>
        <p className="m-0 text-sm leading-6 text-[#52615e]">Tu peux maintenant te reconnecter à Firemaps.</p>
        <Link className="rounded-[10px_7px_12px_8px] border-2 border-[#172322] bg-[#172322] px-4 py-3 text-center text-sm font-black !text-white no-underline" href="/">Se connecter</Link>
      </div>
    );
  }

  if (invalidToken) {
    return (
      <div className="grid gap-4 text-center">
        <h1 className="m-0 text-2xl font-black">Lien invalide</h1>
        <p className="m-0 text-sm leading-6 text-[#52615e]">Ce lien a expiré ou a déjà été utilisé.</p>
        <Link className="rounded-[10px_7px_12px_8px] border-[1.5px] border-[#172322] px-4 py-3 text-sm font-black text-[#172322] no-underline" href="/mot-de-passe-oublie">Demander un nouveau lien</Link>
        <Link className="text-sm font-extrabold text-[#195e70] underline decoration-dashed underline-offset-4" href="/">Retour à la carte</Link>
      </div>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div>
        <p className="m-0 text-[.68rem] font-black tracking-[.16em] uppercase">Sécurité</p>
        <h1 className="mt-1 mb-2 text-2xl font-black">Nouveau mot de passe</h1>
        <p className="m-0 text-sm leading-6 text-[#52615e]">Choisis au moins 10 caractères.</p>
      </div>
      <input autoComplete="new-password" className="min-h-12 rounded-[9px_6px_11px_7px] border-[1.5px] border-[#263532] bg-white px-3 text-sm" minLength={10} name="password" placeholder="Nouveau mot de passe" required type="password" />
      <input autoComplete="new-password" className="min-h-12 rounded-[9px_6px_11px_7px] border-[1.5px] border-[#263532] bg-white px-3 text-sm" minLength={10} name="confirmation" placeholder="Confirmer le mot de passe" required type="password" />
      {error && <p className="m-0 text-xs font-bold text-[#9f291e]">{error}</p>}
      <button className="min-h-12 rounded-[9px_6px_11px_7px] border-2 border-[#172322] bg-[#172322] px-4 text-sm font-black text-white" disabled={submitting || !token} type="submit">
        {submitting ? "Modification…" : "Modifier mon mot de passe"}
      </button>
    </form>
  );
}
