"use client";

import { useEffect, useRef, useState } from "react";
import type { GeocodingSuggestion } from "@/integrations/geoplateforme";
import { useLanguage } from "@/i18n/language-context";

function HandSearchIcon({ pin = false }: { pin?: boolean }) {
  const paths = pin
    ? ["M12 21s6-5.7 6-11a6 6 0 0 0-12 0c0 5.3 6 11 6 11Z", "M12 7.4c1.6 0 2.8 1.2 2.8 2.8S13.6 13 12 13s-2.8-1.2-2.8-2.8S10.4 7.4 12 7.4Z"]
    : ["M10.4 4.1c3.6-.1 6.4 2.6 6.3 6.1.1 3.7-2.6 6.5-6.2 6.4-3.7.1-6.3-2.7-6.2-6.2-.1-3.6 2.5-6.2 6.1-6.3Z", "m15.1 14.9 4.9 5"];
  const echoPaths = pin
    ? paths
    : ["M10.6 4.6c3.3-.2 5.8 2.4 5.9 5.8-.1 3.3-2.6 5.9-5.9 5.8-3.4.2-5.9-2.5-5.8-5.9-.1-3.2 2.4-5.7 5.8-5.7Z", "m15.5 15.4 4.3 4.5"];
  return (
    <svg aria-hidden className="hand-drawn-search-icon" viewBox="0 0 24 24">
      <g className="hand-drawn-search-icon-echo">
        {echoPaths.map((path) => <path d={path} key={`echo-${path}`} />)}
      </g>
      <g>{paths.map((path) => <path d={path} key={path} />)}</g>
    </svg>
  );
}

