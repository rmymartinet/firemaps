"use client";
import { useState } from "react";
export function EmergencyLocation() {
  const [message, setMessage] = useState("Coordonnées non demandées.");
  const locate = () => {
    if (!navigator.geolocation) return setMessage("Géolocalisation indisponible sur cet appareil.");
    setMessage("Recherche de votre position…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setMessage(`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)} (précision ≈ ${Math.round(coords.accuracy)} m)`),
      () => setMessage("Position non disponible. Indiquez votre adresse ou des repères aux secours."),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  };
  return (
    <section className="my-3 rounded-2xl border border-line bg-surface p-4">
      <h2 className="mb-2 font-bold">Votre position</h2><p aria-live="polite">{message}</p>
      <button className="inline-flex min-h-12 cursor-pointer justify-center rounded-xl border-0 bg-[#e9e7df] px-4 py-[13px] font-extrabold text-ink" onClick={locate}>Afficher mes coordonnées GPS</button>
    </section>
  );
}
