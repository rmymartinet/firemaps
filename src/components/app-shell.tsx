import Link from "next/link";
import type { ReactNode } from "react";

const navigation = [
  { href: "/", icon: "⌖", label: "Carte" },
  { href: "/videos", icon: "▶", label: "Vidéos" },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell min-h-dvh pb-[calc(72px+env(safe-area-inset-bottom))]">
      <header className="topbar sticky top-0 z-1000 flex h-[58px] items-center justify-between border-b border-line bg-[rgba(255,253,248,.96)] px-4">
        <Link className="flex items-center gap-2 text-[1.12rem] font-extrabold no-underline" href="/">
          <span className="inline-block size-5 rotate-45 rounded-[50%_50%_46%_54%] bg-fire" aria-hidden />
          Sentinel
        </Link>
        <a className="rounded-full bg-[#a9261b] px-[13px] py-2.5 text-[.86rem] font-extrabold text-white no-underline" href="tel:112">Je suis en danger</a>
      </header>
      <main>{children}</main>
      <nav className="bottom-nav fixed bottom-0 z-1000 grid min-h-[72px] w-full grid-cols-2 border-t border-line bg-[rgba(255,253,248,.97)] pb-[env(safe-area-inset-bottom)]" aria-label="Navigation principale">
        {navigation.map((item) => (
          <Link className="flex flex-col items-center justify-center gap-1.5 text-[.72rem] font-bold no-underline" href={item.href} key={item.href}>
            <span className="text-xl" aria-hidden>{item.icon}</span>{item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
