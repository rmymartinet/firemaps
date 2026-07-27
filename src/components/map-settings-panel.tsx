"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap } from "gsap";
import { useLanguage } from "@/i18n/language-context";

export type MapPreferences = {
  alertRadiusKm: 5 | 10 | 25 | 50;
  areaUnit: "ha" | "km2";
  coordinateFormat: "decimal" | "dms";
  distanceUnit: "km" | "miles";
  fontStyle: "standard" | "hand";
  haloIntensity: "low" | "normal" | "high";
  highContrast: boolean;
  hourFormat: "12" | "24";
  markerSize: "small" | "normal" | "large";
  playbackSpeed: "slow" | "normal" | "fast";
  timelineRangeDays: 1 | 3 | 7;
  reduceMotion: boolean;
  showTooltips: boolean;
  textSize: "normal" | "large";
  timeZone: "local" | "utc";
  windUnit: "kmh" | "ms" | "knots";
};

export const defaultMapPreferences: MapPreferences = {
  alertRadiusKm: 25,
  areaUnit: "ha",
  coordinateFormat: "dms",
  distanceUnit: "km",
  fontStyle: "standard",
  haloIntensity: "normal",
  highContrast: false,
  hourFormat: "24",
  markerSize: "normal",
  playbackSpeed: "normal",
  timelineRangeDays: 1,
  reduceMotion: false,
  showTooltips: true,
  textSize: "normal",
  timeZone: "local",
  windUnit: "kmh",
};

