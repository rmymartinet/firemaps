"use client";

import { type FormEvent, useState } from "react";
import type { VideoCandidate } from "@/integrations/video-discovery";
import { useLanguage } from "@/i18n/language-context";

type SearchState =
  | { status: "idle"; candidates: VideoCandidate[] }
  | { status: "loading"; candidates: VideoCandidate[] }
  | { status: "ready"; candidates: VideoCandidate[]; searchedAt: string }
  | { status: "error"; candidates: VideoCandidate[]; message: string; configurationRequired: boolean };

export function VideoDiscovery() {
  const { locale, t } = useLanguage();
  const [place, setPlace] = useState("");
  const [state, setState] = useState<SearchState>({ status: "idle", candidates: [] });

  const search = async (event: FormEvent) => {
    event.preventDefault();
    const normalizedPlace = place.trim();
    if (normalizedPlace.length < 2) return;
    setState({ status: "loading", candidates: [] });
    try {
      const response = await fetch(`/api/videos/discover?place=${encodeURIComponent(normalizedPlace)}`);
      const payload = await response.json();
      if (!response.ok) {
        setState({
          status: "error",
          candidates: [],
          message: payload.message || t("videoDiscovery.searchIsUnavailable"),
          configurationRequired: payload.code === "VIDEO_SEARCH_NOT_CONFIGURED",
        });
        return;
      }
      setState({ status: "ready", candidates: payload.candidates, searchedAt: payload.searchedAt });
    } catch {
      setState({ status: "error", candidates: [], message: t("videoDiscovery.searchIsUnavailable"), configurationRequired: false });
    }
  };

  return (
    <div className="mx-auto max-w-[900px] px-4 pt-[18px] pb-[30px]">
      <h1 className="my-1 text-[1.65rem] font-bold">{t("videoDiscovery.discoverLocalVideos")}</h1>
      <p className="mt-0 leading-normal text-muted">
        {t("videoDiscovery.firemapsSearchesForPublicTiktokAndInstagramLinks")}
      </p>
      <p className="rounded-xl border border-[#e9a177] bg-[#fff1e8] p-[13px] leading-[1.45] text-[#692416]">
        {t("videoDiscovery.aDescriptionOrHashtagDoesNotProveWhere")}
      </p>
      <form className="my-3 rounded-2xl border border-line bg-surface p-4" onSubmit={search}>
        <label className="mb-2 block font-extrabold" htmlFor="video-place">{t("videoDiscovery.townRegionOrForest")}</label>
        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3"
            autoComplete="off"
            id="video-place"
            maxLength={80}
            onChange={(event) => setPlace(event.target.value)}
            placeholder={t("videoDiscovery.eGLacanauGironde")}
            required
            value={place}
          />
          <button className="inline-flex min-h-12 cursor-pointer justify-center rounded-xl border-0 bg-brand px-4 py-[13px] font-extrabold text-white disabled:cursor-wait disabled:opacity-60" disabled={state.status === "loading"} type="submit">
            {state.status === "loading" ? t("videoDiscovery.searching") : t("videoDiscovery.search")}
          </button>
        </div>
      </form>

      {state.status === "error" && (
        <div className="my-3 rounded-2xl border border-line bg-surface p-4">
          <p className="m-0 font-bold text-[#8b2118]">{state.message}</p>
          {state.configurationRequired && (
            <p>{t("videoDiscovery.createABraveSearchKeyAndAddIt")} <code>BRAVE_SEARCH_API_KEY</code> {t("videoDiscovery.onTheServer")}</p>
          )}
        </div>
      )}
      {state.status === "ready" && state.candidates.length === 0 && (
        <div className="my-3 rounded-2xl border border-line bg-surface p-4 text-center text-muted">{t("videoDiscovery.noIndexedPublicVideoWasFoundForThis")}</div>
      )}
      {state.status === "ready" && state.candidates.length > 0 && (
        <section aria-label={t("videoDiscovery.candidateVideos")}>
          <div className="mt-[22px] mb-2.5 flex items-baseline justify-between">
            <strong>{t(state.candidates.length > 1 ? "videoDiscovery.resultsToVerify" : "videoDiscovery.resultToVerify", { count: state.candidates.length })}</strong>
            <small>{t("videoDiscovery.searchFrom")} {new Date(state.searchedAt).toLocaleString(locale)}</small>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {state.candidates.map((candidate) => (
              <article className="my-0 rounded-2xl border border-line bg-surface p-4" key={candidate.id}>
                <span className={`badge badge-${candidate.platform}`}>{candidate.platform.toUpperCase()}</span>
                <h2 className="mt-2 text-base font-bold">{candidate.title}</h2>
                {candidate.description && <p>{candidate.description}</p>}
                <div className="flex flex-wrap gap-2">
                  <a className="secondary" href={candidate.url} rel="noreferrer" target="_blank">{t("videoDiscovery.openAndVerify")}</a>
                  <a className="primary" href={`/?video=${encodeURIComponent(candidate.url)}`}>
                    {t("videoDiscovery.addToMap")}
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
