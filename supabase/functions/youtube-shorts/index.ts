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

// SIMPLIFIED: Only 2 categories to reduce API quota usage
// travel (80%) + food (20%)
const SEARCH_QUERIES = {
  travel: [
    "travel vlog",
    "travel guide",
    "visit tour",
    "trip travel",
    "explore travel",
  ],
  food: [
    "food tour travel",
    "restaurant travel",
    "street food travel",
  ],
};

// Keywords to exclude non-travel content
const EXCLUDE_KEYWORDS = [
  "emperor", "empire", "comic", "comics", "movie", "film", "game", "gaming",
  "song", "music", "album", "band", "anime", "cartoon", "byzantine", "roman emperor",
];

// Lighter filter - just exclude bad content, don't require travel keywords
function isAcceptable(video: YouTubeVideo): boolean {
  const titleLower = video.title.toLowerCase();
  const descLower = video.description.toLowerCase();
  const combined = `${titleLower} ${descLower}`;
  
  // Exclude non-travel content
  for (const keyword of EXCLUDE_KEYWORDS) {
    if (combined.includes(keyword)) {
      console.log(`[youtube-shorts] Excluding "${video.title}" - contains "${keyword}"`);
      return false;
    }
  }
  
  return true;
}

async function searchYouTube(
  apiKey: string, 
  city: string, 
  category: string, 
  query: string
): Promise<YouTubeVideo[]> {
  // Simple query: city + query + shorts
  const searchQuery = `${city} ${query} #shorts`;
  
  const searchParams = new URLSearchParams({
    part: "snippet",
    q: searchQuery,
    type: "video",
    videoDuration: "short",
    maxResults: "10", // Get more results per call
    order: "relevance",
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
      console.error(`[youtube-shorts] API error for ${category}: ${response.status} - ${errorText}`);
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
      category,
    }));

    // Light filter - just exclude bad content
    const acceptable = videos.filter(v => isAcceptable(v));
    
    console.log(`[youtube-shorts] ${category}: ${videos.length} found, ${acceptable.length} acceptable`);
    
    return acceptable;
  } catch (error) {
    console.error(`[youtube-shorts] Error searching ${category}:`, error);
    return [];
  }
}

// Shuffle array randomly
function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
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

    console.log(`[youtube-shorts] Searching for: ${city}`);

    // Only 2 API calls to save quota: 1 travel + 1 food
    const travelQuery = SEARCH_QUERIES.travel[Math.floor(Math.random() * SEARCH_QUERIES.travel.length)];
    const foodQuery = SEARCH_QUERIES.food[Math.floor(Math.random() * SEARCH_QUERIES.food.length)];

    const [travelVideos, foodVideos] = await Promise.all([
      searchYouTube(apiKey, city, "travel", travelQuery),
      searchYouTube(apiKey, city, "food", foodQuery),
    ]);

    // Combine: take up to 8 travel + 3 food, then shuffle
    const usedIds = new Set<string>();
    const finalVideos: YouTubeVideo[] = [];

    // Add travel videos (max 8)
    for (const video of travelVideos) {
      if (!usedIds.has(video.id) && finalVideos.length < 8) {
        finalVideos.push(video);
        usedIds.add(video.id);
      }
    }

    // Add food videos (max 3)
    let foodCount = 0;
    for (const video of foodVideos) {
      if (!usedIds.has(video.id) && foodCount < 3) {
        finalVideos.push(video);
        usedIds.add(video.id);
        foodCount++;
      }
    }

    // Shuffle the results for variety
    const shuffled = shuffle(finalVideos);

    console.log(`[youtube-shorts] Returning ${shuffled.length} videos (travel: ${finalVideos.length - foodCount}, food: ${foodCount})`);

    return new Response(
      JSON.stringify({
        city,
        videos: shuffled,
        count: shuffled.length,
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
