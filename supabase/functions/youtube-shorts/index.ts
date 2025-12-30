import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
}

interface YouTubeSearchResponse {
  items?: {
    id: { videoId: string };
    snippet: {
      title: string;
      description: string;
      channelTitle: string;
      publishedAt: string;
      thumbnails: {
        high?: { url: string };
        medium?: { url: string };
        default?: { url: string };
      };
    };
  }[];
}

// Keywords that MUST be excluded - not travel related
const EXCLUDE_KEYWORDS = [
  // Entertainment
  "emperor", "empire", "comic", "comics", "movie", "film", "trailer", "game", "gaming",
  "song", "music", "album", "band", "anime", "cartoon", "byzantine", "roman emperor",
  "review", "unboxing", "reaction", "podcast", "interview", "news", "breaking",
  "meme", "funny", "prank", "challenge", "asmr",
  // Airport/Aviation (we want the CITY not airport)
  "airport", "aéroport", "terminal", "runway", "landing", "takeoff", "atterrissage",
  "décollage", "plane spotting", "aviation", "flight review", "lounge review",
  "business class", "first class", "economy class",
  // Sports
  "world cup", "fifa", "football match", "soccer", "basketball", "f1", "formula 1",
  "grand prix", "race", "stadium tour",
  // Politics/News
  "politics", "election", "war", "conflict", "protest",
  // Real estate/Business
  "real estate", "property", "investment", "crypto", "trading",
];

// Keywords that indicate GOOD travel content
const TRAVEL_POSITIVE_KEYWORDS = [
  "things to do", "que faire", "what to do", "must see", "must visit",
  "top 10", "top 5", "best places", "hidden gems", "travel guide",
  "walking tour", "city tour", "visit", "visite", "discover", "découvrir",
  "tourist", "tourism", "tourisme", "vacation", "holiday", "trip",
  "explore", "explorer", "sightseeing", "attractions", "landmarks",
  "neighbourhood", "neighborhood", "quartier", "district",
];

// Check if video is travel-related
function isTravelContent(video: YouTubeVideo): boolean {
  const titleLower = video.title.toLowerCase();
  const descLower = video.description.toLowerCase();
  const combined = `${titleLower} ${descLower}`;
  
  // EXCLUDE: Check for bad keywords
  for (const keyword of EXCLUDE_KEYWORDS) {
    if (combined.includes(keyword.toLowerCase())) {
      console.log(`[youtube-shorts] Excluding "${video.title}" - contains "${keyword}"`);
      return false;
    }
  }
  
  // PREFER: Check for travel-positive keywords (bonus but not required)
  let hasPositiveKeyword = false;
  for (const keyword of TRAVEL_POSITIVE_KEYWORDS) {
    if (combined.includes(keyword.toLowerCase())) {
      hasPositiveKeyword = true;
      break;
    }
  }
  
  if (hasPositiveKeyword) {
    console.log(`[youtube-shorts] Good travel content: "${video.title}"`);
  }
  
  return true;
}

// Search YouTube with travel-focused query
async function searchYouTube(apiKey: string, city: string, country?: string): Promise<YouTubeVideo[]> {
  // Build a travel-focused search query
  // Using "things to do in [city]" which is the most common travel search
  const locationQuery = country ? `${city} ${country}` : city;
  const searchQuery = `things to do in ${locationQuery} travel #shorts`;
  
  console.log(`[youtube-shorts] Searching: "${searchQuery}"`);
  
  const searchParams = new URLSearchParams({
    part: "snippet",
    q: searchQuery,
    type: "video",
    videoDuration: "short",
    maxResults: "15",
    order: "relevance",
    safeSearch: "moderate",
    relevanceLanguage: "en",
    key: apiKey,
  });

  const searchUrl = `https://www.googleapis.com/youtube/v3/search?${searchParams}`;

  try {
    const response = await fetch(searchUrl, {
      headers: {
        "Referer": "https://cinbnmlfpffmyjmkwbco.supabase.co",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[youtube-shorts] API error: ${response.status} - ${errorText}`);
      return [];
    }

    const data: YouTubeSearchResponse = await response.json();

    const videos: YouTubeVideo[] = (data.items || []).map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high?.url ||
                 item.snippet.thumbnails.medium?.url ||
                 item.snippet.thumbnails.default?.url || "",
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
    }));

    // Filter for travel content only, take top 6
    const travelVideos = videos.filter(v => isTravelContent(v)).slice(0, 6);
    
    console.log(`[youtube-shorts] Found ${videos.length} total, ${travelVideos.length} travel videos for ${city}`);
    
    return travelVideos;
  } catch (error) {
    console.error(`[youtube-shorts] Error:`, error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, country } = await req.json();

    if (!city) {
      return new Response(
        JSON.stringify({ error: "City parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const apiKey = Deno.env.get("YOUTUBE_API_KEY");
    if (!apiKey) {
      console.error("[youtube-shorts] YOUTUBE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "YouTube API not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[youtube-shorts] Request for: ${city}${country ? `, ${country}` : ""}`);

    const videos = await searchYouTube(apiKey, city, country);

    return new Response(
      JSON.stringify({
        city,
        country,
        videos,
        count: videos.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );

  } catch (error) {
    console.error("[youtube-shorts] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", message: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});