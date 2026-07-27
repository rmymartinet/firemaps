import type { Metadata } from "next";
import { ServiceWorkerRegistration } from "@/components/service-worker-registration";
import { AppShell } from "@/components/app-shell";
import "./globals.css";
import "leaflet/dist/leaflet.css";

export const metadata: Metadata = {
  title: { default: "Sentinel", template: "%s · Sentinel" },
  description: "Informations sourcées et prudentes pendant les incendies.",
  applicationName: "Sentinel",
  appleWebApp: { capable: true, title: "Sentinel", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/favicon.png", sizes: "1024x1024", type: "image/png" }],
    shortcut: "/favicon.png",
    apple: [{ url: "/logo.png", sizes: "1024x1024", type: "image/png" }],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>
        <AppShell>{children}</AppShell>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
