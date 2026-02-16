// FALLBACK: Static city coordinates used when destinationIndex hasn't loaded yet.
// Will be replaced by destinationIndex geocoding API in a future iteration.
// City coordinates mapping (common cities with French & English variants)
export const cityCoordinates: Record<string, { lat: number; lng: number }> = {
  // France
  "paris": { lat: 48.8566, lng: 2.3522 },
  "nice": { lat: 43.7102, lng: 7.2620 },
  "marseille": { lat: 43.2965, lng: 5.3698 },
  "lyon": { lat: 45.7640, lng: 4.8357 },
  "bordeaux": { lat: 44.8378, lng: -0.5792 },
  "toulouse": { lat: 43.6047, lng: 1.4442 },
  "nantes": { lat: 47.2184, lng: -1.5536 },
  "lille": { lat: 50.6292, lng: 3.0573 },
  "strasbourg": { lat: 48.5734, lng: 7.7521 },
  "montpellier": { lat: 43.6108, lng: 3.8767 },
  "rennes": { lat: 48.1173, lng: -1.6778 },

  // Belgium
  "brussels": { lat: 50.8503, lng: 4.3517 },
  "bruxelles": { lat: 50.8503, lng: 4.3517 },
  "antwerp": { lat: 51.2194, lng: 4.4025 },
  "anvers": { lat: 51.2194, lng: 4.4025 },

  // Spain
  "barcelona": { lat: 41.3851, lng: 2.1734 },
  "barcelone": { lat: 41.3851, lng: 2.1734 },
  "madrid": { lat: 40.4168, lng: -3.7038 },
  "seville": { lat: 37.3891, lng: -5.9845 },
  "séville": { lat: 37.3891, lng: -5.9845 },
  "valencia": { lat: 39.4699, lng: -0.3763 },
  "valence": { lat: 39.4699, lng: -0.3763 },
  "malaga": { lat: 36.7213, lng: -4.4214 },
  "bilbao": { lat: 43.2630, lng: -2.9350 },

  // UK
  "london": { lat: 51.5074, lng: -0.1278 },
  "londres": { lat: 51.5074, lng: -0.1278 },
  "manchester": { lat: 53.4808, lng: -2.2426 },
  "edinburgh": { lat: 55.9533, lng: -3.1883 },
  "édimbourg": { lat: 55.9533, lng: -3.1883 },
  "glasgow": { lat: 55.8642, lng: -4.2518 },
  "birmingham": { lat: 52.4862, lng: -1.8904 },
  "liverpool": { lat: 53.4084, lng: -2.9916 },

  // Germany
  "berlin": { lat: 52.5200, lng: 13.4050 },
  "munich": { lat: 48.1351, lng: 11.5820 },
  "frankfurt": { lat: 50.1109, lng: 8.6821 },
  "francfort": { lat: 50.1109, lng: 8.6821 },
  "hamburg": { lat: 53.5511, lng: 9.9937 },
  "hambourg": { lat: 53.5511, lng: 9.9937 },
  "cologne": { lat: 50.9375, lng: 6.9603 },
  "düsseldorf": { lat: 51.2277, lng: 6.7735 },

  // Italy
  "rome": { lat: 41.9028, lng: 12.4964 },
  "milan": { lat: 45.4642, lng: 9.1900 },
  "venice": { lat: 45.4408, lng: 12.3155 },
  "venise": { lat: 45.4408, lng: 12.3155 },
  "florence": { lat: 43.7696, lng: 11.2558 },
  "naples": { lat: 40.8518, lng: 14.2681 },
  "turin": { lat: 45.0703, lng: 7.6869 },

  // Portugal
  "lisbon": { lat: 38.7223, lng: -9.1393 },
  "lisbonne": { lat: 38.7223, lng: -9.1393 },
  "porto": { lat: 41.1579, lng: -8.6291 },

  // Netherlands
  "amsterdam": { lat: 52.3676, lng: 4.9041 },
  "rotterdam": { lat: 51.9244, lng: 4.4777 },
  "the hague": { lat: 52.0705, lng: 4.3007 },
  "la haye": { lat: 52.0705, lng: 4.3007 },

  // Switzerland
  "zurich": { lat: 47.3769, lng: 8.5417 },
  "geneva": { lat: 46.2044, lng: 6.1432 },
  "genève": { lat: 46.2044, lng: 6.1432 },
  "bern": { lat: 46.9480, lng: 7.4474 },
  "berne": { lat: 46.9480, lng: 7.4474 },

  // Austria
  "vienna": { lat: 48.2082, lng: 16.3738 },
  "vienne": { lat: 48.2082, lng: 16.3738 },
  "salzburg": { lat: 47.8095, lng: 13.0550 },
  "salzbourg": { lat: 47.8095, lng: 13.0550 },

  // Scandinavia
  "stockholm": { lat: 59.3293, lng: 18.0686 },
  "oslo": { lat: 59.9139, lng: 10.7522 },
  "copenhagen": { lat: 55.6761, lng: 12.5683 },
  "copenhague": { lat: 55.6761, lng: 12.5683 },
  "helsinki": { lat: 60.1699, lng: 24.9384 },

  // Eastern Europe
  "prague": { lat: 50.0755, lng: 14.4378 },
  "budapest": { lat: 47.4979, lng: 19.0402 },
  "warsaw": { lat: 52.2297, lng: 21.0122 },
  "varsovie": { lat: 52.2297, lng: 21.0122 },
  "krakow": { lat: 50.0647, lng: 19.9450 },
  "cracovie": { lat: 50.0647, lng: 19.9450 },
  "bucharest": { lat: 44.4268, lng: 26.1025 },
  "bucarest": { lat: 44.4268, lng: 26.1025 },

  // Greece & Turkey
  "athens": { lat: 37.9838, lng: 23.7275 },
  "athènes": { lat: 37.9838, lng: 23.7275 },
  "istanbul": { lat: 41.0082, lng: 28.9784 },
  "thessaloniki": { lat: 40.6401, lng: 22.9444 },

  // Ireland
  "dublin": { lat: 53.3498, lng: -6.2603 },
  "cork": { lat: 51.8985, lng: -8.4756 },

  // Russia
  "moscow": { lat: 55.7558, lng: 37.6173 },
  "moscou": { lat: 55.7558, lng: 37.6173 },
  "saint petersburg": { lat: 59.9311, lng: 30.3609 },
  "saint-pétersbourg": { lat: 59.9311, lng: 30.3609 },

  // North Africa & Middle East
  "marrakech": { lat: 31.6295, lng: -7.9811 },
  "casablanca": { lat: 33.5731, lng: -7.5898 },
  "cairo": { lat: 30.0444, lng: 31.2357 },
  "le caire": { lat: 30.0444, lng: 31.2357 },
  "dubai": { lat: 25.2048, lng: 55.2708 },
  "dubaï": { lat: 25.2048, lng: 55.2708 },
  "tel aviv": { lat: 32.0853, lng: 34.7818 },

  // Americas
  "new york": { lat: 40.7128, lng: -74.0060 },
  "los angeles": { lat: 34.0522, lng: -118.2437 },
  "san francisco": { lat: 37.7749, lng: -122.4194 },
  "miami": { lat: 25.7617, lng: -80.1918 },
  "chicago": { lat: 41.8781, lng: -87.6298 },
  "montreal": { lat: 45.5017, lng: -73.5673 },
  "montréal": { lat: 45.5017, lng: -73.5673 },
  "toronto": { lat: 43.6532, lng: -79.3832 },
  "vancouver": { lat: 49.2827, lng: -123.1207 },
  "mexico city": { lat: 19.4326, lng: -99.1332 },
  "mexico": { lat: 19.4326, lng: -99.1332 },
  "buenos aires": { lat: -34.6037, lng: -58.3816 },
  "sao paulo": { lat: -23.5505, lng: -46.6333 },
  "rio de janeiro": { lat: -22.9068, lng: -43.1729 },
  "rio": { lat: -22.9068, lng: -43.1729 },

  // Africa
  "cape town": { lat: -33.9249, lng: 18.4241 },
  "le cap": { lat: -33.9249, lng: 18.4241 },
  "johannesburg": { lat: -26.2041, lng: 28.0473 },

  // Asia
  "tokyo": { lat: 35.6762, lng: 139.6503 },
  "sydney": { lat: -33.8688, lng: 151.2093 },
  "bangkok": { lat: 13.7563, lng: 100.5018 },
  "singapore": { lat: 1.3521, lng: 103.8198 },
  "singapour": { lat: 1.3521, lng: 103.8198 },
  "hong kong": { lat: 22.3193, lng: 114.1694 },
  "seoul": { lat: 37.5665, lng: 126.9780 },
  "séoul": { lat: 37.5665, lng: 126.9780 },
  "beijing": { lat: 39.9042, lng: 116.4074 },
  "pékin": { lat: 39.9042, lng: 116.4074 },
  "shanghai": { lat: 31.2304, lng: 121.4737 },
  "delhi": { lat: 28.6139, lng: 77.2090 },
  "mumbai": { lat: 19.0760, lng: 72.8777 },
  "bali": { lat: -8.3405, lng: 115.0920 },
  "phuket": { lat: 7.8804, lng: 98.3923 },
};

