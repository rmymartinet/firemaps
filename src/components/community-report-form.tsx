"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import {
  mediaKindFromUrl,
  type CommunityCategory,
} from "@/domain/community-report";
import { useLanguage } from "@/i18n/language-context";

const categoryLabels: Record<CommunityCategory, string> = {
  flames: "Flammes visibles",
  smoke: "Fumée",
  road: "Route fermée",
  response: "Intervention des secours",
  evacuation: "Évacuation ou confinement",
  other: "Autre observation",
};
const categoryLabelsEnglish: Record<CommunityCategory, string> = {
  flames: "Visible flames",
  smoke: "Smoke",
  road: "Road closed",
  response: "Emergency response",
  evacuation: "Evacuation or shelter-in-place",
  other: "Other observation",
};
const categoryIcons: Record<CommunityCategory, string> = {
  evacuation: "↗",
  flames: "♨",
  other: "…",
  response: "+",
  road: "×",
  smoke: "≈",
};

function observedAreaSquareKm(points: Array<{ latitude: number; longitude: number }>): number {
  if (points.length < 3) return 0;
  const radius = 6_371;
  const averageLatitude = points.reduce((sum, point) => sum + point.latitude, 0) / points.length * Math.PI / 180;
  const projected = points.map((point) => ({
    x: radius * point.longitude * Math.PI / 180 * Math.cos(averageLatitude),
    y: radius * point.latitude * Math.PI / 180,
  }));
  return Math.abs(projected.reduce((sum, point, index) => {
    const next = projected[(index + 1) % projected.length];
    return sum + point.x * next.y - next.x * point.y;
  }, 0)) / 2;
}

