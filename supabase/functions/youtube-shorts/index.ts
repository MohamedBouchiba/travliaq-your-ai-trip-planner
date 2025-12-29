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
  category: string;
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

// Keywords to exclude non-travel content
const EXCLUDE_KEYWORDS = [
  "emperor", "empire", "comic", "comics", "movie", "film", "game", "gaming",
  "song", "music", "album", "band", "anime", "cartoon", "byzantine", "roman emperor",
  "airport", "aéroport", "terminal", "runway", "landing", "takeoff", "atterrissage",
  "décollage", "plane spotting", "aviation", "flight review",
];

// Keywords that indicate good travel content
const TRAVEL_INDICATORS = [
  "visit", "things to do", "travel guide", "tourist", "tourism", "explore",
  "walking tour", "street food", "hidden gems", "must see", "best places",
  "visite", "à voir", "que faire", "incontournable", "découvrir", "voyage",
];

// Filter for travel content and exclude bad content
function isAcceptable(video: YouTubeVideo): boolean {
  const titleLower = video.title.toLowerCase();
  const descLower = video.description.toLowerCase();
  const combined = `${titleLower} ${descLower}`;
  
  // Exclude bad content
  for (const keyword of EXCLUDE_KEYWORDS) {
    if (combined.includes(keyword)) {
      console.log(`[youtube-shorts] Excluding "${video.title}" - contains "${keyword}"`);
      return false;
    }
  }
  
  return true;
}

// Single optimized search - only 1 API call per city
async function searchYouTube(apiKey: string, city: string): Promise<YouTubeVideo[]> {
  // Query focused on travel/tourism content, NOT airports
  const searchQuery = `${city} things to do travel guide #shorts`;
  
  const searchParams = new URLSearchParams({
    part: "snippet",
    q: searchQuery,
    type: "video",
    videoDuration: "short",
    maxResults: "8", // Get 8, filter down to 4
    order: "viewCount", // Sort by views - most popular first
    safeSearch: "moderate",
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

    const videos = (data.items || []).map((item) => ({
      id: item.id.videoId,
      title: item.snippet.title,
      description: item.snippet.description,
      thumbnail: item.snippet.thumbnails.high?.url ||
                 item.snippet.thumbnails.medium?.url ||
                 item.snippet.thumbnails.default?.url || "",
      channelTitle: item.snippet.channelTitle,
      publishedAt: item.snippet.publishedAt,
      category: "travel",
    }));

    // Filter and take only top 4
    const acceptable = videos.filter(v => isAcceptable(v)).slice(0, 4);
    
    console.log(`[youtube-shorts] Found ${videos.length}, returning ${acceptable.length} (sorted by views)`);
    
    return acceptable;
  } catch (error) {
    console.error(`[youtube-shorts] Error:`, error);
    return [];
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city } = await req.json();

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

    console.log(`[youtube-shorts] Searching for: ${city} (1 API call, max 4 videos)`);

    // Single API call - optimized for quota
    const videos = await searchYouTube(apiKey, city);

    console.log(`[youtube-shorts] Returning ${videos.length} videos for ${city}`);

    return new Response(
      JSON.stringify({
        city,
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
