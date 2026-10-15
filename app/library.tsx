"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronRight,
  Disc3,
  Download,
  FolderOpen,
  FolderPlus,
  Headphones,
  Library as LibraryIcon,
  Link2,
  ListMusic,
  LoaderCircle,
  MoreHorizontal,
  Music2,
  Pause,
  Play,
  Plus,
  Repeat2,
  Search,
  SkipBack,
  SkipForward,
  Trash2,
  Volume2,
  X,
  ZoomIn,
  ZoomOut,
  Pencil,
  GripVertical,
  Info,
  RefreshCw,
} from "lucide-react";
import Waveform from "./waveform";
import { apiFetch } from "../lib/api-fetch";
import { Recommendations, StyleBadge } from "./dj";
import SpotifyConnection from "./spotify-connection";
import Discovery, { type Idea } from "./discovery";
import { selectionTempo, formatTime } from "../lib/tempo.mjs";

type Track = {
  id: string;
  url: string;
  source: string;
  title: string;
  author: string;
  duration: number;
  created: number;
  status: string;
  progress: number | null;
  error: string | null;
  mediaReady: boolean;
  analysisReady: boolean;
  factor: number;
  bpm: number | null;
  span: number[] | null;
  quality: string;
  hasCover: boolean;
  styleStatus?: string;
  styleOverride?: string | null;
  styleError?: string | null;
  styles?: { label: string; score: number }[];
  previewUrl?: string;
  coverUrl?: string | null;
  storeUrl?: string;
};
type Playlist = { id: string; name: string; tracks: string[] };
type Analysis = {
  points: [number, number | null, number][];
  peaks: number[];
  bpm: number | null;
  span: number[] | null;
  quality: string;
};
type Modal = {
  type: "create" | "rename" | "deletePlaylist" | "deleteTrack" | "add";
  id?: string;
};
const activeStates = ["queued", "metadata", "download", "prepare", "analyze"];
const states: Record<string, string> = {
  queued: "En attente",
  metadata: "Recherche du morceau",
  download: "Récupération de l’audio",
  prepare: "Préparation de l’écoute",
  analyze: "Analyse du rythme",
  error: "Traitement à reprendre",
  interrupted: "Traitement interrompu",
  ready: "Prêt",
};
const api = async (path: string, method = "GET", body?: unknown) => {
  const response = await apiFetch("/api" + path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    let message = "Une erreur est survenue.";
    try {
      const data = await response.json();
      message = typeof data.detail === "string" ? data.detail : message;
    } catch {}
    throw new Error(message);
  }
  return response.json();
};
const bpmText = (value: number | null | undefined) =>
  value ? value.toLocaleString("fr-FR", { maximumFractionDigits: 1 }) : "—";
