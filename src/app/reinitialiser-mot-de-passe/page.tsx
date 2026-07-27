import Image from "next/image";
import Link from "next/link";
import { PasswordResetForm } from "@/components/password-reset-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; token?: string }>;
}) {
  const parameters = await searchParams;
  const token = parameters.token ?? null;
  return (
    <main className="grid min-h-dvh place-items-center bg-white p-5 text-[#172322]">
      <section className="grid w-full max-w-[430px] gap-7 rounded-[18px_14px_20px_16px] border-[1.7px] border-[#172322] bg-white p-6 shadow-[3px_3px_0_rgba(23,35,34,.14)]">
        <Link className="justify-self-center" href="/"><Image alt="Firemaps" height={80} priority src="/logo.png" width={180} /></Link>
        <PasswordResetForm invalidToken={Boolean(parameters.error) || !token} token={token} />
      </section>
    </main>
  );
}
