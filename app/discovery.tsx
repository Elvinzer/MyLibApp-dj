"use client";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  Disc3,
  ExternalLink,
  ListMusic,
  LoaderCircle,
  Play,
  Plus,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import SpotifyConnection from "./spotify-connection";

export type DiscoveryTrack = {
  id: string;
  title: string;
  author: string;
  source: string;
  url: string;
  mediaReady: boolean;
  hasCover: boolean;
  bpm: number | null;
  factor: number;
  quality: string;
  status: string;
  progress: number | null;
  styleOverride?: string | null;
  styleStatus?: string;
  styles?: { label: string; score: number }[];
};
export type Idea = {
  key: string;
  title: string;
  author: string;
  source: string;
  url: string;
  cover: string | null;
  preview: string | null;
  duration: number;
  style: string | null;
  bpm: number | null;
  delta?: number | null;
  trackId: string | null;
  available: boolean;
  status: string;
  progress?: number | null;
  error?: string | null;
  reason?: string;
  reasonDetail?: string;
};
type Playlist = { id: string; name: string; tracks: string[] };
type Criteria = {
  reference: "track" | "artist" | "style";
  tolerance: 2 | 5 | 10;
  term: string;
};
type Results = {
  items: Idea[];
  total: number;
  message?: string;
  referenceBpm: number | null;
};
const defaults: Criteria = { reference: "track", tolerance: 5, term: "" };
const number = (value: number) =>
  value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