export function MapSearch({
  onMobileOpenChange,
  onSelect,
}: {
  onMobileOpenChange?: (open: boolean) => void;
  onSelect: (suggestion: GeocodingSuggestion) => void;
}) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodingSuggestion[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [mobileOpen, setMobileOpen] = useState(false);
  const requestId = useRef(0);
  const skipNextSearch = useRef(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    onMobileOpenChange?.(mobileOpen);
  }, [mobileOpen, onMobileOpenChange]);

  useEffect(() => {
    if (query.trim().length < 3) return;
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }
    const currentRequest = ++requestId.current;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setStatus("loading");
      try {
        const response = await fetch(`/api/geocoding/autocomplete?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        const payload = await response.json();
        if (!response.ok) throw new Error();
        if (requestId.current === currentRequest) {
          setSuggestions(payload.suggestions);
          setStatus("idle");
        }
      } catch {
        if (!controller.signal.aborted && requestId.current === currentRequest) {
          setSuggestions([]);
          setStatus("error");
        }
      }
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  useEffect(() => {
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setSuggestions([]);
        setMobileOpen(false);
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, []);

  const select = (suggestion: GeocodingSuggestion) => {
    skipNextSearch.current = true;
    setQuery(suggestion.label);
    setSuggestions([]);
    setStatus("idle");
    setMobileOpen(false);
    onSelect(suggestion);
  };

  const updateQuery = (value: string) => {
    setQuery(value);
    if (value.trim().length < 3) {
      requestId.current += 1;
      setSuggestions([]);
      setStatus("idle");
    }
  };

  return (
    <div
      data-testid="map-search"
      className={`absolute left-1/2 z-700 w-[560px] max-w-[calc(100%_-_24px)] origin-right -translate-x-1/2 transition-[width,max-width,left,right,transform] duration-350 ease-[cubic-bezier(.22,.8,.26,1)] max-[900px]:w-[340px] ${
        mobileOpen
          ? "top-[max(10px,env(safe-area-inset-top))] max-[520px]:!top-[max(10px,env(safe-area-inset-top))] max-[520px]:!right-[max(8px,env(safe-area-inset-right))] max-[520px]:!left-auto max-[520px]:!w-[calc(100%_-_16px_-_env(safe-area-inset-right))] max-[520px]:!max-w-none max-[520px]:!translate-x-0"
          : "top-[max(10px,env(safe-area-inset-top))] max-[520px]:!top-[max(10px,env(safe-area-inset-top))] max-[520px]:!bottom-auto max-[520px]:!left-auto max-[520px]:!right-[max(8px,env(safe-area-inset-right))] max-[520px]:!size-[42px] max-[520px]:!translate-x-0"
      }`}
      ref={panelRef}
    >
      <div className={`relative flex min-h-[54px] rotate-[-.15deg] items-center overflow-hidden rounded-[28px_25px_30px_26px] border-2 border-[#172322] bg-[rgba(255,255,255,.96)] px-4 text-[#172322] shadow-[2px_2px_0_rgba(23,35,34,.3),0_3px_14px_rgba(0,0,0,.16)] transition-[width,min-height,border-radius,padding,transform,box-shadow] duration-350 ease-[cubic-bezier(.22,.8,.26,1)] after:pointer-events-none after:absolute after:inset-[2px_-3px_-2px_2px] after:rounded-[inherit] after:border after:border-[#172322]/35 after:content-[''] max-[520px]:min-h-12 max-[520px]:px-2.5 ${
        mobileOpen ? "" : "max-[520px]:!size-[42px] max-[520px]:!min-h-[42px] max-[520px]:!rotate-[-.8deg] max-[520px]:!rounded-[45%_55%_43%_57%/54%_46%_56%_44%] max-[520px]:!border-[1.8px] max-[520px]:!border-[#172322] max-[520px]:!p-0 max-[520px]:!shadow-[1px_1px_0_rgba(23,35,34,.45)] max-[520px]:after:hidden"
      }`}>
        <button
          aria-label={mobileOpen ? t("mapSearch.closeSearch") : t("mapSearch.searchForAPlace")}
          className={`grid size-8 shrink-0 cursor-pointer place-items-center border-0 bg-transparent p-0 text-inherit ${mobileOpen ? "" : "max-[520px]:!size-[42px]"}`}
          onClick={() => {
            if (mobileOpen) {
              setMobileOpen(false);
              setSuggestions([]);
              inputRef.current?.blur();
            } else {
              setMobileOpen(true);
              window.setTimeout(() => inputRef.current?.focus(), 0);
            }
          }}
          type="button"
        >
          {mobileOpen ? (
            <>
              <span aria-hidden className="hidden text-[1.65rem] leading-none font-normal max-[520px]:inline">×</span>
              <span className="max-[520px]:hidden"><HandSearchIcon /></span>
            </>
          ) : <HandSearchIcon />}
        </button>
        <input
          className={`min-w-0 w-full border-0 bg-transparent px-2 py-3 text-base text-[#172322] outline-0 transition-[max-width,opacity,padding] duration-250 placeholder:text-[#68716f] max-[520px]:text-[16px] ${mobileOpen ? "max-[520px]:max-w-full max-[520px]:opacity-100" : "max-[520px]:pointer-events-none max-[520px]:max-w-0 max-[520px]:px-0 max-[520px]:opacity-0"}`}
          aria-autocomplete="list"
          aria-controls="address-suggestions"
          aria-expanded={suggestions.length > 0}
          aria-label={t("mapSearch.searchForAnAddressOrPlace")}
          autoComplete="off"
          onChange={(event) => updateQuery(event.target.value)}
          onFocus={() => setMobileOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setSuggestions([]);
              setMobileOpen(false);
              event.currentTarget.blur();
            }
          }}
          placeholder={t("mapSearch.searchForAnAddressOrPlace")}
          role="combobox"
          ref={inputRef}
          value={query}
        />
        {status === "loading" && <span className={`whitespace-nowrap text-[.72rem] text-muted ${mobileOpen ? "" : "max-[520px]:hidden"}`}>{t("mapSearch.searching")}</span>}
      </div>
      {suggestions.length > 0 && mobileOpen && (
        <ul className="relative mt-2 max-h-[min(310px,45dvh)] rotate-[.1deg] list-none overflow-y-auto overscroll-contain rounded-[14px_17px_13px_16px] border-2 border-[#172322] bg-[rgba(255,255,255,.97)] p-1.5 text-[#172322] shadow-[3px_4px_0_rgba(23,35,34,.2),0_8px_25px_rgba(0,0,0,.18)] [&>li+li]:border-t [&>li+li]:border-dashed [&>li+li]:border-line" id="address-suggestions" role="listbox">
          {suggestions.map((suggestion) => (
            <li aria-selected="false" key={suggestion.id} role="option">
              <button className="flex min-h-[52px] w-full cursor-pointer items-start gap-2.5 border-0 bg-transparent p-2.5 text-left hover:rounded-[8px_6px_9px_7px] hover:bg-paper focus-visible:rounded-[8px_6px_9px_7px] focus-visible:bg-paper" onClick={() => select(suggestion)}>
                <span className="mt-0.5 grid size-6 shrink-0 place-items-center"><HandSearchIcon pin /></span>
                <span><strong className="block">{suggestion.label}</strong>{suggestion.city && <small className="mt-1 block text-muted">{suggestion.city} {suggestion.postcode}</small>}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {status === "error" && mobileOpen && <p className="mx-2.5 my-1.5 rounded-lg bg-[#fff1e8] p-2 text-[.78rem] text-[#692416]">{t("mapSearch.searchIsTemporarilyUnavailable")}</p>}
    </div>
  );
}
