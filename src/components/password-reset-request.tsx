"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { useLanguage } from "@/i18n/language-context";

export function PasswordResetRequest({ onBack }: { onBack?: () => void }) {
  const { t } = useLanguage();
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
      setError(result.error.message || t("passwordResetRequest.unableToSendTheEmail"));
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <div className="grid gap-4 text-center">
        <h1 className="m-0 text-2xl font-black">{t("passwordResetRequest.checkYourEmail")}</h1>
        <p className="m-0 text-sm leading-6 text-[#52615e]">{t("passwordResetRequest.ifThisAddressMatchesAnAccountALink")}</p>
        {onBack
          ? <button className="rounded-[10px_7px_12px_8px] border-[1.5px] border-[#172322] bg-white px-4 py-3 text-sm font-black text-[#172322]" onClick={onBack} type="button">{t("passwordResetRequest.backToSignIn")}</button>
          : <Link className="rounded-[10px_7px_12px_8px] border-[1.5px] border-[#172322] px-4 py-3 text-sm font-black text-[#172322] no-underline" href="/">{t("passwordResetRequest.backToTheMap")}</Link>}
      </div>
    );
  }

  return (
    <form className="grid gap-4" onSubmit={submit}>
      <div>
        <p className="m-0 text-[.68rem] font-black tracking-[.16em] uppercase">{t("passwordResetRequest.account")}</p>
        <h1 className="mt-1 mb-2 text-2xl font-black">{t("passwordResetRequest.forgotPassword")}</h1>
        <p className="m-0 text-sm leading-6 text-[#52615e]">{t("passwordResetRequest.enterYourEmailAddressToReceiveASecure")}</p>
      </div>
      <input autoComplete="email" className="min-h-12 rounded-[9px_6px_11px_7px] border-[1.5px] border-[#263532] bg-white px-3 text-sm" name="email" placeholder={t("passwordResetRequest.emailAddress")} required type="email" />
      {error && <p className="m-0 text-xs font-bold text-[#9f291e]">{error}</p>}
      <button className="min-h-12 rounded-[9px_6px_11px_7px] border-2 border-[#172322] bg-[#172322] px-4 text-sm font-black text-white" disabled={submitting} type="submit">
        {submitting ? t("passwordResetRequest.sending") : t("passwordResetRequest.sendResetLink")}
      </button>
      {onBack
        ? <button className="justify-self-center border-0 bg-transparent text-sm font-extrabold text-[#195e70] underline decoration-dashed underline-offset-4" onClick={onBack} type="button">{t("passwordResetRequest.backToSignIn")}</button>
        : <Link className="text-center text-sm font-extrabold text-[#195e70] underline decoration-dashed underline-offset-4" href="/">{t("passwordResetRequest.backToTheMap")}</Link>}
    </form>
  );
}