function Cover({ track, large = false }: { track?: Track; large?: boolean }) {
  return (
    <div className={`cover ${large ? "large" : ""}`}>
      {track?.hasCover ? (
        <img src={track.coverUrl || `/api/tracks/${track.id}/cover`} alt="" />
      ) : (
        <Disc3 aria-hidden="true" />
      )}
    </div>
  );
}
function IconButton({
  label,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      className="icon-button"
      type="button"
      aria-label={label}
      title={label}
      {...props}
    >
      {children}
    </button>
  );
}
export default function Library() {
  const [tracks, setTracks] = useState<Track[]>([]),
    [playlists, setPlaylists] = useState<Playlist[]>([]),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [refreshError, setRefreshError] = useState(""),
    [notice, setNotice] = useState("");
  const [url, setUrl] = useState(""),
    [importing, setImporting] = useState(false),
    [query, setQuery] = useState(""),
    [sort, setSort] = useState("recent"),
    [location, setLocation] = useState("library");
  const [spotifyNeeded, setSpotifyNeeded] = useState(false);
  const [discoverySource, setDiscoverySource] = useState<string | null>(null);
  const [previewTrack, setPreviewTrack] = useState<Track | null>(null);
  const [analysisMap, setAnalysisMap] = useState<Record<string, Analysis>>({}),
    [viewTrack, setViewTrack] = useState<string | null>(null);
  const [current, setCurrent] = useState<string | null>(null),
    [playing, setPlaying] = useState(false),
    [time, setTime] = useState(0),
    [volume, setVolume] = useState(0.75),
    [queue, setQueue] = useState<string[]>([]);
  const [start, setStart] = useState(0),
    [end, setEnd] = useState(0),
    [loop, setLoop] = useState(false),
    [localFactor, setLocalFactor] = useState(1),
    [zoom, setZoom] = useState(1);
  const [modal, setModal] = useState<Modal | null>(null),
    [modalName, setModalName] = useState(""),
    [modalError, setModalError] = useState(""),
    [busy, setBusy] = useState(false),
    [menu, setMenu] = useState<string | null>(null),
    [exporting, setExporting] = useState<string | null>(null),
    [revealing, setRevealing] = useState<string | null>(null);
  const [dragged, setDragged] = useState<string | null>(null),
    [bpmAnnouncement, setBpmAnnouncement] = useState("");
  const audio = useRef<HTMLAudioElement>(null),
    selectionRef = useRef({
      start: 0,
      end: 0,
      loop: false,
      id: null as string | null,
    }),
    restoreTime = useRef(0),
    requestedTime = useRef<number | null>(null),
    playRequested = useRef(false),
    dialog = useRef<HTMLDialogElement>(null),
    opener = useRef<HTMLElement | null>(null);
  const currentTrack =
      tracks.find((t) => t.id === current) ||
      (previewTrack?.id === current ? previewTrack : undefined),
    detail = tracks.find((t) => t.id === viewTrack),
    playlist = playlists.find((p) => location === "playlist/" + p.id),
    analysis = detail ? analysisMap[detail.id] : null;
  const refresh = useCallback(async () => {
    try {
      const data = await api("/library");
      setTracks(data.tracks);
      setPlaylists(data.playlists);
      setRefreshError("");
      setLoaded(true);
    } catch (e) {
      setRefreshError((e as Error).message);
      setLoaded(true);
    }
  }, []);
  useEffect(() => {
    if (!refreshError) return;
    const retry = setInterval(() => void refresh(), 3000);
    return () => clearInterval(retry);
  }, [refreshError, refresh]);
  useEffect(() => {
    void refresh();
    const navigate = () => {
      const hash =
        decodeURIComponent(window.location.hash.slice(1)) || "library";
      if (hash.startsWith("discover/")) {
        setDiscoverySource(hash.slice(9));
        try {
          localStorage.setItem("mylib-discovery-source", hash.slice(9));
        } catch {}
        setViewTrack(null);
        setLocation("discover");
      } else if (hash === "discover" || hash === "selection") {
        setViewTrack(null);
        setLocation(hash);
      } else if (hash.startsWith("track/")) {
        setViewTrack(hash.slice(6));
        setLocation("library");
      } else {
        setLocation(hash);
        setViewTrack(null);
      }
      setQuery("");
      setMenu(null);
    };
    try {
      const savedSource = localStorage.getItem("mylib-discovery-source");
      if (savedSource) setDiscoverySource(savedSource);
    } catch {}
    navigate();
    window.addEventListener("hashchange", navigate);
    try {
      const saved = JSON.parse(localStorage.getItem("mylib-player") || "null");
      if (saved) {
        setCurrent(saved.id);
        restoreTime.current = saved.time || 0;
      }
    } catch {}
    return () => window.removeEventListener("hashchange", navigate);
  }, [refresh]);
  useEffect(() => {
    if (
      !tracks.some(
        (t) =>
          activeStates.includes(t.status) ||
          (t.mediaReady &&
            (!t.styleStatus || ["pending", "running"].includes(t.styleStatus))),
      )
    )
      return;
    const interval = setInterval(refresh, 1000);
    return () => clearInterval(interval);
  }, [tracks, refresh]);
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(id);
  }, [notice]);
  useEffect(() => {
    if (!detail) return;
    setStart(0);
    setEnd(detail.duration);
    setZoom(1);
    setLocalFactor(1);
    setLoop(false);
  }, [detail?.id, detail?.duration]);
  useEffect(() => {
    selectionRef.current = { start, end, loop, id: viewTrack };
  }, [start, end, loop, viewTrack]);
  useEffect(() => {
    const ids = tracks
      .filter((t) => t.analysisReady && !analysisMap[t.id])
      .map((t) => t.id);
    let ignore = false;
    for (const id of ids)
      void api(`/tracks/${id}/analysis`)
        .then((data) => {
          if (!ignore) setAnalysisMap((old) => ({ ...old, [id]: data }));
        })
        .catch(() => {});
    return () => {
      ignore = true;
    };
  }, [tracks, analysisMap]);
  useEffect(() => {
    if (audio.current) audio.current.volume = volume;
  }, [volume]);
  useEffect(() => {
    if (!current || !audio.current) return;
    const a = audio.current;
    const saved = restoreTime.current;
    restoreTime.current = 0;
    const restore = () => {
      const target = requestedTime.current ?? saved;
      requestedTime.current = null;
      if (target) a.currentTime = Math.min(target, a.duration || target);
    };
    a.addEventListener("loadedmetadata", restore, { once: true });
    if (playRequested.current) {
      playRequested.current = false;
      void a
        .play()
        .catch(() =>
          setError("Lecture impossible. Vérifiez le fichier audio."),
        );
    }
    return () => a.removeEventListener("loadedmetadata", restore);
  }, [current]);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (
        e.code === "Space" &&
        !el.closest(
          'input,textarea,select,button,[role="slider"],dialog,[contenteditable]',
        )
      ) {
        e.preventDefault();
        if (audio.current && current) {
          if (audio.current.paused)
            void audio.current
              .play()
              .catch(() =>
                setError("Lecture impossible. Vérifiez le fichier audio."),
              );
          else audio.current.pause();
        }
      }
      if (e.key === "Escape") setMenu(null);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [current]);
  useEffect(() => {
    if (modal) {
      opener.current = document.activeElement as HTMLElement;
      dialog.current?.showModal();
    } else {
      dialog.current?.close();
      opener.current?.focus();
    }
  }, [modal]);
  useEffect(() => {
    if (
      !loaded ||
      !current ||
      current.startsWith("preview:") ||
      tracks.some((t) => t.id === current)
    )
      return;
    audio.current?.pause();
    setCurrent(null);
    setQueue((q) => q.filter((id) => tracks.some((t) => t.id === id)));
  }, [tracks, current, loaded]);
  const selection = useMemo(
    () => selectionTempo(analysis?.points || [], start, end, localFactor),
    [analysis, start, end, localFactor],
  );
  useEffect(() => {
    const timer = setTimeout(
      () =>
        setBpmAnnouncement(
          selection.bpm
            ? `${bpmText(selection.bpm)} BPM, ${selection.quality}`
            : selection.quality,
        ),
      500,
    );
    return () => clearTimeout(timer);
  }, [selection]);
  const list = useMemo(() => {
    let items = playlist
      ? (playlist.tracks
          .map((id) => tracks.find((t) => t.id === id))
          .filter(Boolean) as Track[])
      : [...tracks].sort((a, b) => b.created - a.created);
    items = items.filter((t) =>
      (t.title + " " + t.author)
        .toLocaleLowerCase("fr")
        .includes(query.toLocaleLowerCase("fr")),
    );
    if (!playlist) {
      if (sort === "title")
        items.sort((a, b) => a.title.localeCompare(b.title, "fr"));
      if (sort === "bpm")
        items.sort(
          (a, b) =>
            (a.bpm ? a.bpm * a.factor : Infinity) -
            (b.bpm ? b.bpm * b.factor : Infinity),
        );
    }
    return items;
  }, [tracks, playlist, query, sort]);
  const ready = tracks.filter((t) => t.mediaReady),
    totalDuration = tracks.reduce((n, t) => n + t.duration, 0);
  const navigate = useCallback((target: string) => {
    window.location.hash = target;
    requestAnimationFrame(() =>
      document
        .querySelector<HTMLElement>(
          target.startsWith("discover") || target === "selection"
            ? "#discovery-title"
            : "#main",
        )
        ?.focus({ preventScroll: true }),
    );
  }, []);
  const openModal = useCallback(
    (next: Modal) => {
      setModalName(
        next.type === "rename"
          ? playlists.find((p) => p.id === next.id)?.name || ""
          : "",
      );
      setModalError("");
      setModal(next);
      setMenu(null);
    },
    [playlists],
  );
  const addRecommendation = useCallback(
    (id: string) => openModal({ type: "add", id }),
    [openModal],
  );
  async function act(path: string, method = "POST", body?: unknown) {
    try {
      await api(path, method, body);
      await refresh();
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    }
  }
  async function importLink(e: React.FormEvent) {
    e.preventDefault();
    if (importing) return;
    setImporting(true);
    setError("");
    try {
      if (new URL(url).hostname === "open.spotify.com") {
        const spotify = await api("/spotify/status");
        if (!spotify.connected) {
          setSpotifyNeeded(true);
          return;
        }
      }
      const result = await api("/import", "POST", { url });
      setNotice(
        result.duplicate
          ? "Ce morceau est déjà dans votre bibliothèque."
          : "Morceau ajouté. La préparation continue en arrière-plan.",
      );
      setUrl("");
      setSpotifyNeeded(false);
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setImporting(false);
    }
  }
  const play = useCallback(
    (id: string, ids?: string[], position?: number) => {
      const track = tracks.find((t) => t.id === id);
      if (!track?.mediaReady) return;
      if (ids)
        setQueue(ids.filter((i) => tracks.find((t) => t.id === i)?.mediaReady));
      else setQueue([id]);
      if (current === id) {
        if (position !== undefined && audio.current)
          audio.current.currentTime = position;
        void audio.current?.play().catch(() => setError("Lecture impossible."));
        return;
      }
      setTime(0);
      playRequested.current = true;
      requestedTime.current = position ?? null;
      setCurrent(id);
      if (id !== viewTrack) setLoop(false);
      restoreTime.current = 0;
    },
    [tracks, current, viewTrack],
  );
  const playPreview = useCallback(
    (item: Idea) => {
      if (!item.preview) return;
      const id = "preview:" + item.key;
      if (current === id) {
        void audio.current
          ?.play()
          .catch(() =>
            setError(
              "Cet extrait est indisponible. Ouvrez le titre sur iTunes.",
            ),
          );
        return;
      }
      setPreviewTrack({
        id,
        title: item.title,
        author: item.author,
        url: item.url,
        source: "iTunes",
        duration: 30,
        created: 0,
        status: "ready",
        progress: null,
        error: null,
        mediaReady: true,
        analysisReady: false,
        factor: 1,
        bpm: null,
        span: null,
        quality: "incertain",
        hasCover: !!item.cover,
        previewUrl: item.preview,
        coverUrl: item.cover,
        storeUrl: item.url,
      });
      setTime(0);
      setQueue([]);
      setLoop(false);
      restoreTime.current = 0;
      playRequested.current = true;
      setCurrent(id);
    },
    [current],
  );
  function toggle() {
    if (!audio.current || !current) return;
    if (playing) audio.current.pause();
    else void audio.current.play().catch(() => setError("Lecture impossible."));
  }
  function advance(delta: number) {
    const index = queue.indexOf(current || "");
    const next = queue[index + delta];
    if (next) play(next, queue);
    else if (delta > 0) {
      setPlaying(false);
      audio.current?.pause();
    }
  }
  function seek(value: number) {
    if (audio.current && current) {
      audio.current.currentTime = value;
      setTime(value);
    }
  }
  function select(a: number, b: number) {
    setStart(a);
    setEnd(b);
    if (
      loop &&
      current === viewTrack &&
      audio.current &&
      (audio.current.currentTime < a || audio.current.currentTime >= b)
    )
      seek(a);
  }
  async function exportTrack(track: Track) {
    if (exporting) return;
    setExporting(track.id);
    setError("");
    try {
      const prepared = await api(`/tracks/${track.id}/export`, "POST");
      if (prepared.format !== "mp3" || !prepared.filename.endsWith(".mp3"))
        throw new Error("Le fichier MP3 n’a pas pu être préparé.");
      const anchor = document.createElement("a");
      anchor.href = `/api/tracks/${track.id}/export`;
      anchor.download = prepared.filename;
      anchor.hidden = true;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      setNotice(
        track.bpm
          ? "Téléchargement MP3 lancé, avec le BPM global et les métadonnées."
          : "Téléchargement MP3 lancé. Aucun BPM fiable n’a été ajouté.",
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setExporting(null);
    }
  }
  async function revealSource(track: Track) {
    if (revealing) return;
    setRevealing(track.id);
    setError("");
    try {
      await api(`/tracks/${track.id}/reveal`, "POST");
      setNotice("Fichier source affiché dans le Finder.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRevealing(null);
    }
  }
  async function saveModal(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setModalError("");
    try {
      if (modal?.type === "create") {
        const result = await api("/playlists", "POST", { name: modalName });
        navigate("playlist/" + result.id);
      }
      if (modal?.type === "rename")
        await api("/playlists/" + modal.id, "PATCH", { name: modalName });
      if (modal?.type === "deletePlaylist") {
        await api("/playlists/" + modal.id, "DELETE");
        navigate("library");
      }
      if (modal?.type === "deleteTrack") {
        await api("/tracks/" + modal.id, "DELETE");
        if (current === modal.id) {
          audio.current?.pause();
          setCurrent(null);
        }
        if (viewTrack === modal.id) navigate("library");
      }
      await refresh();
      setModal(null);
    } catch (e) {
      setModalError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function reorder(id: string, delta: number, target?: string) {
    if (!playlist) return;
    const ids = [...playlist.tracks],
      from = ids.indexOf(id),
      to = target ? ids.indexOf(target) : from + delta;
    if (from < 0 || to < 0 || to >= ids.length) return;
    ids.splice(from, 1);
    ids.splice(to, 0, id);
    if (await act(`/playlists/${playlist.id}/order`, "PUT", { ids }))
      setNotice("Ordre de la playlist mis à jour.");
  }
  const trackMenu = (track: Track) => (
    <div className="track-actions">
      <IconButton
        label={`Ajouter ${track.title} à une playlist`}
        onClick={() => openModal({ type: "add", id: track.id })}
      >
        <FolderPlus size={18} />
      </IconButton>
      <IconButton
        label={`Exporter ${track.title} en MP3`}
        disabled={!track.mediaReady || !!exporting}
        onClick={() => void exportTrack(track)}
      >
        {exporting === track.id ? (
          <LoaderCircle className="spin" size={18} />
        ) : (
          <Download size={18} />
        )}
      </IconButton>
      <div className="menu-wrap">
        <IconButton
          label={`Options de ${track.title}`}
          aria-expanded={menu === track.id}
          onClick={() => setMenu(menu === track.id ? null : track.id)}
        >
          <MoreHorizontal size={20} />
        </IconButton>
        {menu === track.id && (
          <div className="menu">
            <button
              onClick={() => {
                navigate("track/" + track.id);
                setMenu(null);
              }}
            >
              <Activity size={16} /> Ouvrir l’analyse
            </button>
            <a href={track.url} target="_blank" rel="noreferrer">
              <Link2 size={16} /> Voir la source
            </a>
            {playlist && (
              <button
                onClick={() => {
                  void act(
                    `/playlists/${playlist.id}/tracks/${track.id}`,
                    "DELETE",
                  );
                  setMenu(null);
                }}
              >
                Retirer de cette playlist
              </button>
            )}
            <button
              className="danger"
              onClick={() => openModal({ type: "deleteTrack", id: track.id })}
            >
              <Trash2 size={16} /> Supprimer du Mac
            </button>
          </div>
        )}
      </div>
    </div>
  );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Aller au contenu
      </a>
      <aside className="sidebar" aria-label="Navigation de la bibliothèque">
        <a href="#library" className="brand">
          <span className="brand-icon">
            <Activity size={23} />
          </span>
          MyLib<span className="brand-dot">.</span>
        </a>
        <div className="space-label">VOTRE ESPACE MUSICAL</div>
        <button
          className={`nav-item ${location === "library" && !detail ? "active" : ""}`}
          onClick={() => navigate("library")}
        >
          <LibraryIcon size={19} /> Bibliothèque <span>{tracks.length}</span>
        </button>
        <button
          className={`nav-item ${location === "discover" ? "active" : ""}`}
          onClick={() =>
            navigate(
              discoverySource ? "discover/" + discoverySource : "discover",
            )
          }
        >
          <Search size={19} /> Titres similaires
        </button>
        <button
          className={`nav-item ${location === "selection" ? "active" : ""}`}
          onClick={() => navigate("selection")}
        >
          <Check size={19} /> Ma sélection
        </button>
        <div className="sidebar-heading">
          <span>PLAYLISTS</span>
          <IconButton
            label="Créer une playlist"
            onClick={() => openModal({ type: "create" })}
          >
            <Plus size={17} />
          </IconButton>
        </div>
        <nav aria-label="Playlists">
          {playlists.map((p) => (
            <button
              className={`nav-item ${playlist?.id === p.id ? "active" : ""}`}
              key={p.id}
              onClick={() => navigate("playlist/" + p.id)}
            >
              <ListMusic size={19} />
              <span className="nav-title">{p.name}</span>
              <small>{p.tracks.length}</small>
            </button>
          ))}
          {!playlists.length && (
            <button
              className="new-playlist"
              onClick={() => openModal({ type: "create" })}
            >
              <Plus size={16} /> Votre première playlist
            </button>
          )}
        </nav>
        <div className="local-card">
          <span className="local-dot" /> Tout reste sur votre Mac
          <p>
            Votre musique. Votre espace.
            <br />
            Aucun compte nécessaire.
          </p>
        </div>
        <div className="sidebar-footer">
          <Headphones size={16} /> Faites place à la musique.
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="breadcrumb">
            Votre espace <ChevronRight size={14} />{" "}
            <strong>
              {location === "discover"
                ? "Titres similaires"
                : location === "selection"
                  ? "Ma sélection"
                  : detail
                    ? "Analyse du morceau"
                    : playlist
                      ? "Playlist"
                      : "Bibliothèque"}
            </strong>
          </span>
          <span className="local-badge">
            <span className="local-dot" /> En local
          </span>
        </header>
        <main id="main" tabIndex={-1}>
          <section
            className="import-card"
            hidden={location === "discover" || location === "selection"}
          >
            <div className="import-copy">
              <span className="eyebrow">UNE NOUVELLE DÉCOUVERTE ?</span>
              <h2>Un lien. Et la musique est à vous.</h2>
              <p>Importez depuis YouTube, SoundCloud ou Spotify.</p>
            </div>
            <form onSubmit={importLink} className="import-form">
              <div className="link-field">
                <Link2 size={19} />
                <label className="sr-only" htmlFor="source-url">
                  Lien YouTube, SoundCloud ou Spotify
                </label>
                <input
                  id="source-url"
                  type="url"
                  required
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Collez votre lien ici…"
                  autoComplete="off"
                />
                <button className="primary" disabled={importing} type="submit">
                  {importing ? (
                    <LoaderCircle size={17} className="spin" />
                  ) : (
                    <Plus size={18} />
                  )}{" "}
                  {importing ? "Ajout…" : "Importer"}
                </button>
              </div>
              <span className="import-hint">
                Audio conservé localement · BPM analysés automatiquement
              </span>
              <SpotifyConnection needed={spotifyNeeded} />
            </form>
          </section>
          {(error || refreshError) && (
            <div className="alert error" role="alert">
              <Info size={18} />
              <span>
                {error || `${refreshError} Nouvelle tentative automatique…`}
              </span>
              <IconButton
                label="Fermer l’erreur"
                onClick={() => {
                  setError("");
                  setRefreshError("");
                }}
              >
                <X size={16} />
              </IconButton>
            </div>
          )}
          <Discovery
            visible={location === "discover" || location === "selection"}
            selectionMode={location === "selection"}
            sourceId={discoverySource}
            tracks={tracks}
            playlists={playlists}
            play={play}
            preview={playPreview}
            current={current}
            playing={playing}
            refresh={refresh}
            navigate={navigate}
          />
          {location === "discover" ||
          location === "selection" ? null : detail ? (
            <>
              <button
                className="back-button"
                onClick={() => navigate("library")}
              >
                <ArrowLeft size={16} /> Retour à la bibliothèque
              </button>
              <section className="detail-heading">
                <Cover track={detail} large />
                <div>
                  <span className="eyebrow">
                    {detail.source} · {formatTime(detail.duration)}
                  </span>
                  <h1>{detail.title}</h1>
                  <p>{detail.author}</p>
                  <StyleBadge
                    key={detail.id}
                    track={detail}
                    refresh={refresh}
                  />
                  <div className="detail-buttons">
                    <button
                      className="primary"
                      onClick={() => navigate("discover/" + detail.id)}
                    >
                      <Search size={17} /> Titres similaires
                    </button>
                    <button
                      className="primary"
                      disabled={!detail.mediaReady}
                      onClick={() => play(detail.id)}
                    >
                      <Play size={17} /> Écouter
                    </button>
                    <button
                      className="secondary"
                      onClick={() => openModal({ type: "add", id: detail.id })}
                    >
                      <FolderPlus size={17} /> Ajouter à une playlist
                    </button>
                    <button
                      className="secondary"
                      disabled={!detail.mediaReady || !!exporting}
                      onClick={() => void exportTrack(detail)}
                    >
                      {exporting === detail.id ? (
                        <LoaderCircle size={17} className="spin" />
                      ) : (
                        <Download size={17} />
                      )}{" "}
                      MP3 complet
                    </button>
                    <button
                      className="secondary finder-source"
                      disabled={!detail.mediaReady || !!revealing}
                      aria-busy={revealing === detail.id}
                      title="Le Finder s’ouvre avec le fichier source sélectionné."
                      onClick={() => void revealSource(detail)}
                    >
                      {revealing === detail.id ? (
                        <LoaderCircle size={17} className="spin" />
                      ) : (
                        <FolderOpen size={17} />
                      )}{" "}
                      {revealing === detail.id
                        ? "Ouverture…"
                        : "Afficher dans le Finder"}
                    </button>
                  </div>
                </div>
              </section>
              <div className="analysis-grid">
                <section className="panel wave-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Explorez le rythme</h2>
                      <p>
                        Déplacez les deux curseurs. Le BPM suit votre sélection.
                      </p>
                    </div>
                    <div className="zoom-controls">
                      <IconButton
                        label="Dézoomer la forme d’onde"
                        disabled={zoom <= 1}
                        onClick={() => setZoom((z) => Math.max(1, z / 2))}
                      >
                        <ZoomOut size={18} />
                      </IconButton>
                      <span>×{zoom}</span>
                      <IconButton
                        label="Zoomer la forme d’onde"
                        disabled={zoom >= 16}
                        onClick={() => setZoom((z) => Math.min(16, z * 2))}
                      >
                        <ZoomIn size={18} />
                      </IconButton>
                    </div>
                  </div>
                  {analysis ? (
                    <Waveform
                      peaks={analysis.peaks}
                      duration={detail.duration}
                      time={current === detail.id ? time : 0}
                      start={start}
                      end={end}
                      onSelect={select}
                      onSeek={(value) => {
                        if (current !== detail.id) {
                          play(detail.id, undefined, value);
                        } else seek(value);
                      }}
                      zoom={zoom}
                    />
                  ) : (
                    <div className="wave-pending">
                      <Activity size={32} />
                      <p>
                        {detail.error ||
                          "La forme d’onde apparaît après l’analyse du morceau."}
                      </p>
                      {activeStates.includes(detail.status) && (
                        <span>
                          {states[detail.status]}
                          {detail.progress !== null
                            ? ` · ${detail.progress} %`
                            : ""}
                        </span>
                      )}
                      {["error", "interrupted"].includes(detail.status) && (
                        <button
                          className="secondary"
                          onClick={() => void act(`/tracks/${detail.id}/retry`)}
                        >
                          Reprendre l’analyse
                        </button>
                      )}
                    </div>
                  )}
                  <div className="wave-times">
                    <span>0:00</span>
                    <span>{formatTime(detail.duration)}</span>
                  </div>
                  <div className="selection-controls">
                    <label>
                      Début{" "}
                      <div>
                        <input
                          aria-label="Début en secondes"
                          disabled={!analysis}
                          type="number"
                          step="0.1"
                          min={0}
                          max={Math.max(0, end - 1)}
                          value={Number(start.toFixed(1))}
                          onChange={(e) =>
                            select(
                              Math.max(
                                0,
                                Math.min(end - 1, Number(e.target.value)),
                              ),
                              end,
                            )
                          }
                        />
                        <span>s</span>
                      </div>
                    </label>
                    <span className="selection-arrow" aria-hidden="true">
                      <ChevronRight size={14} />
                    </span>
                    <label>
                      Fin{" "}
                      <div>
                        <input
                          aria-label="Fin en secondes"
                          disabled={!analysis}
                          type="number"
                          step="0.1"
                          min={start + 1}
                          max={detail.duration}
                          value={Number(end.toFixed(1))}
                          onChange={(e) =>
                            select(
                              start,
                              Math.min(
                                detail.duration,
                                Math.max(start + 1, Number(e.target.value)),
                              ),
                            )
                          }
                        />
                        <span>s</span>
                      </div>
                    </label>
                    <div className="selection-length">
                      <span>Durée sélectionnée</span>
                      <strong>{formatTime(end - start)}</strong>
                    </div>
                  </div>
                  <div className="wave-tools">
                    <button
                      className="secondary"
                      disabled={!detail.mediaReady}
                      onClick={() => {
                        play(detail.id, undefined, start);
                      }}
                    >
                      <Play size={15} /> Écouter la sélection
                    </button>
                    <button
                      className={`secondary ${loop ? "selected" : ""}`}
                      aria-pressed={loop}
                      onClick={() => setLoop(!loop)}
                    >
                      <Repeat2 size={17} /> Boucle{" "}
                      {loop ? "active" : "désactivée"}
                    </button>
                  </div>
                  <details className="analysis-help">
                    <summary>
                      <Info size={14} /> À propos de l’estimation
                    </summary>
                    <p>
                      Le rythme est analysé sur des fenêtres d’environ 8
                      secondes, toutes les secondes. Une fenêtre peut inclure du
                      son autour des bornes. Sélectionnez au moins 8 secondes de
                      rythme régulier. Le tempo est une estimation, pas une
                      mesure exacte.
                    </p>
                  </details>
                </section>
                <aside className="bpm-panels" aria-label="Résultats de tempo">
                  <div className="panel global-bpm">
                    <span className="eyebrow">MORCEAU COMPLET</span>
                    <div className="bpm-number">
                      {bpmText(detail.bpm ? detail.bpm * detail.factor : null)}
                      <span>BPM</span>
                    </div>
                    <p>BPM moyen estimé</p>
                    {detail.span && (
                      <span className="tempo-span">
                        Plage habituelle :{" "}
                        {bpmText(detail.span[0] * detail.factor)}–
                        {bpmText(detail.span[1] * detail.factor)}
                      </span>
                    )}
                    <div
                      className="factor-controls"
                      role="group"
                      aria-label="Correction du BPM global"
                    >
                      {[0.5, 1, 2].map((f) => (
                        <button
                          key={f}
                          disabled={!detail.bpm}
                          className={detail.factor === f ? "chosen" : ""}
                          onClick={() =>
                            void act(
                              `/tracks/${detail.id}/correction`,
                              "PATCH",
                              { factor: f },
                            )
                          }
                        >
                          {f === 0.5 ? "÷2" : f === 2 ? "×2" : "Réinit."}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="panel selection-bpm">
                    <span className="eyebrow">
                      <span className="local-dot" /> VOTRE SÉLECTION
                    </span>
                    <div className="bpm-number" data-testid="selection-bpm">
                      {bpmText(analysis ? selection.bpm : null)}
                      <span>BPM</span>
                    </div>
                    <p>{analysis ? selection.quality : "Analyse en attente"}</p>
                    <span className="tempo-span">
                      {formatTime(start)} → {formatTime(end)}
                    </span>
                    <div
                      className="factor-controls"
                      role="group"
                      aria-label="Correction du BPM de sélection"
                    >
                      {[0.5, 1, 2].map((f) => (
                        <button
                          key={f}
                          className={localFactor === f ? "chosen" : ""}
                          onClick={() => setLocalFactor(f)}
                        >
                          {f === 0.5 ? "÷2" : f === 2 ? "×2" : "Réinit."}
                        </button>
                      ))}
                    </div>
                    <span className="live-caption">
                      <Activity size={13} /> Actualisation automatique
                    </span>
                  </div>
                </aside>
              </div>
              <Recommendations
                key={detail.id}
                track={detail}
                tracks={tracks}
                start={start}
                end={end}
                factor={localFactor}
                refreshError={refreshError}
                play={play}
                add={addRecommendation}
                navigate={navigate}
              />
            </>
          ) : (
            <>
              <section className="library-heading">
                <div>
                  <span className="eyebrow">
                    {playlist
                      ? "UNE SÉLECTION À VOTRE IMAGE"
                      : "VOTRE COLLECTION, AU MÊME ENDROIT"}
                  </span>
                  <h1>
                    {playlist ? playlist.name : "Bibliothèque"}
                    <span className="count-pill">
                      {playlist ? playlist.tracks.length : tracks.length}
                    </span>
                  </h1>
                  <p>
                    {playlist
                      ? `${playlist.tracks.length} morceau${playlist.tracks.length > 1 ? "x" : ""} · Dans l’ordre qui vous ressemble`
                      : `${ready.length} morceau${ready.length > 1 ? "x" : ""} prêt${ready.length > 1 ? "s" : ""} à écouter · ${formatTime(totalDuration)} de musique`}
                  </p>
                </div>
                {playlist ? (
                  <div className="heading-actions">
                    <button
                      className="primary"
                      disabled={!list.some((t) => t.mediaReady)}
                      onClick={() => {
                        const playable = list.find((t) => t.mediaReady);
                        if (playable) play(playable.id, playlist.tracks);
                      }}
                    >
                      <Play size={17} /> Lire la playlist
                    </button>
                    <IconButton
                      label="Renommer la playlist"
                      onClick={() =>
                        openModal({ type: "rename", id: playlist.id })
                      }
                    >
                      <Pencil size={18} />
                    </IconButton>
                    <IconButton
                      label="Supprimer la playlist"
                      onClick={() =>
                        openModal({ type: "deletePlaylist", id: playlist.id })
                      }
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  </div>
                ) : (
                  <div className="collection-mark">
                    <Disc3 size={40} />
                    <span>
                      Une collection
                      <br />
                      qui vous ressemble.
                    </span>
                  </div>
                )}
              </section>
              <div className="list-toolbar">
                <div className="search-field">
                  <Search size={17} />
                  <input
                    aria-label="Rechercher dans les morceaux"
                    placeholder="Rechercher un titre, un artiste…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                </div>
                {!playlist && (
                  <label className="sort-label">
                    Trier par{" "}
                    <select
                      aria-label="Trier les morceaux"
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                    >
                      <option value="recent">Ajout récent</option>
                      <option value="title">Titre</option>
                      <option value="bpm">BPM croissant</option>
                    </select>
                  </label>
                )}
              </div>
              {!loaded ? (
                <div className="empty-state">
                  <LoaderCircle className="spin" />
                  <h2>Ouverture de votre bibliothèque…</h2>
                </div>
              ) : !list.length ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <Music2 size={32} />
                  </div>
                  <h2>
                    {query
                      ? "Aucun morceau trouvé"
                      : playlist
                        ? "Une playlist prête à prendre vie"
                        : "Votre prochaine découverte commence ici."}
                  </h2>
                  <p>
                    {query
                      ? "Essayez un autre titre ou un autre artiste."
                      : playlist
                        ? "Ajoutez des morceaux depuis leur bouton playlist dans la bibliothèque."
                        : "Collez un lien plus haut. Nous préparons l’audio et trouvons son rythme."}
                  </p>
                  {playlist && (
                    <button
                      className="secondary"
                      onClick={() => navigate("library")}
                    >
                      Explorer la bibliothèque <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              ) : (
                <div className="track-list">
                  <div className="list-columns">
                    <span>MORCEAU</span>
                    <span>TEMPO ESTIMÉ</span>
                    <span>DURÉE</span>
                    <span>ACTIONS</span>
                  </div>
                  {list.map((track, index) => (
                    <article
                      key={track.id}
                      className={`track-row ${current === track.id ? "is-current" : ""}`}
                      draggable={!!playlist && !query}
                      onDragStart={() => setDragged(track.id)}
                      onDragOver={(e) => {
                        if (playlist) e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragged) void reorder(dragged, 0, track.id);
                        setDragged(null);
                      }}
                    >
                      <div className="track-main">
                        {playlist ? (
                          <div className="order-buttons">
                            <GripVertical size={14} />
                            <button
                              aria-label={`Monter ${track.title}`}
                              disabled={index === 0 || !!query}
                              onClick={() => void reorder(track.id, -1)}
                            >
                              <ArrowUp size={12} />
                            </button>
                            <button
                              aria-label={`Descendre ${track.title}`}
                              disabled={index === list.length - 1 || !!query}
                              onClick={() => void reorder(track.id, 1)}
                            >
                              <ArrowDown size={12} />
                            </button>
                          </div>
                        ) : (
                          <span className="track-index">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                        )}
                        <button
                          className="cover-button"
                          aria-label={`Écouter ${track.title}`}
                          disabled={!track.mediaReady}
                          onClick={() => {
                            if (current === track.id) toggle();
                            else play(track.id, playlist?.tracks);
                          }}
                        >
                          <Cover track={track} />
                          <span className="cover-play">
                            {current === track.id && playing ? (
                              <Pause size={20} />
                            ) : (
                              <Play size={20} />
                            )}
                          </span>
                        </button>
                        <div className="track-info">
                          <button
                            className="track-title"
                            onClick={() => navigate("track/" + track.id)}
                          >
                            {track.title}
                          </button>
                          <div className="track-byline">
                            {track.author && <span>{track.author}</span>}
                            <span
                              className={`source-tag ${track.source === "YouTube" ? "youtube" : "soundcloud"}`}
                            >
                              {track.source}
                            </span>
                          </div>
                          {analysisMap[track.id] ? (
                            <button
                              className="mini-wave"
                              aria-label={`Analyser ${track.title}`}
                              onClick={() => navigate("track/" + track.id)}
                            >
                              <Waveform
                                peaks={analysisMap[track.id].peaks}
                                duration={track.duration}
                              />
                            </button>
                          ) : (
                            <div className="track-status">
                              {activeStates.includes(track.status) && (
                                <LoaderCircle className="spin" size={12} />
                              )}
                              <span>{track.error || states[track.status]}</span>
                              {track.progress !== null && (
                                <span>{track.progress} %</span>
                              )}
                              {["error", "interrupted"].includes(
                                track.status,
                              ) && (
                                <button
                                  onClick={() =>
                                    void act(`/tracks/${track.id}/retry`)
                                  }
                                >
                                  <RefreshCw size={12} /> Reprendre
                                </button>
                              )}
                              {activeStates.includes(track.status) && (
                                <button
                                  onClick={() =>
                                    void act(`/tracks/${track.id}/cancel`)
                                  }
                                >
                                  Annuler
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        className="track-bpm"
                        onClick={() => navigate("track/" + track.id)}
                      >
                        <strong>
                          {bpmText(track.bpm ? track.bpm * track.factor : null)}
                        </strong>
                        <span>
                          {track.bpm
                            ? "BPM"
                            : track.status === "analyze"
                              ? "Analyse…"
                              : "—"}
                        </span>
                      </button>
                      <span className="track-duration">
                        {track.duration ? formatTime(track.duration) : "—"}
                      </span>
                      {trackMenu(track)}
                    </article>
                  ))}
                </div>
              )}
              <div className="library-footnote">
                <span className="local-dot" /> Les morceaux importés restent
                disponibles, même hors connexion.
              </div>
            </>
          )}
        </main>
      </div>
      <footer className="player">
        <div className="player-track">
          <Cover track={currentTrack} />
          <div>
            {currentTrack ? (
              <>
                <button
                  onClick={() =>
                    currentTrack.previewUrl
                      ? window.open(
                          currentTrack.storeUrl,
                          "_blank",
                          "noopener,noreferrer",
                        )
                      : navigate("track/" + currentTrack.id)
                  }
                >
                  {currentTrack.title}
                </button>
                <span>
                  {currentTrack.author}
                  {currentTrack.previewUrl ? " · Extrait iTunes" : ""}
                </span>
                {currentTrack.previewUrl && (
                  <>
                    <span className="sr-only">
                      Extrait fourni gracieusement par iTunes.
                    </span>
                    <a
                      className="player-store-link"
                      href={currentTrack.storeUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <img
                        src="/itunes-store-badge.png"
                        className="itunes-badge"
                        width={131}
                        height={38}
                        alt="Obtenir ce titre sur l’iTunes Store"
                      />
                    </a>
                  </>
                )}
              </>
            ) : (
              <>
                <strong>À vous de donner le tempo.</strong>
                <span>Choisissez un morceau pour commencer</span>
              </>
            )}
          </div>
          {currentTrack?.bpm && (
            <span className="player-bpm">
              {bpmText(currentTrack.bpm * currentTrack.factor)}
              <small>BPM</small>
            </span>
          )}
        </div>
        <div className="player-center">
          <div className="transport">
            <IconButton
              label="Morceau précédent"
              disabled={!current || queue.indexOf(current) <= 0}
              onClick={() => advance(-1)}
            >
              <SkipBack size={18} />
            </IconButton>
            <button
              className="play-button"
              aria-label={playing ? "Mettre en pause" : "Lancer la lecture"}
              disabled={!currentTrack?.mediaReady}
              onClick={toggle}
            >
              {playing ? (
                <Pause size={21} fill="currentColor" />
              ) : (
                <Play size={21} fill="currentColor" />
              )}
            </button>
            <IconButton
              label="Morceau suivant"
              disabled={!current || queue.indexOf(current) >= queue.length - 1}
              onClick={() => advance(1)}
            >
              <SkipForward size={18} />
            </IconButton>
          </div>
          <div className="playback-progress">
            <span>{formatTime(time)}</span>
            <input
              aria-label="Position de lecture"
              type="range"
              min={0}
              max={currentTrack?.duration || 1}
              step="0.1"
              value={Math.min(time, currentTrack?.duration || 1)}
              disabled={!current}
              onChange={(e) => seek(Number(e.target.value))}
            />
            <span>{formatTime(currentTrack?.duration || 0)}</span>
          </div>
        </div>
        <div className="volume">
          <Volume2 size={18} />
          <input
            aria-label="Volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </div>
      </footer>
      <audio
        onLoadedMetadata={() => {
          if (
            current?.startsWith("preview:") &&
            audio.current &&
            Number.isFinite(audio.current.duration)
          )
            setPreviewTrack((old) =>
              old ? { ...old, duration: audio.current!.duration } : old,
            );
        }}
        ref={audio}
        src={
          currentTrack?.previewUrl ||
          (current ? `/api/tracks/${current}/media` : undefined)
        }
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => {
          if (current) {
            setPlaying(false);
            setError(
              current.startsWith("preview:")
                ? "Cet extrait est indisponible. Ouvrez le titre sur iTunes ou essayez un autre extrait."
                : "Le fichier audio ne peut pas être lu. Vérifiez qu’il est toujours présent sur le Mac.",
            );
          }
        }}
        onTimeUpdate={() => {
          const a = audio.current!;
          const s = selectionRef.current;
          if (
            s.loop &&
            s.id === current &&
            (a.currentTime >= s.end || a.currentTime < s.start)
          )
            a.currentTime = s.start;
          setTime(a.currentTime);
          if (current && !current.startsWith("preview:"))
            localStorage.setItem(
              "mylib-player",
              JSON.stringify({ id: current, time: a.currentTime }),
            );
        }}
        onEnded={() => {
          const s = selectionRef.current;
          if (s.loop && s.id === current) {
            seek(s.start);
            void audio.current?.play();
          } else advance(1);
        }}
      />
      {notice && (
        <div className="toast" role="status">
          <Check size={18} />
          {notice}
          <button
            aria-label="Fermer la notification"
            onClick={() => setNotice("")}
          >
            <X size={15} />
          </button>
        </div>
      )}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {bpmAnnouncement}
      </span>
      <dialog
        aria-labelledby="dialog-title"
        ref={dialog}
        onCancel={() => setModal(null)}
        onClick={(e) => {
          if (e.target === e.currentTarget) setModal(null);
        }}
      >
        <div className="dialog-heading">
          <h2 id="dialog-title">
            {modal?.type === "create"
              ? "Nouvelle playlist"
              : modal?.type === "rename"
                ? "Renommer la playlist"
                : modal?.type === "add"
                  ? "Ajouter à une playlist"
                  : modal?.type === "deletePlaylist"
                    ? "Supprimer cette playlist ?"
                    : "Supprimer ce morceau ?"}
          </h2>
          <IconButton label="Fermer la fenêtre" onClick={() => setModal(null)}>
            <X size={20} />
          </IconButton>
        </div>
        {modal?.type === "add" ? (
          <>
            <p className="dialog-subtitle">
              Un même morceau peut vivre dans plusieurs playlists.
            </p>
            <div className="playlist-choices">
              {playlists.map((p) => (
                <label key={p.id}>
                  <ListMusic size={19} />
                  <span>{p.name}</span>
                  <input
                    type="checkbox"
                    checked={p.tracks.includes(modal.id!)}
                    onChange={async (e) => {
                      const checked = e.target.checked;
                      await act(
                        `/playlists/${p.id}/tracks/${modal.id}`,
                        checked ? "PUT" : "DELETE",
                      );
                      setNotice(
                        checked
                          ? `Ajouté à « ${p.name} ».`
                          : `Retiré de « ${p.name} ».`,
                      );
                    }}
                  />
                </label>
              ))}
              {!playlists.length && <p>Aucune playlist pour le moment.</p>}
            </div>
            <form
              className="inline-create"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                try {
                  const p = await api("/playlists", "POST", {
                    name: modalName,
                  });
                  await api(`/playlists/${p.id}/tracks/${modal.id}`, "PUT");
                  setModalName("");
                  await refresh();
                  setNotice("Playlist créée et morceau ajouté.");
                } catch (e) {
                  setModalError((e as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <input
                aria-label="Nom de la nouvelle playlist"
                placeholder="Créer une playlist…"
                value={modalName}
                required
                maxLength={120}
                onChange={(e) => setModalName(e.target.value)}
              />
              <button className="primary" disabled={busy || !modalName.trim()}>
                <Plus size={18} />
              </button>
            </form>
            <button
              className="secondary dialog-done"
              onClick={() => setModal(null)}
            >
              Terminé
            </button>
          </>
        ) : (
          <form onSubmit={saveModal}>
            {modal?.type === "create" || modal?.type === "rename" ? (
              <label className="dialog-label">
                Nom de la playlist
                <input
                  autoFocus
                  placeholder="Ex. Afro house, Warm-up…"
                  value={modalName}
                  required
                  maxLength={120}
                  onChange={(e) => setModalName(e.target.value)}
                />
              </label>
            ) : (
              <p className="dialog-subtitle">
                {modal?.type === "deletePlaylist"
                  ? "Les morceaux restent dans votre bibliothèque et sur votre Mac."
                  : "Le fichier local et son analyse seront effacés, et le morceau retiré de toutes vos playlists. Vos MP3 déjà exportés restent intacts."}
              </p>
            )}
            <div className="dialog-buttons">
              <button
                type="button"
                className="secondary"
                onClick={() => setModal(null)}
              >
                Annuler
              </button>
              <button
                type="submit"
                className={
                  modal?.type.startsWith("delete") ? "destructive" : "primary"
                }
                disabled={
                  busy ||
                  (!!modal?.type.match(/create|rename/) && !modalName.trim())
                }
              >
                {busy
                  ? "En cours…"
                  : modal?.type.startsWith("delete")
                    ? "Supprimer"
                    : modal?.type === "rename"
                      ? "Enregistrer"
                      : "Créer la playlist"}
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
    </div>
  );
}
