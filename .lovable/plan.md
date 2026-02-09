

## Plan: Fix Suggestions (Fill Input) + Auto Route on City Selection

### Problem 1: Suggestions auto-submit instead of filling input
The last change replaced `setInput(message)` with `sendText(message)` in the DEFAULT case of the suggestion click handler. The user explicitly wants suggestions to **fill the input field only**, letting them review and send manually. The message flow must always be: user reads suggestion in input -> user presses send -> backend analyzes -> widget triggered if needed.

### Problem 2: Map route not drawn when city selected via chat
When the chat detects a destination city (e.g., "Wellington" or "Agadir"), it calls `updateMemory({ arrival: { city: destinationCity } })`. But the map's `getRoutePoints()` requires `lat` and `lng` coordinates to draw routes. Since only the city name is stored (no coordinates), the route line never appears. Previously, this worked because the city was selected through the FlightRouteBuilder widget which geocodes the location and stores coordinates.

---

### Fix 1: Revert suggestion auto-submit to fill-input

**File**: `src/components/planner/PlannerChat.tsx` (~line 1964-1966)

Change the DEFAULT case back from:
```
sendText(message);
```
to:
```
setInput(message);
setTimeout(() => inputRef.current?.focus(), 0);
```

This restores the expected behavior: suggestion fills input, user reviews, user sends.

---

### Fix 2: Geocode destination city when set via chat

**File**: `src/components/planner/PlannerChat.tsx` (around line 1045-1048, the `provide_destination` handler)

When `destinationCity` is detected from the intent:
1. Call a geocoding function to resolve the city name to coordinates (lat/lng)
2. Store the full location data (city + lat + lng + country) in flight memory
3. This will make `getRoutePoints()` return valid points, and the map will automatically draw the route

The geocoding can use the existing `useLocationAutocomplete` hook or a simpler approach: call the Mapbox geocoding API directly (already used elsewhere in the app) to get coordinates for the city name.

Concretely:
- Create a small helper function `geocodeCity(cityName: string): Promise<{lat, lng, country?, countryCode?}>`
- In the `provide_destination` handler, call this function
- Update memory with full coordinates: `updateMemory({ arrival: { city, lat, lng, country, countryCode } })`
- The existing map effect watching `getRoutePoints()` will automatically pick up the new coordinates and draw the route

---

### Technical Details

**Geocoding approach**: Use the Mapbox Geocoding API (already available via the project's Mapbox token) to resolve city names. A simple fetch to `https://api.mapbox.com/geocoding/v5/mapbox.places/{city}.json?access_token={token}&limit=1` returns coordinates.

**Files to modify**:
1. `src/components/planner/PlannerChat.tsx` - Revert DEFAULT suggestion case to `setInput()` + add geocoding in `provide_destination` handler
2. Optionally extract geocoding helper to a utility file for reuse

**No backend changes needed** - this is purely frontend.
