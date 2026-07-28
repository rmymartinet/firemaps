"use client";
import { useState } from "react";
import { useLanguage } from "@/i18n/language-context";
export function EmergencyLocation() {
  const { t } = useLanguage();
  const [message, setMessage] = useState<string | null>(null);
  const locate = () => {
    if (!navigator.geolocation) return setMessage(t("emergencyLocation.geolocationIsUnavailableOnThisDevice"));
    setMessage(t("emergencyLocation.findingYourLocation"));
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setMessage(`${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)} (précision ≈ ${Math.round(coords.accuracy)} m)`),
      () => setMessage(t("emergencyLocation.locationUnavailableGiveEmergencyServicesYourAddressOr")),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  };
  return (
    <section className="my-3 rounded-2xl border border-line bg-surface p-4">
      <h2 className="mb-2 font-bold">{t("emergencyLocation.yourLocation")}</h2><p aria-live="polite">{message ?? t("emergencyLocation.locationNotRequested")}</p>
      <button className="inline-flex min-h-12 cursor-pointer justify-center rounded-xl border-0 bg-[#e9e7df] px-4 py-[13px] font-extrabold text-ink" onClick={locate}>{t("emergencyLocation.showMyGpsCoordinates")}</button>
    </section>
  );
}
