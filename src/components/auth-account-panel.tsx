"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { PasswordResetRequest } from "@/components/password-reset-request";
import { useLanguage } from "@/i18n/language-context";

type AuthMode = "forgot-password" | "sign-in" | "sign-up";

export function AuthAccountPanel({ onAuthenticated }: { onAuthenticated?: () => void } = {}) {
  const { t } = useLanguage();
  const { data: session, isPending } = authClient.useSession();
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [verificationEmailStatus, setVerificationEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  const resendVerificationEmail = async () => {
    if (!session?.user) return;
    setVerificationEmailStatus("sending");
    const result = await authClient.sendVerificationEmail({ email: session.user.email });
    setVerificationEmailStatus(result.error ? "error" : "sent");
  };

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

    if (result.error) {
      setError(result.error.message || t("authAccountPanel.signInFailed"));
    } else {
      onAuthenticated?.();
    }
    setSubmitting(false);
  };

  if (isPending) return <p className="m-0 text-xs text-muted">{t("authAccountPanel.checkingYourAccount")}</p>;

  if (session?.user) {
    return (
      <div className="grid gap-2">
        <div className="rounded-[10px_7px_12px_8px] border-[1.5px] border-[#263532] p-3">
          <strong className="block text-sm">{session.user.name}</strong>
          <small className="text-muted">{session.user.email}</small>
        </div>
        {!session.user.emailVerified && (
          <div className="grid gap-1.5 rounded-[10px_7px_12px_8px] border-[1.5px] border-[#9f291e] bg-[#9f291e]/5 p-3">
            <p className="m-0 text-xs font-bold text-[#9f291e]">{t("authAccountPanel.emailNotVerified")}</p>
            <button
              className="justify-self-start border-0 bg-transparent p-0 text-xs font-extrabold text-[#195e70] underline decoration-dashed underline-offset-4 disabled:opacity-60"
              disabled={verificationEmailStatus === "sending" || verificationEmailStatus === "sent"}
              onClick={resendVerificationEmail}
              type="button"
            >
              {verificationEmailStatus === "sending"
                ? t("authAccountPanel.pleaseWait")
                : verificationEmailStatus === "sent"
                  ? t("authAccountPanel.verificationEmailSent")
                  : t("authAccountPanel.resendVerificationEmail")}
            </button>
            {verificationEmailStatus === "error" && (
              <p className="m-0 text-xs font-bold text-[#9f291e]">{t("authAccountPanel.verificationEmailFailed")}</p>
            )}
          </div>
        )}
        <button
          className="min-h-10 rounded-[9px_6px_11px_7px] border-[1.5px] border-[#263532] bg-transparent px-3 text-sm font-extrabold"
          onClick={() => authClient.signOut()}
          type="button"
        >
          {t("authAccountPanel.signOut")}
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
        <button className={`min-h-9 rounded-[8px_6px_9px_7px] border-0 text-xs font-extrabold ${mode === "sign-in" ? "bg-[#172322] text-white" : "bg-transparent"}`} onClick={() => setMode("sign-in")} type="button">{t("authAccountPanel.signIn")}</button>
        <button className={`min-h-9 rounded-[8px_6px_9px_7px] border-0 text-xs font-extrabold ${mode === "sign-up" ? "bg-[#172322] text-white" : "bg-transparent"}`} onClick={() => setMode("sign-up")} type="button">{t("authAccountPanel.createAccount")}</button>
      </div>
      <form className="grid gap-2" onSubmit={submit}>
        {mode === "sign-up" && <input className="min-h-11 rounded-[9px_6px_11px_7px] border-[1.5px] border-[#263532] bg-transparent px-3 text-sm" name="name" placeholder={t("authAccountPanel.nameOrNickname")} required />}
        <input autoComplete="email" className="min-h-11 rounded-[9px_6px_11px_7px] border-[1.5px] border-[#263532] bg-transparent px-3 text-sm" name="email" placeholder={t("authAccountPanel.emailAddress")} required type="email" />
        <input autoComplete={mode === "sign-up" ? "new-password" : "current-password"} className="min-h-11 rounded-[9px_6px_11px_7px] border-[1.5px] border-[#263532] bg-transparent px-3 text-sm" minLength={10} name="password" placeholder={t("authAccountPanel.password10CharactersMinimum")} required type="password" />
        {mode === "sign-in" && (
          <button className="justify-self-end border-0 bg-transparent p-0 text-xs font-extrabold text-[#195e70] underline decoration-dashed underline-offset-4" onClick={() => setMode("forgot-password")} type="button">
            {t("authAccountPanel.forgotYourPassword")}
          </button>
        )}
        {error && <p className="m-0 text-xs font-bold text-[#9f291e]">{error}</p>}
        <button className="min-h-11 rounded-[9px_6px_11px_7px] border-2 border-[#172322] bg-[#172322] px-3 text-sm font-black text-white" disabled={submitting} type="submit">
          {submitting ? t("authAccountPanel.pleaseWait") : mode === "sign-up" ? t("authAccountPanel.createMyAccount") : t("authAccountPanel.signIn2")}
        </button>
      </form>
    </div>
  );
}
