"use client";
import { memo, useEffect, useRef, useState } from "react";
import { apiFetch } from "../lib/api-fetch";
import {
  Disc3,
  FolderPlus,
  LoaderCircle,
  Pencil,
  Play,
  RefreshCw,
  X,
} from "lucide-react";

type DJTrack = {
  id: string;
  title: string;
  author: string;
  hasCover: boolean;
  mediaReady: boolean;
  bpm: number | null;
  factor: number;
  quality: string;
  status: string;
  styleStatus?: string;
  styleOverride?: string | null;
  styleError?: string | null;
  styles?: { label: string; score: number }[];
};
const name = (label: string) => label.split("---").at(-1) || label;
const tempo = (n: number) =>
  n.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
function effective(t: DJTrack) {
  return t.styleOverride
    ? [t.styleOverride]
    : t.styleStatus === "ready"
      ? (t.styles || []).map((s) => s.label)
      : [];
}
async function request(
  path: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
) {
  const response = await apiFetch("/api" + path, {
    method,
    signal,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "Le service audio ne répond pas. Réessayez.",
    );
  return data;
}

export const StyleBadge = memo(function StyleBadge({
  track,
  refresh,
}: {
  track: DJTrack;
  refresh: () => Promise<void>;
}) {
  const [labels, setLabels] = useState<string[]>([]);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  const styles = effective(track);
  const close = () => {
    dialog.current?.close();
    opener.current?.focus();
  };
  async function open() {
    setError("");
    setValue(track.styleOverride || styles[0] || "");
    dialog.current?.showModal();
    try {
      setLabels((await request("/styles")).labels);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function save(label: string | null) {
    setBusy(true);
    setError("");
    try {
      await request(`/tracks/${track.id}/style`, "PATCH", { label });
      await refresh();
      close();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function retry() {
    setBusy(true);
    setError("");
    try {
      await request(`/tracks/${track.id}/style/retry`, "POST");
      await refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const status =
    track.styleStatus === "error"
      ? "Analyse du style indisponible"
      : track.styleStatus === "uncertain"
        ? "Style à confirmer"
        : "Analyse du style en cours…";
  return (
    <div className="style-line">
      <span>
        {styles.length ? (
          <>
            {track.styleOverride ? "Style défini par vous" : "Style estimé"} :{" "}
            <strong>{styles.map(name).join(" · ")}</strong>
          </>
        ) : (
          status
        )}
      </span>
      <button className="style-edit" ref={opener} onClick={() => void open()}>
        <Pencil size={14} /> Corriger
      </button>
      {track.styleStatus === "error" && (
        <button
          className="style-edit"
          disabled={busy}
          onClick={() => void retry()}
        >
          <RefreshCw size={14} /> Réessayer l’analyse
        </button>
      )}
      {error && !dialog.current?.open && (
        <span role="alert" className="dj-error">
          {error}
        </span>
      )}
      <dialog
        ref={dialog}
        className="style-dialog"
        aria-labelledby="style-dialog-title"
        onCancel={(e) => {
          e.preventDefault();
          if (!busy) close();
        }}
      >
        <div className="panel-heading">
          <h2 id="style-dialog-title">Corriger le style</h2>
          <button
            aria-label="Fermer la correction du style"
            disabled={busy}
            onClick={close}
          >
            <X size={20} />
          </button>
        </div>
        <p>
          Choisissez le style que vous entendez. Votre choix sera conservé pour
          les recommandations.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (value) void save(value);
          }}
        >
          <label htmlFor={`style-choice-${track.id}`}>Style musical</label>
          <select
            autoFocus
            id={`style-choice-${track.id}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={busy}
            required
          >
            <option value="">Choisir un style</option>
            {labels.map((l) => (
              <option key={l} value={l}>
                {l.replace("---", " · ")}
              </option>
            ))}
          </select>
          {error && (
            <p role="alert" className="dj-error">
              {error}
            </p>
          )}
          <div className="style-dialog-actions">
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => void save(null)}
            >
              Revenir à l’estimation
            </button>
            <button className="primary" disabled={busy || !value}>
              {busy ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </dialog>
    </div>
  );
});

type Result = {
  items: { track: DJTrack; bpm: number; delta: number; reason: string }[];
  total: number;
  excluded: number;
  referenceBpm: number | null;
  message?: string;
  styleAvailable: boolean;
};
export const Recommendations = memo(function Recommendations({
  track,
  tracks,
  start,
  end,
  factor,
  refreshError,
  play,
  add,
  navigate,
}: {
  track: DJTrack;
  tracks: DJTrack[];
  start: number;
  end: number;
  factor: number;
  refreshError: string;
  play: (id: string) => void;
  add: (id: string) => void;
  navigate: (target: string) => void;
}) {
  const [mode, setMode] = useState("global");
  const [tolerance, setTolerance] = useState(5);
  const [same, setSame] = useState(false);
  const [limit, setLimit] = useState(5);
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<{
    key: string;
    result?: Result;
    error?: string;
  }>({ key: "" });
  const styleAvailable = effective(track).length > 0;
  // Only musical/library changes trigger a fetch; player time does not.
  const libraryKey = JSON.stringify(
    tracks.map((t) => [
      t.id,
      t.title,
      t.author,
      t.bpm,
      t.factor,
      t.quality,
      t.mediaReady,
      t.status,
      t.styleStatus,
      t.styles,
      t.styleOverride,
    ]),
  );
  const criteria = JSON.stringify([
    track.id,
    mode,
    tolerance,
    same && styleAvailable,
    mode === "selection" ? [start, end, factor] : null,
  ]);
  const key = JSON.stringify([
    criteria,
    libraryKey,
    limit,
    retry,
    refreshError,
  ]);
  const stale = state.key !== key;
  const inactive = stale || !!state.error || !!refreshError;
  const result = state.result;
  useEffect(() => {
    setLimit(5);
  }, [criteria]);
  useEffect(() => {
    const controller = new AbortController();
    let ignore = false;
    const timer = setTimeout(
      () => {
        void request(
          `/tracks/${track.id}/recommendations`,
          "POST",
          {
            mode,
            tolerance,
            same: same && styleAvailable,
            limit,
            ...(mode === "selection" ? { start, end, factor } : {}),
          },
          controller.signal,
        )
          .then((data: Result) => {
            if (!ignore) setState({ key, result: data });
          })
          .catch((e: Error) => {
            if (!ignore)
              setState((old) => ({
                key,
                result: old.result,
                error: e.message,
              }));
          });
      },
      mode === "selection" ? 250 : 0,
    );
    return () => {
      ignore = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [key]);
  const currentIds = new Set(
    tracks
      .filter((t) => t.mediaReady && t.status !== "deleting")
      .map((t) => t.id),
  );
  return (
    <section
      className="panel dj-panel"
      aria-labelledby="dj-title"
      aria-busy={stale}
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow">DANS VOTRE BIBLIOTHÈQUE</span>
          <h2 id="dj-title">À mixer ensuite</h2>
          <p>
            {!inactive && result?.referenceBpm
              ? `Basé sur ${tempo(result.referenceBpm)} BPM · ${mode === "global" ? "Morceau complet" : "Votre sélection"}`
              : "Trouvez un prochain morceau au tempo proche."}
          </p>
        </div>
        <Disc3 className="dj-heading-icon" size={28} aria-hidden="true" />
      </div>
      <div className="dj-filters">
        <fieldset>
          <legend>Référence</legend>
          <div className="dj-segments">
            {[
              ["global", "Morceau complet"],
              ["selection", "Ma sélection"],
            ].map(([v, l]) => (
              <button
                key={v}
                aria-pressed={mode === v}
                onClick={() => setMode(v)}
              >
                {l}
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Écart de tempo</legend>
          <div className="dj-segments">
            {[2, 5, 10].map((n) => (
              <button
                key={n}
                aria-pressed={tolerance === n}
                onClick={() => setTolerance(n)}
              >
                ±{n} BPM
              </button>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend>Style</legend>
          <div className="dj-segments">
            <button
              aria-pressed={!same || !styleAvailable}
              onClick={() => setSame(false)}
            >
              Styles proches
            </button>
            <button
              aria-pressed={same && styleAvailable}
              disabled={!styleAvailable}
              aria-describedby={!styleAvailable ? "dj-style-info" : undefined}
              onClick={() => setSame(true)}
            >
              Même style
            </button>
          </div>
        </fieldset>
      </div>
      {!styleAvailable && (
        <p id="dj-style-info" className="dj-caption">
          Style à confirmer : les suggestions se basent sur le tempo. Le filtre
          « Même style » sera disponible après analyse ou correction.
        </p>
      )}
      {(state.error || refreshError) && (
        <div className="dj-feedback" role="alert">
          <span>
            {state.error || "Le service audio ne répond pas."}{" "}
            {result?.items.length
              ? "Résultats précédents — non actualisés."
              : ""}
          </span>
          <button className="secondary" onClick={() => setRetry((n) => n + 1)}>
            <RefreshCw size={16} /> Réessayer
          </button>
        </div>
      )}
      {stale && (
        <p role="status" className="dj-caption">
          <LoaderCircle size={14} className="spin" />{" "}
          {result
            ? "Actualisation des suggestions…"
            : "Recherche des suggestions…"}
        </p>
      )}
      {!result && stale && (
        <div className="dj-skeleton" aria-hidden="true">
          {[1, 2, 3].map((n) => (
            <div key={n} />
          ))}
        </div>
      )}
      {result && !inactive && result.items.length === 0 && (
        <div className="dj-empty">
          <Disc3 size={26} aria-hidden="true" />
          <h3>
            {result.referenceBpm
              ? "Aucun morceau dans cette plage"
              : "Un tempo stable est nécessaire"}
          </h3>
          <p>
            {result.message ||
              (tracks.length < 2
                ? "Importez d’autres titres pour trouver votre prochain morceau."
                : "Essayez un écart plus large ou autorisez les styles voisins.")}
          </p>
          <div className="dj-empty-actions">
            {result.referenceBpm && tolerance < 10 && (
              <button
                className="secondary"
                onClick={() => setTolerance(tolerance === 2 ? 5 : 10)}
              >
                Élargir à ±{tolerance === 2 ? 5 : 10} BPM
              </button>
            )}
            {same && styleAvailable && (
              <button className="secondary" onClick={() => setSame(false)}>
                Autoriser les styles voisins
              </button>
            )}
          </div>
        </div>
      )}
      <div className="dj-results">
        {result?.items
          .filter((i) => currentIds.has(i.track.id))
          .map((item) => (
            <article className="dj-row" key={item.track.id}>
              <div className="cover">
                {item.track.hasCover ? (
                  <img
                    loading="lazy"
                    src={`/api/tracks/${item.track.id}/cover`}
                    alt=""
                  />
                ) : (
                  <Disc3 aria-hidden="true" />
                )}
              </div>
              <div className="dj-track">
                <button
                  className="dj-track-title"
                  disabled={inactive}
                  onClick={() => navigate(`track/${item.track.id}`)}
                >
                  {item.track.title}
                </button>
                <span>{item.track.author}</span>
                <small>
                  {effective(item.track).map(name).join(" · ") ||
                    "Style à confirmer"}{" "}
                  <span className="dj-reason">{item.reason}</span>
                </small>
              </div>
              <div className="dj-tempo">
                <strong>
                  {tempo(item.bpm)} <small>BPM</small>
                </strong>
                <span>
                  {item.delta > 0 ? "+" : ""}
                  {tempo(item.delta)} BPM
                </span>
              </div>
              <div className="dj-actions">
                <button
                  className="secondary"
                  disabled={inactive}
                  aria-label={`Écouter ${item.track.title}`}
                  onClick={() => play(item.track.id)}
                >
                  <Play size={16} /> Écouter
                </button>
                <button
                  className="secondary dj-add"
                  disabled={inactive}
                  aria-label={`Ajouter ${item.track.title} à une playlist`}
                  onClick={() => add(item.track.id)}
                >
                  <FolderPlus size={17} />
                </button>
              </div>
            </article>
          ))}
      </div>
      {result && !inactive && result.total > limit && (
        <button
          className="secondary dj-more"
          onClick={() => setLimit((n) => n + 5)}
        >
          Voir davantage
        </button>
      )}
      {result && !inactive && result.excluded > 0 && (
        <p className="dj-caption">
          {result.excluded} morceau{result.excluded > 1 ? "x" : ""} au tempo
          absent, variable ou incertain exclu{result.excluded > 1 ? "s" : ""}.
        </p>
      )}
      <p className="dj-caption dj-footnote">
        La proximité de tempo et de style aide à choisir un titre. Écoutez les
        morceaux pour préparer votre transition.
      </p>
    </section>
  );
});
