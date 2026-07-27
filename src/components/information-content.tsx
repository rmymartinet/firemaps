"use client";

import { useId, useState, type ReactNode } from "react";
import { useLanguage } from "@/i18n/language-context";

type InformationIconName = "layers" | "safety" | "sources" | "thermal";

const iconPaths: Record<InformationIconName, string[]> = {
  layers: ["M4 7.5 12 3.2l8 4.3-8 4.2Z", "M5 11.3 12 15l7-3.7", "M5 15.3 12 19l7-3.7"],
  safety: ["M3.5 11.2 12 4l8.5 7.2", "M5.8 10.3v9h12.4v-9", "M10 19.3v-5.8h4v5.8"],
  sources: ["M12 10.2v7.2", "M11.8 6.4h.3", "M12 2.8c5.1 0 9.1 4 9 9.2 0 5.1-4 9.1-9.2 9-5.1-.1-9-4.2-8.8-9.3.1-5 4-8.9 9-8.9Z"],
  thermal: ["M12 3v3M12 18v3M3 12h3M18 12h3", "M12 6.5c3.1 0 5.6 2.5 5.5 5.6 0 3.1-2.5 5.5-5.6 5.4-3.1 0-5.5-2.5-5.4-5.6 0-3 2.5-5.4 5.5-5.4Z"],
};

function InformationIcon({ name }: { name: InformationIconName }) {
  return (
    <svg aria-hidden className="hand-drawn-tool-icon shrink-0" viewBox="0 0 24 24">
      <g className="hand-drawn-tool-icon-echo">
        {iconPaths[name].map((path) => <path d={path} key={`echo-${path}`} />)}
      </g>
      <g>{iconPaths[name].map((path) => <path d={path} key={path} />)}</g>
    </svg>
  );
}

