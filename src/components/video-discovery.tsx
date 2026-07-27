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
  const { locale, tr } = useLanguage();
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
          message: payload.message || tr("La recherche est indisponible.", "Search is unavailable."),
          configurationRequired: payload.code === "VIDEO_SEARCH_NOT_CONFIGURED",
        });
        return;
      }
      setState({ status: "ready", candidates: payload.candidates, searchedAt: payload.searchedAt });
    } catch {
      setState({ status: "error", candidates: [], message: tr("La recherche est indisponible.", "Search is unavailable."), configurationRequired: false });
    }
  };

  return (
    <div className="mx-auto max-w-[900px] px-4 pt-[18px] pb-[30px]">
      <h1 className="my-1 text-[1.65rem] font-bold">{tr("Découvrir des vidéos locales", "Discover local videos")}</h1>
      <p className="mt-0 leading-normal text-muted">
        {tr("Firemaps recherche des liens publics TikTok et Instagram associés à un lieu. Aucun résultat n’est publié automatiquement : vérifiez toujours la date, le lieu et le contenu.", "Firemaps searches for public TikTok and Instagram links associated with a place. Nothing is published automatically: always verify the date, location and content.")}
      </p>
      <p className="rounded-xl border border-[#e9a177] bg-[#fff1e8] p-[13px] leading-[1.45] text-[#692416]">
        {tr("Une description ou un hashtag ne prouve pas où et quand une vidéo a été filmée. N’utilisez jamais une vidéo sociale comme consigne de sécurité.", "A description or hashtag does not prove where or when a video was recorded. Never treat a social video as safety guidance.")}
      </p>
      <form className="my-3 rounded-2xl border border-line bg-surface p-4" onSubmit={search}>
        <label className="mb-2 block font-extrabold" htmlFor="video-place">{tr("Commune, département ou massif", "Town, region or forest")}</label>
        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3"
            autoComplete="off"
            id="video-place"
            maxLength={80}
            onChange={(event) => setPlace(event.target.value)}
            placeholder={tr("Ex. Lacanau, Gironde", "E.g. Lacanau, Gironde")}
            required
            value={place}
          />
          <button className="inline-flex min-h-12 cursor-pointer justify-center rounded-xl border-0 bg-brand px-4 py-[13px] font-extrabold text-white disabled:cursor-wait disabled:opacity-60" disabled={state.status === "loading"} type="submit">
            {state.status === "loading" ? tr("Recherche…", "Searching…") : tr("Rechercher", "Search")}
          </button>
        </div>
      </form>

      {state.status === "error" && (
        <div className="my-3 rounded-2xl border border-line bg-surface p-4">
          <p className="m-0 font-bold text-[#8b2118]">{state.message}</p>
          {state.configurationRequired && (
            <p>{tr("Créez une clé Brave Search puis ajoutez-la dans", "Create a Brave Search key and add it to")} <code>BRAVE_SEARCH_API_KEY</code> {tr("côté serveur.", "on the server.")}</p>
          )}
        </div>
      )}
      {state.status === "ready" && state.candidates.length === 0 && (
        <div className="my-3 rounded-2xl border border-line bg-surface p-4 text-center text-muted">{tr("Aucune vidéo publique indexée n’a été trouvée pour ce lieu.", "No indexed public video was found for this place.")}</div>
      )}
      {state.status === "ready" && state.candidates.length > 0 && (
        <section aria-label={tr("Vidéos candidates", "Candidate videos")}>
          <div className="mt-[22px] mb-2.5 flex items-baseline justify-between">
            <strong>{tr(`${state.candidates.length} résultat${state.candidates.length > 1 ? "s" : ""} à vérifier`, `${state.candidates.length} result${state.candidates.length > 1 ? "s" : ""} to verify`)}</strong>
            <small>{tr("Recherche du", "Search from")} {new Date(state.searchedAt).toLocaleString(locale)}</small>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {state.candidates.map((candidate) => (
              <article className="my-0 rounded-2xl border border-line bg-surface p-4" key={candidate.id}>
                <span className={`badge badge-${candidate.platform}`}>{candidate.platform.toUpperCase()}</span>
                <h2 className="mt-2 text-base font-bold">{candidate.title}</h2>
                {candidate.description && <p>{candidate.description}</p>}
                <div className="flex flex-wrap gap-2">
                  <a className="secondary" href={candidate.url} rel="noreferrer" target="_blank">{tr("Ouvrir et vérifier", "Open and verify")}</a>
                  <a className="primary" href={`/?video=${encodeURIComponent(candidate.url)}`}>
                    {tr("Ajouter à la carte", "Add to map")}
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
