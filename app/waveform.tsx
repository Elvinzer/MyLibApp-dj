"use client";
import { useEffect, useRef } from "react";
type Props = {
  peaks: number[];
  duration: number;
  time?: number;
  start?: number;
  end?: number;
  onSeek?: (time: number) => void;
  onSelect?: (start: number, end: number) => void;
  zoom?: number;
};
export default function Waveform({
  peaks,
  duration,
  time = 0,
  start,
  end,
  onSeek,
  onSelect,
  zoom = 1,
}: Props) {
  const canvas = useRef<HTMLCanvasElement>(null),
    wrap = useRef<HTMLDivElement>(null);
  const drag = useRef<null | "start" | "end">(null);
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const draw = () => {
      const width = el.clientWidth,
        height = el.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      el.width = width * dpr;
      el.height = height * dpr;
      const ctx = el.getContext("2d");
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);
      const bars = Math.floor(width / 4);
      for (let i = 0; i < bars; i++) {
        const a = Math.floor((i / bars) * peaks.length),
          b = Math.max(a + 1, Math.floor(((i + 1) / bars) * peaks.length));
        let max = 0;
        for (let j = a; j < b; j++) max = Math.max(max, peaks[j] || 0);
        const usable = height < 40 ? height - 4 : height - 16;
        const h = Math.max(
          2,
          Math.min(usable, Math.pow(max, 0.8) * usable * 2),
        );
        const t = (i / bars) * duration;
        ctx.fillStyle =
          start !== undefined && end !== undefined && t >= start && t <= end
            ? "#5ee0b0"
            : t < time
              ? "#bec7c4"
              : "#606660";
        ctx.fillRect(i * 4, (height - h) / 2, 2, h);
      }
    };
    draw();
    const observer = new ResizeObserver(draw);
    observer.observe(el);
    return () => observer.disconnect();
  }, [peaks, duration, time, start, end, zoom]);
  function point(e: React.PointerEvent) {
    const rect = canvas.current!.getBoundingClientRect();
    return Math.min(
      duration,
      Math.max(0, ((e.clientX - rect.left) / rect.width) * duration),
    );
  }
  const minimum = Math.min(1, duration);
  return (
    <div className={`wave-scroll ${onSelect ? "editable" : ""}`} ref={wrap}>
      <div
        className="wave-inner"
        style={{ width: `${zoom * 100}%` }}
        onPointerMove={(e) => {
          if (
            !drag.current ||
            !onSelect ||
            start === undefined ||
            end === undefined
          )
            return;
          const v = point(e);
          if (drag.current === "start")
            onSelect(Math.min(v, end - minimum), end);
          else onSelect(start, Math.max(v, start + minimum));
        }}
        onPointerUp={(e) => {
          drag.current = null;
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <canvas
          ref={canvas}
          aria-hidden="true"
          onClick={(e) => {
            if (e.detail && onSeek) {
              const rect = e.currentTarget.getBoundingClientRect();
              onSeek(
                Math.max(
                  0,
                  Math.min(
                    duration,
                    ((e.clientX - rect.left) / rect.width) * duration,
                  ),
                ),
              );
            }
          }}
        />
        {time > 0 && (
          <div
            className="playhead"
            style={{ left: `${(time / duration) * 100}%` }}
          />
        )}
        {onSelect && start !== undefined && end !== undefined && (
          <>
            <div
              className="selection-shade"
              style={{
                left: `${(start / duration) * 100}%`,
                width: `${((end - start) / duration) * 100}%`,
              }}
            />
            {(["start", "end"] as const).map((side) => (
              <div
                key={side}
                role="slider"
                tabIndex={0}
                aria-label={
                  side === "start" ? "Début de sélection" : "Fin de sélection"
                }
                aria-valuemin={side === "start" ? 0 : start + minimum}
                aria-valuemax={side === "start" ? end - minimum : duration}
                aria-valuenow={side === "start" ? start : end}
                aria-valuetext={`${(side === "start" ? start : end).toFixed(1)} secondes`}
                className={`handle ${side}`}
                style={{
                  left: `${((side === "start" ? start : end) / duration) * 100}%`,
                }}
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  drag.current = side;
                  e.currentTarget.parentElement!.setPointerCapture(e.pointerId);
                  e.currentTarget.focus();
                }}
                onKeyDown={(e) => {
                  if (
                    !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
                  )
                    return;
                  e.preventDefault();
                  const value = side === "start" ? start : end;
                  const v =
                    e.key === "Home"
                      ? side === "start"
                        ? 0
                        : start + minimum
                      : e.key === "End"
                        ? side === "start"
                          ? end - minimum
                          : duration
                        : value +
                          (e.key === "ArrowRight" ? 1 : -1) *
                            (e.shiftKey ? 10 : 1);
                  if (side === "start")
                    onSelect(Math.max(0, Math.min(end - minimum, v)), end);
                  else
                    onSelect(
                      start,
                      Math.min(duration, Math.max(start + minimum, v)),
                    );
                }}
              >
                <span />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
