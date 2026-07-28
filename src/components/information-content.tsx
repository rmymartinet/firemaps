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

export function InformationContent({ onOpenEmergency }: { onOpenEmergency?: () => void } = {}) {
  const { t } = useLanguage();
  return (
    <div className="mx-auto max-w-[760px] px-4 pt-5 pb-7 text-ink">
      <header className="pr-12">
        <p className="m-0 text-xs font-black tracking-[.14em] text-fire uppercase">{t("informationContent.understandTheMap")}</p>
        <h1 className="mt-1 mb-1 text-[1.5rem] font-black">{t("informationContent.essentialInformation")}</h1>
        <p className="mt-0 text-sm leading-normal text-muted">{t("informationContent.startWithTheEssentialsOpenASectionOnly")}</p>
      </header>

      <section className="mt-4 rotate-[-.15deg] rounded-[17px_14px_19px_15px] border-2 border-dashed border-[#b92f22] bg-[rgba(255,240,233,.72)] p-4 text-[#5f1c15] shadow-[2px_2px_0_rgba(95,28,21,.16)]">
        <strong className="block text-base">{t("informationContent.immediateDangerOrVisibleFire")}</strong>
        <p className="my-2 text-sm leading-normal">{t("informationContent.moveAwayLocateTheFireWithoutExposingYourself")}</p>
        {onOpenEmergency && (
          <button className="primary !min-h-11 !bg-[#b92f22] !px-4 !py-2.5" onClick={onOpenEmergency} type="button">
            {t("informationContent.viewTheNumberForThisArea")}
          </button>
        )}
      </section>

      <div className="mt-4 grid gap-2.5">
        <InformationAccordion defaultOpen icon="thermal" title={t("informationContent.whatDoThePointsMean")}>
          <div className="grid gap-3 px-5 text-sm leading-[1.6]">
            <p className="mt-0">{t("informationContent.aPointIndicatesAHeatAnomalyDetectedBy")}</p>
            <ul className="my-0 grid gap-2 pl-5">
              <li>{t("informationContent.redSignalObservedLessThan3HoursAgo")}</li>
              <li>{t("informationContent.orangeObservationFrom3To6HoursAgo")}</li>
              <li>{t("informationContent.darkerOlderObservation")}</li>
            </ul>
            <p className="m-0 rounded-[10px_7px_12px_8px] border-2 border-dashed border-[#14717a] bg-[#e7f4f5] p-4 text-[#173f42]">{t("informationContent.aSatelliteSignalAConfirmedWildfireAndA")}</p>
          </div>
        </InformationAccordion>

        <InformationAccordion icon="safety" title={t("informationContent.whatShouldIDoIfAFireIs")}>
          <div className="grid gap-3 px-5 text-sm leading-[1.6]">
            <ul className="my-0 grid gap-1.5 pl-5">
              <li>{t("informationContent.shelterInASolidBuilding")}</li>
              <li>{t("informationContent.closeDoorsWindowsAndVents")}</li>
              <li>{t("informationContent.followOfficialGuidanceAndEvacuateOnlyWhenInstructed")}</li>
            </ul>
            <a className="secondary mt-3 inline-flex" href="https://www.georisques.gouv.fr/me-preparer-me-proteger/que-faire-en-cas-de-feu-de-foret" rel="noreferrer" target="_blank">{t("informationContent.readTheFullGuidance")}</a>
          </div>
        </InformationAccordion>

        <InformationAccordion icon="layers" title={t("informationContent.understandTheOtherLayers")}>
          <div className="grid gap-4 px-5 text-sm leading-[1.6] md:grid-cols-2">
            <div><strong>{t("informationContent.thermalHalos")}</strong><p className="my-1 text-muted">{t("informationContent.theyMakeConcentrationsOfSignalsEasierToRead")}</p></div>
            <div><strong>{t("informationContent.windAt10M")}</strong><p className="my-1 text-muted">{t("informationContent.itShowsModeledAirMovementNotTheFuture")}</p></div>
            <div><strong>{t("informationContent.smokeAndAirQuality")}</strong><p className="my-1 text-muted">{t("informationContent.thisIsACoarseCamsEstimateNotA")}</p></div>
            <div><strong>{t("informationContent.forestFireWeather")}</strong><p className="my-1 text-muted">{t("informationContent.itIndicatesRegionalDangerNotThePresenceOf")}</p></div>
          </div>
        </InformationAccordion>

        <InformationAccordion icon="sources" title={t("informationContent.sourcesAndOfficialAlerts")}>
          <div className="grid gap-3 px-5 text-sm leading-[1.6]">
            <p className="mt-0">{t("informationContent.thermalDetectionsComeFromNasaLanceFirmsWind")}</p>
            <p>{t("informationContent.officialGuidanceAlwaysTakesPriority")}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <a className="primary" href="https://fr-alert.gouv.fr/les-alertes" rel="noreferrer" target="_blank">{t("informationContent.openFrAlert")}</a>
              <a className="secondary" href="https://lannuaire.service-public.fr/" rel="noreferrer" target="_blank">{t("informationContent.findAPrefecture")}</a>
            </div>
          </div>
        </InformationAccordion>
      </div>

      <p className="mb-0 text-center text-xs leading-normal text-muted">{t("informationContent.noSignalOrReportNeverMeansThereIs")}</p>
    </div>
  );
}
