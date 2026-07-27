"use client";
import { useState } from "react";
import { useLanguage } from "@/i18n/language-context";
export function EmergencyLocation() {
  const { tr } = useLanguage();
  const [message, setMessage] = useState<string | null>(null);
  const locate = () => {
    if (!navigator.geolocation) return setMessage(tr("Géolocalisation indisponible sur cet appareil.", "Geolocation is unavailable on this device."));
    setMessage(tr("Recherche de votre position…", "Finding your location…"));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setMessage(`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)} (précision ≈ ${Math.round(coords.accuracy)} m)`),
      () => setMessage(tr("Position non disponible. Indiquez votre adresse ou des repères aux secours.", "Location unavailable. Give emergency services your address or nearby landmarks.")),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  };
  return (
    <section className="my-3 rounded-2xl border border-line bg-surface p-4">
      <h2 className="mb-2 font-bold">{tr("Votre position", "Your location")}</h2><p aria-live="polite">{message ?? tr("Coordonnées non demandées.", "Location not requested.")}</p>
      <button className="inline-flex min-h-12 cursor-pointer justify-center rounded-xl border-0 bg-[#e9e7df] px-4 py-[13px] font-extrabold text-ink" onClick={locate}>{tr("Afficher mes coordonnées GPS", "Show my GPS coordinates")}</button>
    </section>
  );
}
