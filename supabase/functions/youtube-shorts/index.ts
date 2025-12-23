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
  viewCount?: string;
}

interface YouTubeSearchResponse {
  items: {
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

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, language = "fr" } = await req.json();

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

    console.log(`[youtube-shorts] Searching for Shorts about: ${city}`);

    // Build search queries for travel-related Shorts
    const searchQueries = [
      `${city} travel #shorts`,
      `${city} things to do #shorts`,
      `visit ${city} #shorts`,
      `${city} food tour #shorts`,
      `${city} hidden gems #shorts`,
    ];

    // Pick a random query to get varied results
    const randomQuery = searchQueries[Math.floor(Math.random() * searchQueries.length)];

    // Search for YouTube Shorts (videos under 60 seconds, vertical format)
    const searchParams = new URLSearchParams({
      part: "snippet",
      q: randomQuery,
      type: "video",
      videoDuration: "short", // Only short videos (< 4 minutes, closest to Shorts)
      maxResults: "12",
      order: "relevance",
      relevanceLanguage: language,
      safeSearch: "moderate",
      key: apiKey,
    });

    const searchUrl = `https://www.googleapis.com/youtube/v3/search?${searchParams}`;
    console.log(`[youtube-shorts] Fetching from YouTube API...`);

    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[youtube-shorts] YouTube API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: "YouTube API error", details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data: YouTubeSearchResponse = await response.json();
    console.log(`[youtube-shorts] Found ${data.items?.length || 0} videos`);

    // Transform to cleaner format
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

    return new Response(
      JSON.stringify({ 
        city,
        query: randomQuery,
        videos,
        count: videos.length 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
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
