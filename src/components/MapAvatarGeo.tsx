"use client";

import { useEffect, useMemo, useState } from "react";

type Props = {
  place?: string; // e.g. "Bengaluru, Karnataka"
  lat?: number; // pass coords if you have them (instant map)
  lon?: number;
  size?: number; // display size px
  zoom?: number; // 13–14 reads well in small avatars
  rounded?: string; // tailwind radius class
  className?: string;
  quality?: number; // 2–4; higher = sharper (default 3)
  prefer?: "geoapify" | "osm"; // default auto
  debug?: boolean; // logs URLs and errors
};

type Coords = { lat: number; lon: number };

const MEM = new Map<string, { coords: Coords; ts: number }>();
const LS_KEY = "geo_cache_v1";
const TTL = 1000 * 60 * 60 * 24 * 7;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
function dpr() {
  return Math.max(
    1,
    Math.min(
      3,
      typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1
    )
  );
}

function urlGeoapify(coords: Coords, px: number, zoom: number, apiKey: string) {
  const style = "osm-bright";
  return `https://maps.geoapify.com/v1/staticmap?style=${style}&width=${px}&height=${px}&center=lonlat:${coords.lon},${coords.lat}&zoom=${zoom}&marker=lonlat:${coords.lon},${coords.lat};type:awesome;color:%23ffffff;size:small&scaleFactor=2&apiKey=${apiKey}`;
}
function urlOSM(coords: Coords, px: number, zoom: number) {
  return `https://staticmap.openstreetmap.de/staticmap.php?center=${coords.lat},${coords.lon}&zoom=${zoom}&size=${px}x${px}&maptype=mapnik&markers=${coords.lat},${coords.lon},lightblue1`;
}

function loadLS(): Record<string, { coords: Coords; ts: number }> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function saveLS(obj: Record<string, { coords: Coords; ts: number }>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(obj));
  } catch {}
}

async function geocodeGeoapify(
  place: string,
  key: string,
  debug?: boolean
): Promise<Coords | null> {
  const k = place.trim().toLowerCase();
  const now = Date.now();
  const mem = MEM.get(k);
  if (mem && now - mem.ts < TTL) return mem.coords;
  const store = loadLS();
  const ls = store[k];
  if (ls && now - ls.ts < TTL) {
    MEM.set(k, ls);
    return ls.coords;
  }
  const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
    place
  )}&limit=1&apiKey=${key}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const f = data?.features?.[0];
    const lon = f?.geometry?.coordinates?.[0];
    const lat = f?.geometry?.coordinates?.[1];
    if (typeof lat !== "number" || typeof lon !== "number") return null;
    const coords = { lat, lon };
    const entry = { coords, ts: now };
    MEM.set(k, entry);
    store[k] = entry;
    saveLS(store);
    return coords;
  } catch (e) {
    if (debug) console.warn("[MapAvatarGeo] Geoapify geocode error:", e);
    return null;
  }
}