export function CommunityReportForm({
  embedded = false,
  isAuthenticated = false,
  initialLocation,
  initialObservedZone = null,
  onAuthenticationRequired,
  onClose,
  onSaved,
}: {
  embedded?: boolean;
  isAuthenticated?: boolean;
  initialLocation?: { latitude: number; longitude: number; label: string };
  initialObservedZone?: Array<{ latitude: number; longitude: number }> | null;
  onAuthenticationRequired?: () => void;
  onClose?: () => void;
  onSaved?: () => void;
} = {}) {
  const { language, locale, tr } = useLanguage();
  const visibleCategoryLabels = language === "en" ? categoryLabelsEnglish : categoryLabels;
  const fieldClass = "my-3.5 grid gap-2 [&>label]:text-sm [&>label]:font-extrabold [&_input]:min-h-12 [&_input]:rounded-[10px_7px_12px_8px] [&_input]:border-[1.5px] [&_input]:border-[#263532] [&_input]:bg-transparent [&_input]:p-3 [&_input]:outline-offset-2 [&_textarea]:rounded-[9px_12px_8px_11px] [&_textarea]:border-[1.5px] [&_textarea]:border-[#263532] [&_textarea]:bg-transparent [&_textarea]:p-3 [&_textarea]:outline-offset-2";
  const secondaryButton = "inline-flex min-h-12 rotate-[-.2deg] items-center justify-center rounded-[10px_7px_12px_8px] border-[1.5px] border-[#263532] bg-transparent px-4 py-[13px] font-extrabold text-ink no-underline shadow-[2px_2px_0_rgba(23,35,34,.1)] disabled:cursor-wait disabled:opacity-60";
  const router = useRouter();
  const initialParameters = typeof window === "undefined" ? null : new URLSearchParams(window.location.search);
  const [category, setCategory] = useState<CommunityCategory>("smoke");
  const [description, setDescription] = useState("");
  const [latitude] = useState(() => initialLocation?.latitude.toFixed(6) ?? initialParameters?.get("lat") ?? "");
  const [longitude] = useState(() => initialLocation?.longitude.toFixed(6) ?? initialParameters?.get("lon") ?? "");
  const [capturedAt] = useState(() => {
    const local = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
  });
  const [socialUrl] = useState(() => {
    if (typeof window === "undefined") return "";
    const video = initialParameters?.get("video") ?? "";
    return mediaKindFromUrl(video) !== "none" ? video : "";
  });
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [directionType, setDirectionType] = useState<"smoke" | "spread" | null>(null);
  const [directionDegrees, setDirectionDegrees] = useState<number | null>(null);
  const [observedZone] = useState(initialObservedZone);
  const [showDetails, setShowDetails] = useState(Boolean(initialObservedZone?.length) || !embedded);
  const [showDescription, setShowDescription] = useState(false);
  const [showDirection, setShowDirection] = useState(false);
  const [phase, setPhase] = useState<"report" | "enrich">("report");
  const [savedReportId, setSavedReportId] = useState<string | null>(null);
  const [largeAreaConfirmed, setLargeAreaConfirmed] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);

  const loadMedia = (file: File | undefined) => {
    setMediaFile(null);
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setError(tr("Choisissez une photo ou une vidéo.", "Choose a photo or video."));
      return;
    }
    const maxBytes = file.type.startsWith("video/") ? 50_000_000 : 15_000_000;
    if (file.size > maxBytes) {
      setError(file.type.startsWith("video/") ? tr("La vidéo doit peser moins de 50 Mo.", "The video must be under 50 MB.") : tr("La photo doit peser moins de 15 Mo.", "The photo must be under 15 MB."));
      return;
    }
    setMediaFile(file);
    setError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!isAuthenticated) {
      setStatus("idle");
      onAuthenticationRequired?.();
      return;
    }
    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);
    if (!Number.isFinite(parsedLatitude) || parsedLatitude < -90 || parsedLatitude > 90
      || !Number.isFinite(parsedLongitude) || parsedLongitude < -180 || parsedLongitude > 180) {
      setError(tr("Renseignez une position valide.", "Enter a valid location."));
      return;
    }
    const trimmedUrl = socialUrl.trim();
    if (trimmedUrl && mediaKindFromUrl(trimmedUrl) === "none") {
      setError(tr("Le lien vidéo doit être une URL publique valide.", "The video link must be a valid public URL."));
      return;
    }
    const captureDate = new Date(capturedAt);
    if (!Number.isFinite(captureDate.getTime()) || captureDate.getTime() > Date.now() + 5 * 60_000) {
      setError(tr("La date de l’observation est invalide ou située dans le futur.", "The observation date is invalid or in the future."));
      return;
    }
    const observedArea = observedZone ? observedAreaSquareKm(observedZone) : 0;
    if (observedArea >= 1_000 && !largeAreaConfirmed) {
      setLargeAreaConfirmed(true);
      setError(tr(
        `Cette zone couvre environ ${observedArea.toLocaleString(locale, { maximumFractionDigits: 1 })} km². Vérifiez le tracé, puis appuyez une seconde fois sur Publier pour confirmer.`,
        `This area covers approximately ${observedArea.toLocaleString(locale, { maximumFractionDigits: 1 })} km². Check the outline, then press Publish again to confirm.`,
      ));
      return;
    }
    setStatus("saving");
    try {
      const isEnrichment = phase === "enrich" && Boolean(savedReportId);
      let media: {
        contentType?: string;
        key?: string;
        kind: "photo" | "video" | "tiktok" | "instagram" | "video-link";
        sizeBytes?: number;
        url: string;
      } | null = isEnrichment && trimmedUrl ? { kind: mediaKindFromUrl(trimmedUrl) as "tiktok" | "instagram" | "video-link", url: trimmedUrl } : null;
      if (isEnrichment && mediaFile) {
        const signingResponse = await fetch("/api/community/media/upload", {
          body: JSON.stringify({ contentType: mediaFile.type, sizeBytes: mediaFile.size }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        const signing = await signingResponse.json();
        if (!signingResponse.ok) throw new Error(signing.message || tr("L’envoi du média est indisponible.", "Media upload is unavailable."));
        let uploadResponse: Response;
        try {
          uploadResponse = await fetch(signing.uploadUrl, {
            body: mediaFile,
            headers: { "Content-Type": mediaFile.type },
            method: "PUT",
          });
        } catch {
          throw new Error(tr("R2 a bloqué l’envoi. Vérifiez que le domaine actuel est autorisé dans la politique CORS du bucket.", "R2 blocked the upload. Check that the current domain is allowed by the bucket CORS policy."));
        }
        if (!uploadResponse.ok) throw new Error(tr("La photo ou la vidéo n’a pas pu être envoyée.", "The photo or video could not be uploaded."));
        media = {
          contentType: mediaFile.type,
          key: signing.key,
          kind: mediaFile.type.startsWith("video/") ? "video" : "photo",
          sizeBytes: mediaFile.size,
          url: signing.publicUrl,
        };
      }
      const response = await fetch(isEnrichment ? `/api/community/reports/${savedReportId}` : "/api/community/reports", {
        body: JSON.stringify({
          accuracyMeters: null,
          capturedAt: captureDate.toISOString(),
          category,
          description: isEnrichment ? description.trim() : "",
          directionDegrees: isEnrichment ? directionDegrees : null,
          directionType: isEnrichment ? directionType : null,
          latitude: parsedLatitude,
          longitude: parsedLongitude,
          media,
          observedZone,
        }),
        headers: { "Content-Type": "application/json" },
        method: isEnrichment ? "PATCH" : "POST",
      });
      if (response.status === 401) {
        setStatus("idle");
        onAuthenticationRequired?.();
        return;
      }
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || tr("Le signalement n’a pas pu être publié.", "The report could not be published."));
      setStatus("saved");
      if (isEnrichment) {
        window.setTimeout(() => {
          if (onSaved) onSaved();
          else router.push("/");
        }, 250);
      } else {
        setSavedReportId(payload.report.id);
      }
    } catch (submissionError) {
      setError(submissionError instanceof Error ? submissionError.message : tr("Le signalement n’a pas pu être publié.", "The report could not be published."));
      setStatus("idle");
    }
  };

  return (
    <div className={embedded ? "relative" : "mx-auto max-w-[900px] px-4 pt-[18px] pb-[30px]"}>
      {embedded && onClose && <button aria-label={tr("Fermer le signalement", "Close report")} className="absolute top-0 right-3.5 z-2 flex size-9 rotate-[.8deg] cursor-pointer items-center justify-center rounded-[51%_49%_46%_54%] border-[1.5px] border-[#172322] bg-white text-2xl text-ink shadow-[1px_1px_0_rgba(23,35,34,.25)]" onClick={onClose} type="button">×</button>}
      {phase === "report" && <small className="font-black tracking-[.12em] uppercase">{tr("Signalement", "Report")}</small>}
      <h1 className={embedded ? "mr-10 mt-0 mb-1 text-[1.35rem] font-bold" : "mt-0 mb-1 text-[1.65rem] font-bold"}>
        {phase === "enrich" ? tr("Ajouter une preuve", "Add evidence") : embedded ? tr("Signaler une observation", "Report an observation") : tr("Partager une observation", "Share an observation")}
      </h1>
      {phase === "report" && <p className="m-0 text-xs font-bold text-muted">{tr("Un choix suffit · environ 5 secondes", "One choice is enough · about 5 seconds")}</p>}
      <p className="mt-3 mb-4 rotate-[-.15deg] rounded-[13px_10px_15px_11px] border-[1.5px] border-dashed border-[#b92f22] bg-[#fff1e8] px-3 py-2 text-xs leading-[1.4] text-[#692416] shadow-[2px_2px_0_rgba(95,28,21,.12)]">
        {embedded
          ? <><strong>{tr("Restez à distance.", "Keep your distance.")}</strong> {tr("Urgence : 112 ou 18.", "Emergency: call 112.")}</>
          : <><strong>{tr("Ne vous déplacez jamais et ne vous exposez jamais pour filmer.", "Never travel toward danger or put yourself at risk to record it.")}</strong>{" "}{tr("En cas de départ de feu ou de danger immédiat, appelez d’abord le 18 ou le 112.", "If a fire starts or there is immediate danger, call emergency services first.")}</>}
      </p>
      <form className="my-3 grid gap-4 bg-transparent" onSubmit={submit}>
        {savedReportId && phase === "report" ? (
          <section className="grid gap-4 rounded-[13px_10px_15px_11px] border-[1.5px] border-dashed border-[#17643d] p-4">
            <div>
              <span className="text-[.7rem] font-black tracking-[.12em] text-[#17643d] uppercase">{tr("✓ Signalement publié", "✓ Report published")}</span>
              <h2 className="mt-2 mb-1 text-lg">{tr(`${categoryLabels[category]} est maintenant visible`, `${categoryLabelsEnglish[category]} is now visible`)}</h2>
              <p className="m-0 text-sm text-muted">{tr("Tu peux terminer ici. Une photo ou une précision aidera la communauté, mais ce n’est pas obligatoire.", "You can finish here. A photo or extra detail can help the community, but it is optional.")}</p>
            </div>
            <button className="min-h-12 rounded-[10px_7px_12px_8px] border-[1.5px] border-[#172322] bg-[#172322] px-4 font-extrabold text-white" onClick={() => { setPhase("enrich"); setShowDetails(true); setStatus("idle"); }} type="button">
              ＋ {tr("Ajouter une photo ou une précision", "Add a photo or detail")}
            </button>
            <button className={secondaryButton} onClick={() => { if (onSaved) onSaved(); else router.push("/"); }} type="button">{tr("Terminer", "Finish")}</button>
          </section>
        ) : <>
        {phase === "report" && <section className="grid gap-3 rounded-[13px_10px_15px_11px] border-[1.5px] border-dashed border-[#263532] p-3">
        <div>
          <span className="text-[.7rem] font-black tracking-[.12em] uppercase">{tr("Observation", "Observation")}</span>
          <h2 className="mt-2 mb-0 text-base">{tr("Que vois-tu ?", "What can you see?")}</h2>
          <p className="mt-1 mb-0 text-xs text-muted">{tr("Choisis ce qui correspond le mieux.", "Choose the closest match.")}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(visibleCategoryLabels) as Array<[CommunityCategory, string]>).map(([value, label]) => (
            <button
              aria-pressed={category === value}
              className={`flex min-h-[52px] cursor-pointer items-center gap-2 rounded-[10px_7px_12px_8px] border-[1.5px] border-[#263532] p-2.5 text-left text-sm font-bold ${category === value ? "bg-[#172322] text-white" : "bg-transparent text-ink"}`}
              key={value}
              onClick={() => setCategory(value)}
              type="button"
            >
              <span aria-hidden className="grid size-6 shrink-0 place-items-center text-base">{categoryIcons[value]}</span>
              <span className="text-sm">{label}</span>
            </button>
          ))}
        </div>
        </section>}

        {phase === "enrich" && <>
        {showDetails && <section className="grid gap-5 p-1">
        <div className="grid gap-2">
          <label className="text-sm font-extrabold" htmlFor="media">{tr("Photo ou vidéo", "Photo or video")} <span className="font-normal text-muted">· {tr("facultatif", "optional")}</span></label>
          <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-[11px_8px_13px_9px] border-[1.5px] border-[#172322] bg-white px-3 py-2 font-extrabold text-[#172322] shadow-[2px_2px_0_rgba(23,35,34,.1)]" htmlFor="media">
            <span aria-hidden className="text-lg">＋</span>
            <span>{tr("Ajouter une photo ou une vidéo", "Add a photo or video")}</span>
          </label>
          <input className="absolute size-px overflow-hidden opacity-0" accept="image/*,video/*" capture="environment" id="media" onChange={(event) => loadMedia(event.target.files?.[0])} type="file" />
          {mediaFile && <small className="block font-extrabold text-[#17643d]">✓ {mediaFile.name}</small>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button aria-expanded={showDescription} className={`min-h-12 rounded-[9px_6px_11px_7px] border-[1.5px] border-[#263532] px-2 text-sm font-extrabold shadow-[1px_1px_0_rgba(23,35,34,.12)] ${showDescription ? "bg-[#172322] text-white" : "bg-white text-[#172322]"}`} onClick={() => setShowDescription((value) => !value)} type="button">＋ {tr("Description", "Description")}</button>
          <button aria-expanded={showDirection} className={`min-h-12 rounded-[7px_11px_6px_10px] border-[1.5px] border-[#263532] px-2 text-sm font-extrabold shadow-[1px_1px_0_rgba(23,35,34,.12)] ${showDirection ? "bg-[#172322] text-white" : "bg-white text-[#172322]"}`} onClick={() => setShowDirection((value) => !value)} type="button">＋ {tr("Direction", "Direction")}</button>
        </div>

        {showDirection && <div className="grid gap-2">
          <label className="text-sm font-extrabold">{tr("Indiquer une direction", "Add a direction")} <span className="font-normal text-muted">· {tr("facultatif", "optional")}</span></label>
          <div className="grid grid-cols-2 gap-2">
            <button aria-pressed={directionType === "smoke"} className={`min-h-11 rounded-[10px_7px_12px_8px] border-[1.5px] bg-transparent px-2 text-sm font-bold ${directionType === "smoke" ? "border-[#b92f22] text-[#8b2118]" : "border-[#263532]"}`} onClick={() => setDirectionType((current) => current === "smoke" ? null : "smoke")} type="button">{tr("Direction de la fumée", "Smoke direction")}</button>
            <button aria-pressed={directionType === "spread"} className={`min-h-11 rounded-[10px_7px_12px_8px] border-[1.5px] bg-transparent px-2 text-sm font-bold ${directionType === "spread" ? "border-[#b92f22] text-[#8b2118]" : "border-[#263532]"}`} onClick={() => setDirectionType((current) => current === "spread" ? null : "spread")} type="button">{tr("Progression observée", "Observed spread")}</button>
          </div>
          {directionType && (
            <div className="grid grid-cols-4 gap-1.5">
              {[
                ["N", 0], ["NE", 45], ["E", 90], ["SE", 135],
                ["S", 180], ["SO", 225], ["O", 270], ["NO", 315],
              ].map(([label, degrees]) => (
                <button
                  aria-pressed={directionDegrees === degrees}
                  className={`min-h-10 rounded-[8px_6px_9px_7px] border-[1.5px] text-xs font-black ${directionDegrees === degrees ? "border-[#172322] bg-[#172322] text-white" : "border-[#263532] bg-white"}`}
                  key={label}
                  onClick={() => setDirectionDegrees(Number(degrees))}
                  type="button"
                >
                  {label} <span aria-hidden className="inline-block" style={{ transform: `rotate(${Number(degrees) - 45}deg)` }}>↗</span>
                </button>
              ))}
            </div>
          )}
          {directionType && directionDegrees === null && <small className="font-bold text-[#8b2118]">{tr("Choisis une direction approximative.", "Choose an approximate direction.")}</small>}
        </div>}
        </section>}

        {showDescription && (
          <section className="grid gap-3.5">
            <div className={fieldClass}>
              <label htmlFor="description">{tr("Description facultative", "Optional description")}</label>
              <textarea id="description" maxLength={500} onChange={(event) => setDescription(event.target.value)} placeholder={tr("Ce que vous observez, sans vous approcher du danger", "What you can observe without approaching danger")} rows={3} value={description} />
            </div>
          </section>
        )}
        </>}
        {error && <p className="m-0 font-bold text-[#8b2118]" role="alert">{error}</p>}
        {status === "saved" && phase === "enrich" && <p className="m-0 font-extrabold text-[#17643d]" role="status">{tr("Précisions enregistrées. Retour à la carte…", "Details saved. Returning to the map…")}</p>}
        <button className="inline-flex min-h-12 w-full cursor-pointer justify-center rounded-[10px_7px_12px_8px] border-[1.5px] border-[#172322] bg-[#172322] px-4 py-3 font-extrabold text-white disabled:cursor-wait disabled:opacity-60" disabled={status === "saving" || status === "saved" || Boolean(directionType && directionDegrees === null)} type="submit">
          {status === "saving" ? tr("Enregistrement…", "Saving…") : phase === "enrich" ? tr("Enregistrer les informations", "Save details") : tr(`Publier « ${categoryLabels[category]} » ici`, `Publish “${categoryLabelsEnglish[category]}” here`)}
        </button>
        {phase === "enrich" && <button className={secondaryButton} onClick={() => { if (onSaved) onSaved(); else router.push("/"); }} type="button">{tr("Passer cette étape", "Skip this step")}</button>}
        </>}
      </form>
    </div>
  );
}
