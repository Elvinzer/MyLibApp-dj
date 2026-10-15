"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle2, ExternalLink, LoaderCircle, LogOut } from "lucide-react";
import { apiFetch } from "../lib/api-fetch";

type Status = {
  available: boolean;
  connected: boolean;
  status: string;
  authUrl: string | null;
  message: string | null;
};

async function request(path: string, method = "GET"): Promise<Status> {
  const response = await apiFetch("/api/spotify/" + path, {
    method,
    cache: "no-store",
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.detail || "Connexion Spotify indisponible.");
  return data;
}

export default function SpotifyConnection({ needed }: { needed: boolean }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const popup = useRef<Window | null>(null);
  const refresh = useCallback(async () => {
    try {
      const next = await request("status");
      setStatus(next);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    void refresh();
  }, [refresh, needed]);
  const pending =
    status?.status === "pending" || status?.status === "connecting";
  useEffect(() => {
    if (!pending) return;
    const timer = setInterval(() => void refresh(), 1000);
    return () => clearInterval(timer);
  }, [pending, refresh]);
  useEffect(() => {
    if (status?.authUrl && popup.current && !popup.current.closed) {
      const destination = new URL(status.authUrl);
      if (destination.origin === "https://accounts.spotify.com") {
        popup.current.location.href = destination.href;
        popup.current = null;
      }
    }
  }, [status?.authUrl]);

  async function connect() {
    if (busy || pending) return;
    popup.current = window.open("about:blank", "mylib-spotify-login");
    setBusy(true);
    setError("");
    try {
      const next = await request("connect", "POST");
      setStatus(next);
      if (next.status === "error") popup.current?.close();
    } catch (e) {
      popup.current?.close();
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    try {
      setStatus(await request("disconnect", "POST"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="spotify-connection">
      <div className="spotify-connection-row">
        <span className="spotify-state" role="status">
          {pending || busy ? (
            <LoaderCircle size={14} className="spin" aria-hidden="true" />
          ) : status?.connected ? (
            <CheckCircle2 size={14} aria-hidden="true" />
          ) : null}
          {status?.connected
            ? "Spotify connecté"
            : pending
              ? "Validation Spotify en attente…"
              : "Spotify Premium"}
        </span>
        {status?.connected ? (
          <button
            type="button"
            className="spotify-action"
            onClick={disconnect}
            disabled={busy}
          >
            <LogOut size={13} aria-hidden="true" /> Déconnecter
          </button>
        ) : pending && status?.authUrl ? (
          <a
            className="spotify-action"
            href={status.authUrl}
            target="_blank"
            rel="noreferrer"
          >
            Rouvrir Spotify <ExternalLink size={13} aria-hidden="true" />
          </a>
        ) : (
          <button
            type="button"
            className="spotify-action"
            onClick={connect}
            disabled={busy || pending || !status?.available}
          >
            {busy ? "Connexion…" : "Connecter Spotify"}
          </button>
        )}
      </div>
      {(needed || pending) && !status?.connected && (
        <p className="spotify-help">
          Connectez votre compte Premium, puis importez le lien conservé
          ci-dessus. Sur Spotify, la connexion apparaît sous « Spotify for
          Desktop ».
        </p>
      )}
      {status?.connected && needed && (
        <p className="spotify-help" role="status">
          Connexion réussie. Vous pouvez maintenant importer ce morceau.
        </p>
      )}
      {(error || status?.message) && (
        <p className="spotify-error" role="alert">
          {error || status?.message}
        </p>
      )}
      {status && !status.available && (
        <p className="spotify-help">
          Mettez MyLibApp à jour pour activer Spotify.
        </p>
      )}
    </div>
  );
}