const encoded = (key: string) => encodeURIComponent(key);
async function api(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
) {
  let response: Response;
  try {
    response = await fetch("/api" + path, {
      method,
      signal,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error(
      "La connexion est momentanément interrompue. Réessayez ; votre sélection reste conservée.",
    );
  }
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Cette action est momentanément indisponible. Réessayez.",
    );
  return data;
}
function Artwork({ url }: { url?: string | null }) {
  return (
    <span className="discovery-art">
      {url ? (
        <img
          src={url}
          alt=""
          loading="lazy"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <Disc3 aria-hidden="true" size={26} />
      )}
    </span>
  );
}
function status(item: Idea) {
  if (item.available) return "Disponible dans MyLib";
  if (item.status === "error" || item.status === "interrupted")
    return "Import à reprendre";
  if (item.status === "missing") return "Fichier supprimé de MyLib";
  if (item.trackId)
    return `Import en cours${item.progress != null ? ` · ${item.progress} %` : "…"}`;
  return "À importer";
}

export default memo(function Discovery({
  visible,
  selectionMode,
  sourceId,
  tracks,
  playlists,
  play,
  preview,
  current,
  playing,
  refresh,
  navigate,
}: {
  visible: boolean;
  selectionMode: boolean;
  sourceId: string | null;
  tracks: DiscoveryTrack[];
  playlists: Playlist[];
  play: (id: string) => void;
  preview: (item: Idea) => void;
  current: string | null;
  playing: boolean;
  refresh: () => Promise<void>;
  navigate: (target: string) => void;
}) {
  const source = tracks.find((t) => t.id === sourceId);
  const [tab, setTab] = useState<"local" | "external">("local");
  const [criteria, setCriteria] = useState<Criteria>(defaults),
    [draft, setDraft] = useState<Criteria>(defaults);
  const [limit, setLimit] = useState(8),
    [retry, setRetry] = useState(0);
  const [results, setResults] = useState<Record<string, Results>>({});
  const [loading, setLoading] = useState(false),
    [searchError, setSearchError] = useState("");
  const [ideas, setIdeas] = useState<Idea[]>([]),
    [selectionError, setSelectionError] = useState("");
  const [selectionLoaded, setSelectionLoaded] = useState(false),
    [pending, setPending] = useState<string[]>([]);
  const [notice, setNotice] = useState("");
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [rowErrorActions, setRowErrorActions] = useState<
    Record<string, "retain" | "retry" | "cancel">
  >({});
  const [undo, setUndo] = useState<{ token: string; name: string } | null>(
    null,
  );
  const [modal, setModal] = useState<
    "refine" | "change" | "playlist" | "import" | null
  >(null);
  const [importIdea, setImportIdea] = useState<Idea | null>(null),
    [importUrl, setImportUrl] = useState("");
  const [modalError, setModalError] = useState(""),
    [busy, setBusy] = useState(false);
  const [destination, setDestination] = useState(""),
    [playlistName, setPlaylistName] = useState("");
  const [pickerQuery, setPickerQuery] = useState("");
  const dialog = useRef<HTMLDialogElement>(null),
    opener = useRef<HTMLElement | null>(null);
  const scrollPositions = useRef<Record<string, number>>({});
  const previousView = useRef<string>("");
  const isVisible = useRef(visible);
  isVisible.current = visible;
  const requestSerial = useRef(0);
  const musicalKey = JSON.stringify(
    tracks.map((t) => [
      t.id,
      t.title,
      t.author,
      t.bpm,
      t.factor,
      t.quality,
      t.status,
      t.mediaReady,
      t.styles,
      t.styleOverride,
    ]),
  );
  const progressKey = JSON.stringify(
    tracks.map((t) => [
      t.id,
      t.status,
      t.progress,
      t.mediaReady,
      t.bpm,
      t.factor,
      t.quality,
    ]),
  );
  const criteriaKey = JSON.stringify(criteria);
  const resultKey = JSON.stringify([
    sourceId,
    tab,
    criteria,
    limit,
    musicalKey,
  ]);
  const result = results[resultKey];
  const retained = useMemo(() => new Set(ideas.map((i) => i.key)), [ideas]);
  const availableIdeas = ideas.filter((i) => i.available);
  const available = [
    ...new Map(availableIdeas.map((i) => [i.trackId, i])).values(),
  ];
  const unavailableCount = ideas.filter((i) => !i.available).length;
  const selectionVersion = useRef(0);
  const loadSelection = useCallback(async () => {
    const version = ++selectionVersion.current;
    try {
      const data = await api("/discovery/selection");
      if (version !== selectionVersion.current) return;
      setIdeas(data.items);
      setSelectionError("");
      setSelectionLoaded(true);
    } catch (e) {
      if (version === selectionVersion.current) {
        setSelectionError((e as Error).message);
        setSelectionLoaded(true);
      }
    }
  }, []);
  useEffect(() => {
    void loadSelection();
  }, [loadSelection, progressKey]);
  useEffect(() => {
    try {
      const savedTab = localStorage.getItem("mylib-discovery-tab");
      if (savedTab === "local" || savedTab === "external") setTab(savedTab);
      const saved = JSON.parse(
        localStorage.getItem("mylib-discovery-criteria") || "null",
      );
      if (
        saved &&
        ["track", "artist", "style"].includes(saved.reference) &&
        [2, 5, 10].includes(saved.tolerance) &&
        typeof saved.term === "string"
      )
        setCriteria(saved);
    } catch {}
  }, []);
  const tabInitialized = useRef(false);
  useEffect(() => {
    if (!tabInitialized.current) {
      tabInitialized.current = true;
      return;
    }
    try {
      localStorage.setItem("mylib-discovery-tab", tab);
    } catch {}
  }, [tab]);
  const initialized = useRef(false);
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    try {
      localStorage.setItem(
        "mylib-discovery-criteria",
        JSON.stringify(criteria),
      );
    } catch {}
  }, [criteriaKey]);
  useEffect(() => {
    setLimit(8);
  }, [sourceId, criteriaKey]);
  useEffect(() => {
    if (!visible || selectionMode || !sourceId || !source) return;
    const serial = ++requestSerial.current,
      controller = new AbortController();
    setSearchError("");
    if (results[resultKey] && !retry) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void api(
      `/tracks/${sourceId}/discovery`,
      "POST",
      { ...criteria, scope: tab, limit },
      controller.signal,
    )
      .then((data) => {
        if (serial === requestSerial.current) {
          setResults((old) => ({ ...old, [resultKey]: data }));
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted && serial === requestSerial.current) {
          setSearchError((e as Error).message);
          setLoading(false);
        }
      });
    return () => {
      controller.abort();
    };
  }, [visible, selectionMode, resultKey, retry]);
  const viewKey = selectionMode
    ? "selection"
    : `${sourceId}/${tab}/${criteriaKey}`;
  useEffect(() => {
    if (!visible) return;
    const old = previousView.current;
    if (old && old !== viewKey) scrollPositions.current[old] = window.scrollY;
    previousView.current = viewKey;
    const frame = requestAnimationFrame(() => {
      window.scrollTo(0, scrollPositions.current[viewKey] || 0);
    });
    const save = () => {
      if (isVisible.current) scrollPositions.current[viewKey] = window.scrollY;
    };
    window.addEventListener("scroll", save, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", save);
    };
  }, [viewKey, visible]);
  useEffect(() => {
    if (!visible || selectionMode || loading || !result) return;
    const saved = scrollPositions.current[viewKey];
    if (saved !== undefined)
      requestAnimationFrame(() => window.scrollTo(0, saved));
  }, [visible, selectionMode, loading, resultKey]);
  useEffect(() => {
    if (modal) {
      opener.current = document.activeElement as HTMLElement;
      dialog.current?.showModal();
    } else if (dialog.current?.open) {
      dialog.current.close();
      opener.current?.focus();
    }
  }, [modal]);
  const open = (next: typeof modal) => {
    setModalError("");
    setModal(next);
  };
  const close = () => {
    if (!busy) setModal(null);
  };
  async function retain(item: Idea) {
    if (pending.includes(item.key)) return;
    setPending((p) => [...p, item.key]);
    setNotice("");
    setRowErrors((old) => ({ ...old, [item.key]: "" }));
    const existing = ideas.find(
      (i) =>
        i.key === item.key || (!!item.trackId && i.trackId === item.trackId),
    );
    const removing = !!existing;
    try {
      await api(
        `/discovery/selection/${encoded(existing?.key || item.key)}`,
        removing ? "DELETE" : "PUT",
      );
      await loadSelection();
      setNotice(
        removing
          ? `« ${item.title} » retiré de la sélection.`
          : `« ${item.title} » retenu. Continuez à explorer.`,
      );
      if (selectionMode && removing) {
        const index = ideas.findIndex((i) => i.key === existing?.key);
        requestAnimationFrame(() => {
          const buttons = document.querySelectorAll<HTMLButtonElement>(
            ".discovery-row-actions .retain-button",
          );
          const target =
            buttons[Math.min(index, buttons.length - 1)] ||
            document.getElementById("discovery-title");
          target?.focus();
        });
      }
    } catch (e) {
      setRowErrors((old) => ({ ...old, [item.key]: (e as Error).message }));
      setRowErrorActions((old) => ({ ...old, [item.key]: "retain" }));
    } finally {
      setPending((p) => p.filter((k) => k !== item.key));
    }
  }
  function hear(item: Idea) {
    if (item.available && item.trackId) play(item.trackId);
    else if (item.preview) preview(item);
  }
  async function savePlaylist(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setModalError("");
    try {
      const saved = await api("/discovery/playlist", "POST", {
        keys: ideas.map((i) => i.key),
        playlistId: destination || null,
        name: playlistName,
      });
      await refresh();
      setUndo({ token: saved.undo, name: saved.name });
      setNotice(
        saved.added
          ? `${saved.added} titre${saved.added > 1 ? "s" : ""} ajouté${saved.added > 1 ? "s" : ""} à « ${saved.name} ».`
          : `Ces titres sont déjà dans « ${saved.name} ».`,
      );
      setModal(null);
    } catch (e) {
      setModalError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function importLink(e: React.FormEvent) {
    e.preventDefault();
    if (!importIdea || busy) return;
    setBusy(true);
    setModalError("");
    try {
      const result = await api(
        `/discovery/selection/${encoded(importIdea.key)}/import`,
        "POST",
        { url: importUrl },
      );
      await refresh();
      await loadSelection();
      setModal(null);
      setNotice(
        result.duplicate
          ? "Ce fichier est déjà dans MyLib. Il a été associé à votre idée sans nouvel import."
          : "Import lancé. Votre idée reste dans la sélection pendant la préparation.",
      );
    } catch (e) {
      setModalError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function importAction(item: Idea, action: "retry" | "cancel") {
    if (!item.trackId) return;
    setPending((p) => [...p, item.key]);
    setRowErrors((old) => ({ ...old, [item.key]: "" }));
    try {
      await api(`/tracks/${item.trackId}/${action}`, "POST");
      await refresh();
      await loadSelection();
    } catch (e) {
      setRowErrors((old) => ({ ...old, [item.key]: (e as Error).message }));
      setRowErrorActions((old) => ({ ...old, [item.key]: action }));
    } finally {
      setPending((p) => p.filter((k) => k !== item.key));
    }
  }
  useEffect(() => {
    if (!visible) setModal(null);
  }, [visible]);
  useEffect(() => {
    if (visible) {
      const frame = requestAnimationFrame(() =>
        document
          .getElementById("discovery-title")
          ?.focus({ preventScroll: true }),
      );
      return () => cancelAnimationFrame(frame);
    }
  }, [visible, selectionMode, sourceId]);
  const filteredTracks = tracks.filter((t) =>
    (t.title + " " + t.author)
      .toLocaleLowerCase()
      .includes(pickerQuery.toLocaleLowerCase()),
  );
  const changeButton = (
    <button
      className="secondary"
      onClick={() => {
        setPickerQuery("");
        open("change");
      }}
    >
      Changer de morceau
    </button>
  );
  const renderRow = (item: Idea, inSelection = false) => {
    const selected =
        retained.has(item.key) ||
        ideas.some((i) => !!item.trackId && i.trackId === item.trackId),
      waiting = pending.includes(item.key);
    const fresh = ideas.find((i) => i.key === item.key);
    const local = tracks.find((t) => t.id === (fresh?.trackId || item.trackId));
    const playable = !!local?.mediaReady || item.available;
    const resolved = {
      ...item,
      ...(fresh || {}),
      available: playable,
      trackId: local?.id || fresh?.trackId || item.trackId,
    };
    const audible = playable || !!item.preview;
    const isCurrent =
      playing &&
      current === (playable ? resolved.trackId : "preview:" + item.key);
    return (
      <article
        className={`discovery-row ${selected ? "is-retained" : ""}`}
        key={item.key}
      >
        <Artwork url={item.cover} />
        <div className="discovery-track-copy">
          {playable && resolved.trackId ? (
            <button
              className="discovery-title"
              onClick={() => navigate("track/" + resolved.trackId)}
            >
              {item.title}
            </button>
          ) : (
            <h3>{item.title}</h3>
          )}
          <p>
            {item.author}
            {item.style ? ` · ${item.style}` : ""}
          </p>
          <span className="discovery-reason" title={item.reasonDetail}>
            {inSelection ? status(resolved) : item.reason}
          </span>
          {tab === "external" ||
          (inSelection && !item.key.startsWith("local:")) ? (
            <a
              className="catalogue-link"
              href={item.url}
              target="_blank"
              rel="noreferrer"
            >
              {item.source === "iTunes" ? (
                <img
                  className="itunes-badge"
                  src="/itunes-store-badge.png"
                  alt={`Obtenir ${item.title} sur l’iTunes Store`}
                  width={131}
                  height={38}
                />
              ) : (
                <>
                  Voir sur {item.source}{" "}
                  <ExternalLink size={12} aria-hidden="true" />
                </>
              )}
            </a>
          ) : null}
        </div>
        <div className="discovery-tempo">
          {(fresh?.bpm ?? item.bpm) != null ? (
            <>
              <strong>
                {number((fresh?.bpm ?? item.bpm)!)} <small>BPM</small>
              </strong>
              {item.delta != null && (
                <span>
                  {item.delta > 0 ? "+" : ""}
                  {number(item.delta)} BPM
                </span>
              )}
            </>
          ) : (
            <span>BPM inconnu</span>
          )}
          {!inSelection && playable && tab === "external" && (
            <span>Déjà dans MyLib</span>
          )}
        </div>
        <div className="discovery-row-actions">
          {audible ? (
            <button
              className="secondary"
              aria-label={`${playable ? "Écouter" : "Écouter l’extrait de"} ${item.title}`}
              onClick={() => hear(resolved)}
            >
              <Play size={15} aria-hidden="true" />
              {isCurrent ? "En écoute" : playable ? "Écouter" : "Extrait"}
            </button>
          ) : (
            <span className="discovery-no-preview">Extrait indisponible</span>
          )}
          <button
            className={`secondary retain-button ${selected ? "selected" : ""}`}
            disabled={waiting || !selectionLoaded || !!selectionError}
            aria-pressed={selected}
            aria-label={`${selected ? "Retirer de la sélection" : "Retenir"} ${item.title}`}
            onClick={() => void retain(item)}
          >
            {waiting ? (
              <LoaderCircle size={16} className="spin" aria-hidden="true" />
            ) : selected ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <Plus size={16} aria-hidden="true" />
            )}
            {selected ? (inSelection ? "Retirer" : "Retenu") : "Retenir"}
          </button>
          {inSelection && !resolved.available && (
            <>
              {!resolved.trackId && resolved.status !== "missing" && (
                <button
                  className="secondary"
                  onClick={() => {
                    setImportIdea(resolved);
                    setImportUrl("");
                    open("import");
                  }}
                >
                  Importer un lien
                </button>
              )}
              {resolved.trackId &&
                ["error", "interrupted"].includes(resolved.status) && (
                  <button
                    className="secondary"
                    disabled={waiting}
                    onClick={() => void importAction(resolved, "retry")}
                  >
                    Reprendre l’import
                  </button>
                )}
              {resolved.trackId &&
                !["error", "interrupted", "ready", "missing"].includes(
                  resolved.status,
                ) && (
                  <button
                    className="secondary"
                    disabled={waiting}
                    onClick={() => void importAction(resolved, "cancel")}
                  >
                    Annuler l’import
                  </button>
                )}
            </>
          )}
        </div>
        {rowErrors[item.key] && (
          <div className="discovery-row-error" role="alert">
            <p>{rowErrors[item.key]}</p>
            <button
              className="secondary"
              disabled={waiting}
              onClick={() => {
                const action = rowErrorActions[item.key];
                if (action === "retry" || action === "cancel")
                  void importAction(resolved, action);
                else void retain(item);
              }}
            >
              Réessayer
            </button>
          </div>
        )}
        {inSelection && resolved.error && (
          <p className="discovery-row-error" role="alert">
            {resolved.error}
          </p>
        )}
      </article>
    );
  };
  return (
    <section
      className="discovery-workspace"
      hidden={!visible}
      aria-labelledby="discovery-title"
    >
      <div className="discovery-top-actions">
        <button
          className="back-button"
          onClick={() => navigate(sourceId ? `track/${sourceId}` : "library")}
        >
          <ArrowLeft size={16} aria-hidden="true" />{" "}
          {sourceId ? "Retour au morceau" : "Bibliothèque"}
        </button>
        {!selectionMode && (
          <button className="secondary" onClick={() => navigate("selection")}>
            <ListMusic size={17} aria-hidden="true" />
            Ma sélection · {ideas.length}
          </button>
        )}
      </div>
      <span className="eyebrow">
        {selectionMode ? "VOTRE SÉLECTION" : "TROUVER LE PROCHAIN TITRE"}
      </span>
      <h1 id="discovery-title" tabIndex={-1}>
        {selectionMode
          ? "Des idées pour votre prochain set."
          : source
            ? `Autour de ${source.title}.`
            : "Votre point de départ."}
      </h1>
      <p className="discovery-intro">
        {selectionMode
          ? "Retenez vos idées au fil des écoutes, puis préparez votre playlist."
          : "Écoutez les suggestions et retenez les titres qui vous inspirent."}
      </p>
      {selectionError && !selectionMode && (
        <div className="discovery-feedback" role="alert">
          <p>Votre sélection ne peut pas être actualisée. {selectionError}</p>
          <button className="secondary" onClick={() => void loadSelection()}>
            Réessayer
          </button>
        </div>
      )}
      {selectionMode ? (
        <>
          <button
            className="secondary discovery-continue"
            onClick={() =>
              navigate(sourceId ? `discover/${sourceId}` : "discover")
            }
          >
            <ArrowLeft size={16} aria-hidden="true" />
            Continuer l’exploration
          </button>
          {!selectionLoaded && (
            <p role="status">Chargement de votre sélection…</p>
          )}
          {selectionError && (
            <div className="discovery-feedback" role="alert">
              <p>{selectionError}</p>
              <button
                className="secondary"
                onClick={() => void loadSelection()}
              >
                Réessayer
              </button>
            </div>
          )}
          <h2 className="discovery-section-heading">
            {ideas.length} titre{ideas.length !== 1 ? "s" : ""} retenu
            {ideas.length !== 1 ? "s" : ""}
          </h2>
          <p>
            Votre sélection est conservée sur ce Mac, même lorsque vous quittez
            la recherche.
          </p>
          {!ideas.length && selectionLoaded && !selectionError && (
            <div className="discovery-empty">
              <Disc3 size={30} aria-hidden="true" />
              <h2>Vos prochaines idées commencent ici.</h2>
              <p>Retenez un morceau de votre bibliothèque ou une découverte.</p>
              <button
                className="primary"
                onClick={() =>
                  navigate(sourceId ? `discover/${sourceId}` : "discover")
                }
              >
                Explorer des titres
              </button>
            </div>
          )}
          <div className="discovery-list">
            {ideas.map((i) => renderRow(i, true))}
          </div>
          {!!ideas.length && (
            <section className="discovery-save panel">
              <div>
                <h2>Préparer la playlist</h2>
                <p>
                  {available.length
                    ? `${available.length} titre${available.length > 1 ? "s sont disponibles" : " est disponible"} dans MyLib.`
                    : "Importez un titre pour pouvoir l’écouter dans une playlist MyLib."}
                </p>
                {unavailableCount > 0 && (
                  <p>
                    {unavailableCount} idée
                    {unavailableCount > 1 ? "s" : ""} encore indisponible
                    {unavailableCount > 1 ? "s" : ""}{" "}
                    {unavailableCount > 1 ? "restent" : "reste"} dans votre
                    sélection.
                  </p>
                )}
              </div>
              {available.length > 0 && (
                <button
                  className="primary"
                  disabled={!!selectionError}
                  onClick={() => {
                    setDestination("");
                    setPlaylistName("");
                    open("playlist");
                  }}
                >
                  Enregistrer {available.length} titre
                  {available.length > 1 ? "s" : ""} en playlist
                </button>
              )}
            </section>
          )}
        </>
      ) : !source ? (
        <div className="discovery-empty">
          <Disc3 size={32} aria-hidden="true" />
          <h2>
            {sourceId
              ? "Ce morceau n’est plus dans MyLib."
              : "Quel morceau vous inspire ?"}
          </h2>
          <p>Choisissez un titre de votre bibliothèque pour commencer.</p>
          <button className="primary" onClick={() => open("change")}>
            Choisir un morceau
          </button>
        </div>
      ) : (
        <>
          <section className="discovery-reference panel">
            <Artwork
              url={source.hasCover ? `/api/tracks/${source.id}/cover` : null}
            />
            <div>
              <span className="eyebrow">VOTRE POINT DE DÉPART</span>
              <h2>{source.title}</h2>
              <p>
                {source.author}
                {source.bpm && source.quality === "stable"
                  ? ` · ${number(source.bpm * source.factor)} BPM`
                  : " · Tempo à confirmer"}
              </p>
            </div>
            <div className="discovery-reference-actions">
              <button
                className="secondary"
                disabled={!source.mediaReady}
                onClick={() => play(source.id)}
              >
                <Play size={15} aria-hidden="true" />
                Réécouter
              </button>
              {changeButton}
            </div>
          </section>
          <div className="discovery-toolbar">
            <div
              className="discovery-tabs"
              role="tablist"
              aria-label="Origine des suggestions"
            >
              {(
                [
                  ["local", "Ma bibliothèque"],
                  ["external", "Découvrir"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  id={`discovery-tab-${key}`}
                  role="tab"
                  aria-selected={tab === key}
                  aria-controls="discovery-results"
                  tabIndex={tab === key ? 0 : -1}
                  onKeyDown={(e) => {
                    if (
                      ["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
                    ) {
                      e.preventDefault();
                      const next =
                        e.key === "Home"
                          ? "local"
                          : e.key === "End"
                            ? "external"
                            : tab === "local"
                              ? "external"
                              : "local";
                      setTab(next);
                      document.getElementById(`discovery-tab-${next}`)?.focus();
                    }
                  }}
                  onClick={() => setTab(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              className="secondary"
              onClick={() => {
                setDraft(criteria);
                open("refine");
              }}
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              Affiner
            </button>
          </div>
          <div
            id="discovery-results"
            role="tabpanel"
            aria-labelledby={`discovery-tab-${tab}`}
            aria-busy={loading}
          >
            <div className="discovery-list-heading">
              <h2>
                {tab === "local"
                  ? "Des titres déjà chez vous"
                  : "De nouveaux titres à explorer"}
              </h2>
              <p>
                {criteria.reference === "artist"
                  ? "À partir de l’artiste"
                  : criteria.reference === "style"
                    ? "À partir du style"
                    : "À partir du morceau"}{" "}
                {tab === "external"
                  ? "· Tempo non évalué"
                  : `· Tempo connu à ±${criteria.tolerance} BPM`}
                {criteria.term ? ` · « ${criteria.term} »` : ""}
              </p>
              {tab === "external" && (
                <p>
                  Catalogue iTunes · BPM inconnus avant import et analyse.
                  Extraits fournis gracieusement par iTunes.
                </p>
              )}
            </div>
            {searchError && (
              <div className="discovery-feedback" role="alert">
                <p>{searchError}</p>
                <button
                  className="secondary"
                  onClick={() => setRetry((n) => n + 1)}
                >
                  Réessayer la recherche
                </button>
              </div>
            )}
            {loading && (
              <p className="discovery-loading" role="status">
                <LoaderCircle size={16} className="spin" aria-hidden="true" />
                {tab === "external"
                  ? "Recherche de nouveaux titres…"
                  : "Recherche dans votre bibliothèque…"}
              </p>
            )}
            {!result && loading && (
              <div className="dj-skeleton" aria-hidden="true">
                <div />
                <div />
                <div />
              </div>
            )}
            {result?.message && (
              <p className="discovery-caption">{result.message}</p>
            )}
            {result && !loading && !searchError && !result.items.length && (
              <div className="discovery-empty">
                <Search size={30} aria-hidden="true" />
                <h2>Aucun titre trouvé pour cette référence.</h2>
                <p>
                  {tab === "local"
                    ? "Essayez un tempo plus large, un autre artiste ou découvrez de nouveaux titres."
                    : "Précisez un artiste ou un style dans Affiner."}
                </p>
                <div>
                  {criteria.tolerance < 10 && tab === "local" && (
                    <button
                      className="secondary"
                      onClick={() =>
                        setCriteria((c) => ({ ...c, tolerance: 10 }))
                      }
                    >
                      Élargir à ±10 BPM
                    </button>
                  )}
                  <button
                    className="secondary"
                    onClick={() => {
                      setDraft(criteria);
                      open("refine");
                    }}
                  >
                    Affiner la recherche
                  </button>
                  {tab === "local" && (
                    <button
                      className="secondary"
                      onClick={() => setTab("external")}
                    >
                      Découvrir des titres
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="discovery-list">
              {!searchError && result?.items.map((i) => renderRow(i))}
            </div>
            {result &&
              result.total > result.items.length &&
              !loading &&
              !searchError && (
                <button
                  className="secondary discovery-more"
                  disabled={limit >= 50}
                  onClick={() => setLimit((n) => Math.min(50, n + 8))}
                >
                  Voir davantage
                </button>
              )}
            <p className="discovery-caption">
              La proximité de style ou de tempo guide votre écoute. Préparez
              votre transition à l’oreille.
            </p>
          </div>
        </>
      )}
      <div className="discovery-announcement" role="status" aria-live="polite">
        {notice}
        {notice && (
          <button
            aria-label="Fermer le message de sélection"
            onClick={() => setNotice("")}
          >
            <X size={16} />
          </button>
        )}
        {undo && (
          <button
            className="secondary"
            disabled={pending.includes("undo")}
            onClick={async () => {
              setPending((p) => [...p, "undo"]);
              try {
                await api(`/discovery/undo/${undo.token}`, "POST");
                await refresh();
                setUndo(null);
                setNotice(`Ajout à « ${undo.name} » annulé.`);
              } catch (e) {
                setNotice((e as Error).message);
              } finally {
                setPending((p) => p.filter((k) => k !== "undo"));
              }
            }}
          >
            Annuler l’ajout à {undo.name}
          </button>
        )}
      </div>
      <dialog
        ref={dialog}
        className={`discovery-dialog ${modal === "refine" ? "discovery-refine" : ""}`}
        aria-labelledby="discovery-dialog-title"
        onCancel={(e) => {
          e.preventDefault();
          close();
        }}
      >
        <div className="dialog-heading">
          <h2 id="discovery-dialog-title">
            {modal === "refine"
              ? "Affiner les suggestions"
              : modal === "change"
                ? "Votre point de départ"
                : modal === "import"
                  ? "Importer le morceau retenu"
                  : "Enregistrer dans une playlist"}
          </h2>
          <button
            className="icon-button"
            aria-label="Fermer la fenêtre de découverte"
            disabled={busy}
            onClick={close}
          >
            <X size={20} />
          </button>
        </div>
        {modal === "refine" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setCriteria(draft);
              setLimit(8);
              setModal(null);
            }}
          >
            <p>
              Le point de départ s’applique aux deux onglets. Le tempo affine
              les titres analysés de votre bibliothèque.
            </p>
            <fieldset>
              <legend>Que souhaitez-vous retrouver ?</legend>
              {(
                [
                  ["track", "Ce morceau", "Sa version et son univers musical"],
                  [
                    "artist",
                    "Cet artiste",
                    source?.author || "L’artiste de référence",
                  ],
                  [
                    "style",
                    "Ce style",
                    "Le style estimé ou corrigé du morceau",
                  ],
                ] as const
              ).map(([key, title, help]) => (
                <label className="discovery-choice" key={key}>
                  <input
                    type="radio"
                    name="reference"
                    value={key}
                    checked={draft.reference === key}
                    onChange={() => setDraft((d) => ({ ...d, reference: key }))}
                  />
                  <span>
                    <strong>{title}</strong>
                    <small>{help}</small>
                  </span>
                </label>
              ))}
            </fieldset>
            <fieldset>
              <legend>Proximité de tempo</legend>
              <p>
                Dans Ma bibliothèque, pour les morceaux dont le BPM est connu.
              </p>
              <div className="discovery-tempo-choices">
                {([2, 5, 10] as const).map((n) => (
                  <label key={n}>
                    <input
                      type="radio"
                      name="tolerance"
                      checked={draft.tolerance === n}
                      onChange={() => setDraft((d) => ({ ...d, tolerance: n }))}
                    />
                    ±{n} BPM
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="discovery-field">
              Préciser la recherche{" "}
              <small>
                Facultatif · un artiste, un titre ou un style. Utile si l’import
                indique un nom de chaîne.
              </small>
              <input
                value={draft.term}
                maxLength={160}
                placeholder="Ex. Black Coffee, Afro House…"
                onChange={(e) =>
                  setDraft((d) => ({ ...d, term: e.target.value }))
                }
              />
            </label>
            <p className="discovery-caption">
              Dans Découvrir, un BPM inconnu reste visible sans promesse de
              tempo proche.
            </p>
            <div className="dialog-buttons">
              <button
                type="button"
                className="secondary"
                onClick={() => setDraft(defaults)}
              >
                Réinitialiser
              </button>
              <button className="primary">Afficher les suggestions</button>
            </div>
          </form>
        )}
        {modal === "change" && (
          <>
            <label className="discovery-field">
              Rechercher dans votre bibliothèque
              <input
                autoFocus
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                placeholder="Titre ou artiste"
              />
            </label>
            <div className="discovery-picker">
              {filteredTracks.map((t) => (
                <button
                  className="discovery-picker-row"
                  key={t.id}
                  onClick={() => {
                    setModal(null);
                    navigate(`discover/${t.id}`);
                  }}
                >
                  <Artwork
                    url={t.hasCover ? `/api/tracks/${t.id}/cover` : null}
                  />
                  <span>
                    <strong>{t.title}</strong>
                    <small>{t.author}</small>
                  </span>
                </button>
              ))}
              {!!tracks.length && !filteredTracks.length && (
                <div className="discovery-empty">
                  <p>Aucun morceau ne correspond à « {pickerQuery} ».</p>
                  <button
                    className="secondary"
                    onClick={() => setPickerQuery("")}
                  >
                    Effacer la recherche
                  </button>
                </div>
              )}
              {!tracks.length && (
                <p>Importez un premier morceau dans votre bibliothèque.</p>
              )}
            </div>
          </>
        )}
        {modal === "playlist" && (
          <form onSubmit={savePlaylist}>
            <p>
              {available.length} titre
              {available.length > 1
                ? "s disponibles seront ajoutés"
                : " disponible sera ajouté"}
              . Les autres idées restent dans votre sélection.
            </p>
            <label className="discovery-field">
              Playlist
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
              >
                <option value="">Créer une nouvelle playlist</option>
                {playlists.map((p) => (
                  <option value={p.id} key={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            {!destination && (
              <label className="discovery-field">
                Nom de la nouvelle playlist
                <input
                  required
                  autoFocus
                  value={playlistName}
                  maxLength={120}
                  placeholder="Ex. Warm-up du samedi"
                  onChange={(e) => setPlaylistName(e.target.value)}
                />
              </label>
            )}
            <div className="dialog-buttons">
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={close}
              >
                Annuler
              </button>
              <button
                className="primary"
                disabled={busy || (!destination && !playlistName.trim())}
              >
                {busy ? "Enregistrement…" : "Enregistrer les titres"}
              </button>
            </div>
          </form>
        )}
        {modal === "import" && importIdea && (
          <form onSubmit={importLink}>
            <p>
              <strong>{importIdea.title}</strong>
              <br />
              {importIdea.author}
            </p>
            <p className="discovery-caption">
              Choisissez le lien de cette version précise. Le catalogue iTunes
              ne fournit pas de fichier importable.
            </p>
            <a
              className="catalogue-link"
              href={importIdea.url}
              target="_blank"
              rel="noreferrer"
            >
              Voir le titre sur iTunes <ExternalLink size={14} />
            </a>
            <label className="discovery-field">
              Lien YouTube, SoundCloud ou Spotify
              <input
                type="url"
                required
                autoFocus
                value={importUrl}
                maxLength={3000}
                placeholder="https://…"
                onChange={(e) => setImportUrl(e.target.value)}
              />
            </label>
            {importUrl.includes("open.spotify.com") && (
              <SpotifyConnection needed />
            )}
            <div className="dialog-buttons">
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={close}
              >
                Plus tard
              </button>
              <button className="primary" disabled={busy || !importUrl.trim()}>
                {busy ? "Lancement…" : "Importer et associer"}
              </button>
            </div>
          </form>
        )}
        {modalError && (
          <p className="modal-error" role="alert">
            {modalError}
          </p>
        )}
      </dialog>
    </section>
  );
});
