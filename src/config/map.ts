/**
 * Map configuration (MapLibre GL + OpenStreetMap raster tiles).
 *
 * Single source of truth for tile providers and map styles.
 * No vendor lock-in: tile URLs and attribution are configurable through
 * environment variables so the provider can be swapped without code changes.
 */
import type { StyleSpecification } from "maplibre-gl";

const DEFAULT_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const DEFAULT_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a>';

/** Raster tile endpoint (override with VITE_MAP_TILE_URL) */
export const MAP_TILE_URL: string =
  import.meta.env.VITE_MAP_TILE_URL || DEFAULT_TILE_URL;

/** Attribution text required by the tile provider (override with VITE_MAP_ATTRIBUTION) */
export const MAP_ATTRIBUTION: string =
  import.meta.env.VITE_MAP_ATTRIBUTION || DEFAULT_ATTRIBUTION;

/** Optional API key appended to tile requests for paid providers */
const MAP_TILE_API_KEY: string | undefined = import.meta.env.VITE_MAP_TILE_API_KEY;

/** Max zoom supported by the raster tile source */
export const MAP_MAX_ZOOM = Number(import.meta.env.VITE_MAP_MAX_ZOOM ?? 19);

function buildTileUrl(): string {
  if (!MAP_TILE_API_KEY) return MAP_TILE_URL;
  const separator = MAP_TILE_URL.includes("?") ? "&" : "?";
  return `${MAP_TILE_URL}${separator}key=${encodeURIComponent(MAP_TILE_API_KEY)}`;
}

export type MapTheme = "light" | "dark";

/**
 * Builds a MapLibre style spec from raster tiles.
 * The dark theme is produced with raster color adjustments so a single
 * tile provider can serve both themes.
 */
export function getMapStyle(theme: MapTheme = "light"): StyleSpecification {
  const isDark = theme === "dark";

  return {
    version: 8,
    sources: {
      "base-tiles": {
        type: "raster",
        tiles: [buildTileUrl()],
        tileSize: 256,
        maxzoom: MAP_MAX_ZOOM,
        attribution: MAP_ATTRIBUTION,
      },
    },
    layers: [
      {
        id: "background",
        type: "background",
        paint: { "background-color": isDark ? "#0b0f14" : "#eef2ef" },
      },
      {
        id: "base-tiles",
        type: "raster",
        source: "base-tiles",
        paint: isDark
          ? {
              "raster-brightness-min": 0,
              "raster-brightness-max": 0.45,
              "raster-saturation": -0.6,
              "raster-contrast": 0.15,
              "raster-opacity": 1,
            }
          : {
              "raster-saturation": -0.1,
              "raster-opacity": 1,
            },
      },
    ],
  };
}
