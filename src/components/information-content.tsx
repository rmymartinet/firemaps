"use client";

import { useId, useState, type ReactNode } from "react";

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
  return (
    <div className="mx-auto max-w-[760px] px-4 pt-5 pb-7 text-ink">
      <header className="pr-12">
        <p className="m-0 text-xs font-black tracking-[.14em] text-fire uppercase">Comprendre la carte</p>
        <h1 className="mt-1 mb-1 text-[1.5rem] font-black">Informations essentielles</h1>
        <p className="mt-0 text-sm leading-normal text-muted">L’essentiel d’abord. Ouvrez une rubrique seulement si vous en avez besoin.</p>
      </header>

      <section className="mt-4 rotate-[-.15deg] rounded-[17px_14px_19px_15px] border-2 border-dashed border-[#b92f22] bg-[rgba(255,240,233,.72)] p-4 text-[#5f1c15] shadow-[2px_2px_0_rgba(95,28,21,.16)]">
        <strong className="block text-base">Danger immédiat ou départ de feu visible ?</strong>
        <p className="my-2 text-sm leading-normal">Éloignez-vous, localisez le feu sans vous exposer et prévenez les secours. N’attendez jamais une mise à jour de la carte.</p>
        <div className="flex flex-wrap gap-2">
          <a className="primary !min-h-11 !bg-[#b92f22] !px-4 !py-2.5" href="tel:112">Appeler le 112</a>
          <a className="primary !min-h-11 !bg-[#b92f22] !px-4 !py-2.5" href="tel:18">Appeler le 18</a>
          <a className="secondary !min-h-11 !px-4 !py-2.5" href="https://www.info.urgence114.fr/" rel="noreferrer" target="_blank">Urgence 114</a>
        </div>
      </section>

      <div className="mt-4 grid gap-2.5">
        <InformationAccordion defaultOpen icon="thermal" title="Que signifient les points ?">
          <div className="grid gap-3 px-5 text-sm leading-[1.6]">
            <p className="mt-0">Un point indique une <strong>anomalie de chaleur détectée par satellite</strong>. Il ne confirme pas forcément une flamme et ne représente jamais une surface brûlée.</p>
            <ul className="my-0 grid gap-2 pl-5">
              <li><strong>Rouge :</strong> signal observé depuis moins de 3 h.</li>
              <li><strong>Orange :</strong> observation datant de 3 à 6 h.</li>
              <li><strong>Plus sombre :</strong> observation plus ancienne.</li>
            </ul>
            <p className="m-0 rounded-[10px_7px_12px_8px] border-2 border-dashed border-[#14717a] bg-[#e7f4f5] p-4 text-[#173f42]">Signal satellite, incendie confirmé et surface brûlée sont trois informations différentes.</p>
          </div>
        </InformationAccordion>

        <InformationAccordion icon="safety" title="Que faire si un feu est proche ?">
          <div className="grid gap-3 px-5 text-sm leading-[1.6]">
            <ul className="my-0 grid gap-1.5 pl-5">
              <li>Abritez-vous dans un bâtiment en dur.</li>
              <li>Fermez portes, fenêtres et aérations.</li>
              <li>Écoutez les autorités et n’évacuez que sur leur ordre.</li>
            </ul>
            <a className="secondary mt-3 inline-flex" href="https://www.georisques.gouv.fr/me-preparer-me-proteger/que-faire-en-cas-de-feu-de-foret" rel="noreferrer" target="_blank">Voir les consignes complètes</a>
          </div>
        </InformationAccordion>

        <InformationAccordion icon="layers" title="Comprendre les autres couches">
          <div className="grid gap-4 px-5 text-sm leading-[1.6] md:grid-cols-2">
            <div><strong>Halos thermiques</strong><p className="my-1 text-muted">Ils rendent les concentrations de signaux plus lisibles. Ce ne sont pas des contours de feu.</p></div>
            <div><strong>Vent à 10 m</strong><p className="my-1 text-muted">Il montre le déplacement modélisé de l’air, pas la future trajectoire de l’incendie.</p></div>
            <div><strong>Fumée et qualité de l’air</strong><p className="my-1 text-muted">C’est une estimation CAMS à grande maille, pas une observation locale en direct.</p></div>
            <div><strong>Météo des forêts</strong><p className="my-1 text-muted">Elle indique un niveau de danger départemental, pas la présence d’un feu actif.</p></div>
          </div>
        </InformationAccordion>

        <InformationAccordion icon="sources" title="Sources et alertes officielles">
          <div className="grid gap-3 px-5 text-sm leading-[1.6]">
            <p className="mt-0">Les détections thermiques proviennent de <a href="https://firms.modaps.eosdis.nasa.gov/" rel="noreferrer" target="_blank">NASA LANCE FIRMS</a>. Le vent et l’air reposent sur Open-Meteo et CAMS, et les données forestières sur l’IGN.</p>
            <p>Les consignes des autorités restent toujours prioritaires.</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <a className="primary" href="https://fr-alert.gouv.fr/les-alertes" rel="noreferrer" target="_blank">Consulter FR-Alert</a>
              <a className="secondary" href="https://lannuaire.service-public.fr/" rel="noreferrer" target="_blank">Trouver une préfecture</a>
            </div>
          </div>
        </InformationAccordion>
      </div>

      <p className="mb-0 text-center text-xs leading-normal text-muted">L’absence de signal ou de publication ne signifie jamais une absence de danger.</p>
    </div>
  );
}