async function geocodeOSM(
  place: string,
  debug?: boolean
): Promise<Coords | null> {
  const k = place.trim().toLowerCase();
  const now = Date.now();
  const mem = MEM.get(k);
  if (mem && now - mem.ts < TTL) return mem.coords;
  const store = loadLS();
  const ls = store[k];
  if (ls && now - ls.ts < TTL) {
    MEM.set(k, ls);
    return ls.coords;
  }
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(
    place
  )}`;
  try {
    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    if (!res.ok) return null;
    const data = await res.json();
    const item = Array.isArray(data) ? data[0] : null;
    const lat = item ? parseFloat(item.lat) : NaN;
    const lon = item ? parseFloat(item.lon) : NaN;
    if (!isFinite(lat) || !isFinite(lon)) return null;
    const coords = { lat, lon };
    const entry = { coords, ts: now };
    MEM.set(k, entry);
    store[k] = entry;
    saveLS(store);
    return coords;
  } catch (e) {
    if (debug) console.warn("[MapAvatarGeo] OSM geocode error:", e);
    return null;
  }
}

export default function MapAvatarGeo({
  place,
  lat,
  lon,
  size = 48,
  zoom = 13,
  rounded = "rounded-xl",
  className = "",
  quality = 3,
  prefer = "geoapify",
  debug = false,
}: Props) {
  const apiKey = (import.meta as any).env?.VITE_GEOAPIFY_KEY as
    | string
    | undefined;
  const [src, setSrc] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [dprValue, setDprValue] = useState(1);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDprValue(clamp(window.devicePixelRatio || 1, 1, 3));
    }
  }, []);

  const targetPx = useMemo(
    () => clamp(Math.round(size * dprValue * quality), 192, 512),
    [size, dprValue, quality]
  );

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setReady(false);
      setSrc(null);

      const hasGeo = Boolean(apiKey) && prefer !== "osm";

      // 1) If lat/lon provided -> immediate URL (Geoapify if key else OSM)
      if (typeof lat === "number" && typeof lon === "number") {
        const coords = { lat, lon };
        const url = hasGeo
          ? urlGeoapify(coords, targetPx, zoom, apiKey!)
          : urlOSM(coords, targetPx, zoom);
        if (debug) console.log("[MapAvatarGeo] using coords ->", url);
        setSrc(url);
        setReady(true);
        return;
      }

      // 2) If place provided -> geocode then build URL
      if (place && place.trim()) {
        let coords: Coords | null = null;

        if (hasGeo) {
          coords = await geocodeGeoapify(place, apiKey!, debug);
        }
        if (!coords) {
          coords = await geocodeOSM(place, debug);
        }
        if (cancelled) return;

        if (coords) {
          const url = hasGeo
            ? urlGeoapify(coords, targetPx, zoom, apiKey!)
            : urlOSM(coords, targetPx, zoom);
          if (debug) console.log("[MapAvatarGeo] using geocode ->", url);
          setSrc(url);
        } else {
          if (debug)
            console.warn("[MapAvatarGeo] geocode failed for place:", place);
          setSrc(null);
        }
        setReady(true);
        return;
      }

      // 3) Nothing to show -> fallback
      setReady(true);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [place, lat, lon, targetPx, zoom, apiKey, prefer, debug]);

  // Debug link (dev only)
  const DebugLink = () =>
    debug && src ? (
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        className="absolute -bottom-5 left-0 text-[10px] text-foreground/40"
      >
        open map
      </a>
    ) : null;

  if (!ready || !src) {
    return (
      <div
        className={`bg-gradient-to-br from-blue-500 to-violet-500 ${rounded} ring-2 ring-foreground/10 ${className}`}
        style={{ width: size, height: size }}
        role="img"
        aria-label={place ? `Map placeholder for ${place}` : "Map placeholder"}
      />
    );
  }

  const handleError = () => {
    if (debug) console.warn("[MapAvatarGeo] image load failed, src:", src);
    // If Geoapify failed, try OSM once
    if (src.includes("maps.geoapify.com")) {
      if (typeof lat === "number" && typeof lon === "number") {
        setSrc(urlOSM({ lat, lon }, targetPx, zoom));
      } else if (place) {
        geocodeOSM(place, debug).then(
          (c) => c && setSrc(urlOSM(c, targetPx, zoom))
        );
      }
    } else {
      setSrc(null);
    }
  };

  return (
    <div className="relative">
      <img
        src={src}
        alt={place ? `Map of ${place}` : "Map"}
        className={`${rounded} object-cover shadow-md ring-2 ring-foreground/10 ${className}`}
        style={{
          width: size,
          height: size,
          filter: "contrast(1.1) saturate(1.05)",
        }}
        loading="eager"
        // @ts-ignore
        fetchpriority="high"
        decoding="sync"
        referrerPolicy="no-referrer"
        crossOrigin="anonymous"
        onError={handleError}
      />
      <DebugLink />
    </div>
  );
}