function InformationAccordion({
  children,
  defaultOpen = false,
  icon,
  title,
}: {
  children: ReactNode;
  defaultOpen?: boolean;
  icon: InformationIconName;
  title: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();
  return (
    <section className={`information-accordion rounded-[13px_10px_15px_11px] border-[1.5px] border-dashed border-[#263532] bg-white shadow-[2px_2px_0_rgba(23,35,34,.12)] ${open ? "is-open" : ""}`}>
      <button
        aria-controls={contentId}
        aria-expanded={open}
        className={`flex min-h-14 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left font-extrabold ${open ? "border-b border-dashed border-line" : ""}`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <InformationIcon name={icon} />
        {title}
        <span aria-hidden className={`ml-auto text-lg transition-transform duration-500 ${open ? "rotate-180" : ""}`}>⌄</span>
      </button>
      <div aria-hidden={!open} className="information-accordion-content" id={contentId} inert={!open}>
        {children}
      </div>
    </section>
  );
}

export function InformationContent() {
  const { tr } = useLanguage();
  return (
    <div className="mx-auto max-w-[760px] px-4 pt-5 pb-7 text-ink">
      <header className="pr-12">
        <p className="m-0 text-xs font-black tracking-[.14em] text-fire uppercase">{tr("Comprendre la carte", "Understand the map")}</p>
        <h1 className="mt-1 mb-1 text-[1.5rem] font-black">{tr("Informations essentielles", "Essential information")}</h1>
        <p className="mt-0 text-sm leading-normal text-muted">{tr("L’essentiel d’abord. Ouvrez une rubrique seulement si vous en avez besoin.", "Start with the essentials. Open a section only when you need it.")}</p>
      </header>

      <section className="mt-4 rotate-[-.15deg] rounded-[17px_14px_19px_15px] border-2 border-dashed border-[#b92f22] bg-[rgba(255,240,233,.72)] p-4 text-[#5f1c15] shadow-[2px_2px_0_rgba(95,28,21,.16)]">
        <strong className="block text-base">{tr("Danger immédiat ou départ de feu visible ?", "Immediate danger or visible fire?")}</strong>
        <p className="my-2 text-sm leading-normal">{tr("Éloignez-vous, localisez le feu sans vous exposer et prévenez les secours. N’attendez jamais une mise à jour de la carte.", "Move away, locate the fire without exposing yourself, and call emergency services. Never wait for a map update.")}</p>
        <div className="flex flex-wrap gap-2">
          <a className="primary !min-h-11 !bg-[#b92f22] !px-4 !py-2.5" href="tel:112">{tr("Appeler le 112", "Call 112")}</a>
          <a className="primary !min-h-11 !bg-[#b92f22] !px-4 !py-2.5" href="tel:18">{tr("Appeler le 18", "Call 18")}</a>
          <a className="secondary !min-h-11 !px-4 !py-2.5" href="https://www.info.urgence114.fr/" rel="noreferrer" target="_blank">{tr("Urgence 114", "Emergency 114")}</a>
        </div>
      </section>

      <div className="mt-4 grid gap-2.5">
        <InformationAccordion defaultOpen icon="thermal" title={tr("Que signifient les points ?", "What do the points mean?")}>
          <div className="grid gap-3 px-5 text-sm leading-[1.6]">
            <p className="mt-0">{tr("Un point indique une anomalie de chaleur détectée par satellite. Il ne confirme pas forcément une flamme et ne représente jamais une surface brûlée.", "A point indicates a heat anomaly detected by satellite. It does not necessarily confirm flames and never represents a burned area.")}</p>
            <ul className="my-0 grid gap-2 pl-5">
              <li>{tr("Rouge : signal observé depuis moins de 3 h.", "Red: signal observed less than 3 hours ago.")}</li>
              <li>{tr("Orange : observation datant de 3 à 6 h.", "Orange: observation from 3 to 6 hours ago.")}</li>
              <li>{tr("Plus sombre : observation plus ancienne.", "Darker: older observation.")}</li>
            </ul>
            <p className="m-0 rounded-[10px_7px_12px_8px] border-2 border-dashed border-[#14717a] bg-[#e7f4f5] p-4 text-[#173f42]">{tr("Signal satellite, incendie confirmé et surface brûlée sont trois informations différentes.", "A satellite signal, a confirmed wildfire and a burned area are three different things.")}</p>
          </div>
        </InformationAccordion>

        <InformationAccordion icon="safety" title={tr("Que faire si un feu est proche ?", "What should I do if a fire is nearby?")}>
          <div className="grid gap-3 px-5 text-sm leading-[1.6]">
            <ul className="my-0 grid gap-1.5 pl-5">
              <li>{tr("Abritez-vous dans un bâtiment en dur.", "Shelter in a solid building.")}</li>
              <li>{tr("Fermez portes, fenêtres et aérations.", "Close doors, windows and vents.")}</li>
              <li>{tr("Écoutez les autorités et n’évacuez que sur leur ordre.", "Follow official guidance and evacuate only when instructed.")}</li>
            </ul>
            <a className="secondary mt-3 inline-flex" href="https://www.georisques.gouv.fr/me-preparer-me-proteger/que-faire-en-cas-de-feu-de-foret" rel="noreferrer" target="_blank">{tr("Voir les consignes complètes", "Read the full guidance")}</a>
          </div>
        </InformationAccordion>

        <InformationAccordion icon="layers" title={tr("Comprendre les autres couches", "Understand the other layers")}>
          <div className="grid gap-4 px-5 text-sm leading-[1.6] md:grid-cols-2">
            <div><strong>{tr("Halos thermiques", "Thermal halos")}</strong><p className="my-1 text-muted">{tr("Ils rendent les concentrations de signaux plus lisibles. Ce ne sont pas des contours de feu.", "They make concentrations of signals easier to read. They are not fire boundaries.")}</p></div>
            <div><strong>{tr("Vent à 10 m", "Wind at 10 m")}</strong><p className="my-1 text-muted">{tr("Il montre le déplacement modélisé de l’air, pas la future trajectoire de l’incendie.", "It shows modeled air movement, not the future path of a wildfire.")}</p></div>
            <div><strong>{tr("Fumée et qualité de l’air", "Smoke and air quality")}</strong><p className="my-1 text-muted">{tr("C’est une estimation CAMS à grande maille, pas une observation locale en direct.", "This is a coarse CAMS estimate, not a live local observation.")}</p></div>
            <div><strong>{tr("Météo des forêts", "Forest fire weather")}</strong><p className="my-1 text-muted">{tr("Elle indique un niveau de danger départemental, pas la présence d’un feu actif.", "It indicates regional danger, not the presence of an active fire.")}</p></div>
          </div>
        </InformationAccordion>

        <InformationAccordion icon="sources" title={tr("Sources et alertes officielles", "Sources and official alerts")}>
          <div className="grid gap-3 px-5 text-sm leading-[1.6]">
            <p className="mt-0">{tr("Les détections thermiques proviennent de NASA LANCE FIRMS. Le vent et l’air reposent sur Open-Meteo et CAMS, et les données forestières sur l’IGN.", "Thermal detections come from NASA LANCE FIRMS. Wind and air data use Open-Meteo and CAMS, while forest data comes from IGN.")}</p>
            <p>{tr("Les consignes des autorités restent toujours prioritaires.", "Official guidance always takes priority.")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <a className="primary" href="https://fr-alert.gouv.fr/les-alertes" rel="noreferrer" target="_blank">{tr("Consulter FR-Alert", "Open FR-Alert")}</a>
              <a className="secondary" href="https://lannuaire.service-public.fr/" rel="noreferrer" target="_blank">{tr("Trouver une préfecture", "Find a prefecture")}</a>
            </div>
          </div>
        </InformationAccordion>
      </div>

      <p className="mb-0 text-center text-xs leading-normal text-muted">{tr("L’absence de signal ou de publication ne signifie jamais une absence de danger.", "No signal or report never means there is no danger.")}</p>
    </div>
  );
}
