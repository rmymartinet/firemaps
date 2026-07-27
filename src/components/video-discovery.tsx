"use client";

import { type FormEvent, useState } from "react";
import type { VideoCandidate } from "@/integrations/video-discovery";

type SearchState =
  | { status: "idle"; candidates: VideoCandidate[] }
  | { status: "loading"; candidates: VideoCandidate[] }
  | { status: "ready"; candidates: VideoCandidate[]; searchedAt: string }
  | { status: "error"; candidates: VideoCandidate[]; message: string; configurationRequired: boolean };

export function VideoDiscovery() {
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
          message: payload.message || "La recherche est indisponible.",
          configurationRequired: payload.code === "VIDEO_SEARCH_NOT_CONFIGURED",
        });
        return;
      }
      setState({ status: "ready", candidates: payload.candidates, searchedAt: payload.searchedAt });
    } catch {
      setState({ status: "error", candidates: [], message: "La recherche est indisponible.", configurationRequired: false });
    }
  };

  return (
    <div className="mx-auto max-w-[900px] px-4 pt-[18px] pb-[30px]">
      <h1 className="my-1 text-[1.65rem] font-bold">Découvrir des vidéos locales</h1>
      <p className="mt-0 leading-normal text-muted">
        Firemaps recherche des liens publics TikTok et Instagram associés à un lieu. Aucun résultat n’est publié
        automatiquement : vérifiez toujours la date, le lieu et le contenu.
      </p>
      <p className="rounded-xl border border-[#e9a177] bg-[#fff1e8] p-[13px] leading-[1.45] text-[#692416]">
        Une description ou un hashtag ne prouve pas où et quand une vidéo a été filmée. N’utilisez jamais une vidéo
        sociale comme consigne de sécurité.
      </p>
      <form className="my-3 rounded-2xl border border-line bg-surface p-4" onSubmit={search}>
        <label className="mb-2 block font-extrabold" htmlFor="video-place">Commune, département ou massif</label>
        <div className="flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-xl border border-line bg-white px-3"
            autoComplete="off"
            id="video-place"
            maxLength={80}
            onChange={(event) => setPlace(event.target.value)}
            placeholder="Ex. Lacanau, Gironde"
            required
            value={place}
          />
          <button className="inline-flex min-h-12 cursor-pointer justify-center rounded-xl border-0 bg-brand px-4 py-[13px] font-extrabold text-white disabled:cursor-wait disabled:opacity-60" disabled={state.status === "loading"} type="submit">
            {state.status === "loading" ? "Recherche…" : "Rechercher"}
          </button>
        </div>
      </form>

      {state.status === "error" && (
        <div className="my-3 rounded-2xl border border-line bg-surface p-4">
          <p className="m-0 font-bold text-[#8b2118]">{state.message}</p>
          {state.configurationRequired && (
            <p>Créez une clé Brave Search puis ajoutez-la dans <code>BRAVE_SEARCH_API_KEY</code> côté serveur.</p>
          )}
        </div>
      )}
      {state.status === "ready" && state.candidates.length === 0 && (
        <div className="my-3 rounded-2xl border border-line bg-surface p-4 text-center text-muted">Aucune vidéo publique indexée n’a été trouvée pour ce lieu.</div>
      )}
      {state.status === "ready" && state.candidates.length > 0 && (
        <section aria-label="Vidéos candidates">
          <div className="mt-[22px] mb-2.5 flex items-baseline justify-between">
            <strong>{state.candidates.length} résultat{state.candidates.length > 1 ? "s" : ""} à vérifier</strong>
            <small>Recherche du {new Date(state.searchedAt).toLocaleString("fr-FR")}</small>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {state.candidates.map((candidate) => (
              <article className="my-0 rounded-2xl border border-line bg-surface p-4" key={candidate.id}>
                <span className={`badge badge-${candidate.platform}`}>{candidate.platform.toUpperCase()}</span>
                <h2 className="mt-2 text-base font-bold">{candidate.title}</h2>
                {candidate.description && <p>{candidate.description}</p>}
                <div className="flex flex-wrap gap-2">
                  <a className="secondary" href={candidate.url} rel="noreferrer" target="_blank">Ouvrir et vérifier</a>
                  <a className="primary" href={`/?video=${encodeURIComponent(candidate.url)}`}>
                    Ajouter à la carte
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