// Generate a great circle arc between two points for curved flight paths
export function generateGreatCircleArc(
  start: [number, number],
  end: [number, number],
  numPoints: number = 50
): [number, number][] {
  const points: [number, number][] = [];

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const lat1 = toRad(start[1]);
  const lon1 = toRad(start[0]);
  const lat2 = toRad(end[1]);
  const lon2 = toRad(end[0]);

  // Calculate the angular distance between points
  const d = 2 * Math.asin(
    Math.sqrt(
      Math.pow(Math.sin((lat2 - lat1) / 2), 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin((lon2 - lon1) / 2), 2)
    )
  );

  for (let i = 0; i <= numPoints; i++) {
    const f = i / numPoints;

    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);

    const x = A * Math.cos(lat1) * Math.cos(lon1) + B * Math.cos(lat2) * Math.cos(lon2);
    const y = A * Math.cos(lat1) * Math.sin(lon1) + B * Math.cos(lat2) * Math.sin(lon2);
    const z = A * Math.sin(lat1) + B * Math.sin(lat2);

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    const lon = Math.atan2(y, x);

    points.push([toDeg(lon), toDeg(lat)]);
  }

  return points;
}

export function cssHsl(varName: string, fallbackHsl = "222.2 47.4% 11.2%") {
  // shadcn tokens are stored as: "H S% L%" (no hsl())
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  const hsl = (raw || fallbackHsl).trim();

  // Mapbox's color parser is stricter than browsers: it doesn't accept the space-separated hsl() form.
  // Convert "193 100% 42%" -> "hsl(193, 100%, 42%)"
  const parts = hsl.split(/\s+/).filter(Boolean);
  if (parts.length >= 3) {
    const [h, s, l] = parts;
    return `hsl(${h}, ${s}, ${l})`;
  }

  return `hsl(${hsl})`;
}

export function injectHotelMarkerAnimations() {
  if (document.getElementById("travliaq-hotel-marker-animations")) return;
  const style = document.createElement("style");
  style.id = "travliaq-hotel-marker-animations";
  style.textContent = `
    @keyframes travliaq-hotel-bounce {
      0% { transform: translateY(0) scale(1); }
      35% { transform: translateY(-10px) scale(1.06); }
      65% { transform: translateY(2px) scale(0.98); }
      100% { transform: translateY(0) scale(1); }
    }

    /* Applied to the first child (our marker wrapper) */
    .hotel-price-marker.bounce > div {
      animation: travliaq-hotel-bounce 650ms cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    @media (prefers-reduced-motion: reduce) {
      .hotel-price-marker.bounce > div {
        animation: none;
      }
    }
  `;
  document.head.appendChild(style);
}