function Choice<T extends string | number>({
  onChange,
  options,
  value,
}: {
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
}) {
  return (
    <div className="grid grid-flow-col auto-cols-fr gap-1 rounded-[10px_7px_12px_8px] border-[1.5px] border-[#263532] p-1">
      {options.map((option) => (
        <button
          aria-pressed={value === option.value}
          className={`min-h-9 rounded-[8px_6px_9px_7px] border-0 px-2 py-1.5 text-xs font-extrabold ${
            value === option.value ? "bg-[#172322] text-white" : "bg-transparent text-[#172322]"
          }`}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Toggle({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      aria-pressed={checked}
      className="flex min-h-11 items-center justify-between gap-3 rounded-[10px_7px_12px_8px] border-[1.5px] border-[#263532] bg-transparent px-3 text-left text-sm font-bold"
      onClick={() => onChange(!checked)}
      type="button"
    >
      <span>{label}</span>
      <span
        aria-hidden
        className={`relative h-6 w-11 rounded-[12px_10px_13px_11px] border-[1.5px] border-[#263532] ${
          checked ? "bg-[#d9482f]" : "bg-transparent"
        }`}
      >
        <i className={`absolute top-[3px] size-4 rounded-full border border-[#263532] bg-white transition-[left] ${checked ? "left-[22px]" : "left-[3px]"}`} />
      </span>
    </button>
  );
}

function Setting({
  children,
  label,
}: {
  children: ReactNode;
  label: string;
}) {
  return (
    <div className="grid gap-1.5">
      <strong className="text-xs">{label}</strong>
      {children}
    </div>
  );
}

export function MapSettingsPanel({
  onChange,
  onClose,
  open,
  preferences,
}: {
  onChange: (preferences: MapPreferences) => void;
  onClose: () => void;
  open: boolean;
  preferences: MapPreferences;
}) {
  const panelRef = useRef<HTMLElement>(null);
  const { language, setLanguage, tr } = useLanguage();
  const update = <K extends keyof MapPreferences>(key: K, value: MapPreferences[K]) => {
    onChange({ ...preferences, [key]: value });
  };
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const mobile = window.matchMedia("(max-width: 720px)").matches;
    gsap.killTweensOf(panel);
    if (open) {
      gsap.set(panel, { visibility: "visible" });
      if (mobile) {
        gsap.set(panel, { scale: 1, transformOrigin: "50% 100%", yPercent: 105 });
        gsap.to(panel, {
          duration: 0.38,
          ease: "power3.out",
          yPercent: 0,
        });
        return;
      }
      const panelRect = panel.getBoundingClientRect();
      const trigger = Array.from(document.querySelectorAll<HTMLElement>("[data-settings-trigger]"))
        .find((element) => {
          const rect = element.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        });
      const triggerRect = trigger?.getBoundingClientRect();
      const transformOrigin = triggerRect
        ? `${triggerRect.left + triggerRect.width / 2 - panelRect.left}px ${triggerRect.top + triggerRect.height / 2 - panelRect.top}px`
        : "100% 0%";
      gsap.set(panel, { scale: 0.82, transformOrigin });
      gsap.to(panel, { duration: 0.34, ease: "back.out(1.25)", scale: 1 });
    } else {
      if (mobile) {
        gsap.to(panel, {
          duration: 0.3,
          ease: "power3.in",
          onComplete: () => gsap.set(panel, { visibility: "hidden" }),
          scale: 1,
          yPercent: 105,
        });
        return;
      }
      gsap.to(panel, {
        duration: 0.24,
        ease: "power2.in",
        scale: 0.82,
        yPercent: 0,
        onComplete: () => gsap.set(panel, { visibility: "hidden" }),
      });
    }
  }, [open]);
  const section = "grid gap-3 rounded-[13px_10px_15px_11px] border-[1.5px] border-dashed border-[#263532] p-3";
  return (
    <aside
      aria-label={tr("Réglages de la carte", "Map settings")}
      aria-hidden={!open}
      className={`invisible fixed top-[141px] right-[84px] grid max-h-[min(calc(100dvh-159px),760px)] w-[360px] origin-top-right scale-[.82] rotate-[-.06deg] gap-3 overflow-y-auto rounded-[19px_15px_21px_16px] border-2 border-[#172322] bg-white p-3.5 text-[#172322] shadow-[0_0_0_1px_rgba(255,255,255,.9),2px_2px_0_1px_rgba(23,35,34,.38),0_10px_34px_rgba(0,0,0,.22)] max-[720px]:inset-x-0 max-[720px]:top-auto max-[720px]:bottom-0 max-[720px]:max-h-[84dvh] max-[720px]:w-full max-[720px]:origin-bottom max-[720px]:rounded-t-[20px] max-[720px]:rounded-b-none max-[720px]:px-3 max-[720px]:pt-3.5 max-[720px]:pb-[calc(16px+env(safe-area-inset-bottom))] ${open ? "" : "pointer-events-none"}`}
      ref={panelRef}
    >
      <header className="flex items-center justify-between border-b-[1.5px] border-dashed border-[#263532]/55 pb-2">
        <div>
          <small className="font-black tracking-[.12em] uppercase">{tr("Préférences", "Preferences")}</small>
          <h2 className="m-0 text-lg font-black">{tr("Réglages de la carte", "Map settings")}</h2>
        </div>
        <button aria-label={tr("Fermer les réglages", "Close settings")} className="grid size-9 place-items-center rounded-[51%_49%_46%_54%] border-[1.5px] border-[#172322] bg-transparent text-2xl" onClick={onClose} type="button">×</button>
      </header>

      <section className={section}>
        <strong className="text-[.7rem] tracking-[.1em] uppercase">{tr("Langue", "Language")}</strong>
        <Setting label={tr("Langue de l’application", "Application language")}>
          <Choice
            onChange={setLanguage}
            options={[
              { label: "Français", value: "fr" },
              { label: "English", value: "en" },
            ]}
            value={language}
          />
        </Setting>
      </section>

      <section className={section}>
        <strong className="text-[.7rem] tracking-[.1em] uppercase">{tr("Affichage", "Display")}</strong>
        <Setting label={tr("Police", "Font")}>
          <Choice onChange={(value) => update("fontStyle", value)} options={[{ label: "Standard", value: "standard" }, { label: tr("Crayon", "Handwritten"), value: "hand" }]} value={preferences.fontStyle} />
        </Setting>
        <Setting label={tr("Taille des points de feu", "Fire marker size")}>
          <Choice onChange={(value) => update("markerSize", value)} options={[{ label: tr("Petite", "Small"), value: "small" }, { label: tr("Normale", "Normal"), value: "normal" }, { label: tr("Grande", "Large"), value: "large" }]} value={preferences.markerSize} />
        </Setting>
        <Setting label={tr("Intensité des halos", "Halo intensity")}>
          <Choice onChange={(value) => update("haloIntensity", value)} options={[{ label: tr("Faible", "Low"), value: "low" }, { label: tr("Normale", "Normal"), value: "normal" }, { label: tr("Forte", "High"), value: "high" }]} value={preferences.haloIntensity} />
        </Setting>
        <Toggle checked={preferences.showTooltips} label={tr("Infobulles au survol", "Hover tooltips")} onChange={(value) => update("showTooltips", value)} />
      </section>

      <section className={section}>
        <strong className="text-[.7rem] tracking-[.1em] uppercase">{tr("Temps", "Time")}</strong>
        <Setting label={tr("Fuseau horaire", "Time zone")}>
          <Choice onChange={(value) => update("timeZone", value)} options={[{ label: tr("Local", "Local"), value: "local" }, { label: "UTC", value: "utc" }]} value={preferences.timeZone} />
        </Setting>
        <Setting label={tr("Format de l’heure", "Time format")}>
          <Choice onChange={(value) => update("hourFormat", value)} options={[{ label: tr("24 heures", "24 hours"), value: "24" }, { label: tr("12 heures", "12 hours"), value: "12" }]} value={preferences.hourFormat} />
        </Setting>
        <Setting label={tr("Période de la chronologie", "Timeline range")}>
          <Choice
            onChange={(value) => update("timelineRangeDays", value)}
            options={[
              { label: tr("Aujourd’hui", "Today"), value: 1 },
              { label: tr("3 jours", "3 days"), value: 3 },
              { label: tr("7 jours", "7 days"), value: 7 },
            ]}
            value={preferences.timelineRangeDays}
          />
          <small className="leading-normal text-muted">{tr("Permet de revenir aux jours précédents directement depuis la barre sur la carte.", "Lets you browse previous days directly from the map timeline.")}</small>
        </Setting>
        <Setting label={tr("Vitesse du mode lecture", "Playback speed")}>
          <Choice onChange={(value) => update("playbackSpeed", value)} options={[{ label: tr("Lente", "Slow"), value: "slow" }, { label: tr("Normale", "Normal"), value: "normal" }, { label: tr("Rapide", "Fast"), value: "fast" }]} value={preferences.playbackSpeed} />
          <small className="leading-normal text-muted">{tr("Règle le défilement automatique après avoir appuyé sur Lecture. Le glissement manuel ne change pas.", "Controls automatic playback after pressing Play. Manual dragging is unchanged.")}</small>
        </Setting>
      </section>

      <section className={section}>
        <strong className="text-[.7rem] tracking-[.1em] uppercase">{tr("Unités", "Units")}</strong>
        <Setting label={tr("Vent", "Wind")}>
          <Choice onChange={(value) => update("windUnit", value)} options={[{ label: "km/h", value: "kmh" }, { label: "m/s", value: "ms" }, { label: tr("nœuds", "knots"), value: "knots" }]} value={preferences.windUnit} />
        </Setting>
        <Setting label={tr("Distance", "Distance")}>
          <Choice onChange={(value) => update("distanceUnit", value)} options={[{ label: "km", value: "km" }, { label: "miles", value: "miles" }]} value={preferences.distanceUnit} />
        </Setting>
        <Setting label={tr("Surfaces mesurées et brûlées", "Measured and burned areas")}>
          <Choice onChange={(value) => update("areaUnit", value)} options={[{ label: tr("hectares", "hectares"), value: "ha" }, { label: "km²", value: "km2" }]} value={preferences.areaUnit} />
        </Setting>
        <Setting label={tr("Coordonnées", "Coordinates")}>
          <Choice onChange={(value) => update("coordinateFormat", value)} options={[{ label: "DMS", value: "dms" }, { label: tr("Décimales", "Decimal"), value: "decimal" }]} value={preferences.coordinateFormat} />
        </Setting>
      </section>

      <section className={section}>
        <strong className="text-[.7rem] tracking-[.1em] uppercase">{tr("Accessibilité", "Accessibility")}</strong>
        <Setting label={tr("Taille du texte", "Text size")}>
          <Choice onChange={(value) => update("textSize", value)} options={[{ label: tr("Normale", "Normal"), value: "normal" }, { label: tr("Grande", "Large"), value: "large" }]} value={preferences.textSize} />
        </Setting>
        <Toggle checked={preferences.highContrast} label={tr("Contraste renforcé", "High contrast")} onChange={(value) => update("highContrast", value)} />
        <Toggle checked={preferences.reduceMotion} label={tr("Réduire les animations", "Reduce motion")} onChange={(value) => update("reduceMotion", value)} />
      </section>

      <section className={section}>
        <strong className="text-[.7rem] tracking-[.1em] uppercase">{tr("Alertes", "Alerts")}</strong>
        <Setting label={tr("Rayon par défaut", "Default radius")}>
          <Choice onChange={(value) => update("alertRadiusKm", value)} options={[5, 10, 25, 50].map((value) => ({ label: `${value} km`, value: value as 5 | 10 | 25 | 50 }))} value={preferences.alertRadiusKm} />
        </Setting>
        <small className="leading-normal text-muted">{tr("Ce rayon sera proposé pour les prochains lieux surveillés.", "This radius will be suggested for newly watched places.")}</small>
      </section>
    </aside>
  );
}
