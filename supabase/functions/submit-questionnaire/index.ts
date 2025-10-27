import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Simple in-memory rate limiter (resets on function restart)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS_PER_MINUTE = 3;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(identifier, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  
  if (record.count >= MAX_REQUESTS_PER_MINUTE) {
    return false;
  }
  
  record.count++;
  return true;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP for rate limiting
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    
    // Check rate limit
    if (!checkRateLimit(clientIp)) {
      console.log('Rate limit exceeded for IP:', clientIp);
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const questionnaireData = await req.json();
    
    // Comprehensive input validation
    // Email validation
    if (!questionnaireData.email || typeof questionnaireData.email !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(questionnaireData.email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (questionnaireData.email.length > 255) {
      return new Response(
        JSON.stringify({ error: 'Email too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate numeric fields
    if (questionnaireData.montant_budget !== undefined && questionnaireData.montant_budget !== null) {
      const budgetNum = Number(questionnaireData.montant_budget);
      if (isNaN(budgetNum) || budgetNum < 0 || budgetNum > 1000000) {
        return new Response(
          JSON.stringify({ error: 'Invalid budget amount' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    if (questionnaireData.nuits_exactes !== undefined && questionnaireData.nuits_exactes !== null) {
      const nightsNum = Number(questionnaireData.nuits_exactes);
      if (isNaN(nightsNum) || nightsNum < 1 || nightsNum > 365 || !Number.isInteger(nightsNum)) {
        return new Response(
          JSON.stringify({ error: 'Invalid number of nights' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    if (questionnaireData.nombre_voyageurs !== undefined && questionnaireData.nombre_voyageurs !== null) {
      const travelersNum = Number(questionnaireData.nombre_voyageurs);
      if (isNaN(travelersNum) || travelersNum < 1 || travelersNum > 50 || !Number.isInteger(travelersNum)) {
        return new Response(
          JSON.stringify({ error: 'Invalid number of travelers' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Validate text field lengths
    const textFields = ['lieu_depart', 'destination', 'quartier', 'infos_supplementaires', 'open_comments'];
    for (const field of textFields) {
      if (questionnaireData[field] && typeof questionnaireData[field] === 'string') {
        if (questionnaireData[field].length > 1000) {
          return new Response(
            JSON.stringify({ error: `${field} is too long (max 1000 characters)` }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }
    
    // Validate date fields
    if (questionnaireData.date_depart) {
      const depDate = new Date(questionnaireData.date_depart);
      if (isNaN(depDate.getTime())) {
        return new Response(
          JSON.stringify({ error: 'Invalid departure date format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    if (questionnaireData.date_retour) {
      const retDate = new Date(questionnaireData.date_retour);
      if (isNaN(retDate.getTime())) {
        return new Response(
          JSON.stringify({ error: 'Invalid return date format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    if (questionnaireData.date_depart_approximative) {
      const approxDate = new Date(questionnaireData.date_depart_approximative);
      if (isNaN(approxDate.getTime())) {
        return new Response(
          JSON.stringify({ error: 'Invalid approximate departure date format' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }
    
    // Initialize Supabase client with service role key for bypassing RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // CRITICAL: Require authentication - get user_id from the request
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.log('Missing authorization header');
      return new Response(
        JSON.stringify({ 
          error: 'authentication_required',
          message: 'Vous devez être connecté pour soumettre un questionnaire.' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Verify the JWT token and get the user
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      console.log('Invalid or expired token');
      return new Response(
        JSON.stringify({ 
          error: 'authentication_required',
          message: 'Session invalide ou expirée. Veuillez vous reconnecter.' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Checking daily quota for user:', user.id, 'email:', questionnaireData.email);
    
    // Check how many questionnaires this user+email combination has submitted in the last 24 hours
    // Using BOTH user_id AND email as dual key for quota
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: recentSubmissions, error: countError } = await supabase
      .from('questionnaire_responses')
      .select('id', { count: 'exact', head: false })
      .eq('user_id', user.id)
      .eq('email', questionnaireData.email)
      .gte('created_at', twentyFourHoursAgo);
    
    if (countError) {
      console.error('Error checking quota:', countError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to check submission quota' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Check if user has reached the daily limit of 2 submissions
    if (recentSubmissions && recentSubmissions.length >= 2) {
      console.log('Daily quota exceeded for user:', user.id, 'email:', questionnaireData.email);
      return new Response(
        JSON.stringify({ 
          error: 'quota_exceeded',
          message: 'Vous avez atteint votre quota de 2 questionnaires par jour. Revenez demain pour planifier un autre voyage !' 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Set the user_id from authenticated user
    questionnaireData.user_id = user.id;
    
    console.log('Inserting questionnaire response for user:', user.id, 'email:', questionnaireData.email);
    
    // Insert the questionnaire response
    const { data, error } = await supabase
      .from('questionnaire_responses')
      .insert([questionnaireData])
      .select()
      .single();
    
    if (error) {
      console.error('Database error:', error.message);
      return new Response(
        JSON.stringify({ error: 'Failed to save questionnaire response' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Questionnaire response saved successfully:', data.id);
    
    // Call enqueue-answer in background to send ID to SQS
    const enqueueAnswerUrl = `${supabaseUrl}/functions/v1/enqueue-answer`;
    const enqueueTask = async () => {
      try {
        console.log('Calling enqueue-answer for questionnaire ID:', data.id);
        const enqueueResponse = await fetch(enqueueAnswerUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ answer_id: data.id }),
        });
        
        if (!enqueueResponse.ok) {
          const errorText = await enqueueResponse.text();
          console.error('Failed to enqueue answer:', enqueueResponse.status, errorText);
        } else {
          console.log('Successfully enqueued answer ID to SQS:', data.id);
        }
      } catch (enqueueError) {
        console.error('Error calling enqueue-answer:', enqueueError);
      }
    };
    
    // Run enqueue task in background
    EdgeRuntime.waitUntil(enqueueTask());
    
    return new Response(
      JSON.stringify({ data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Submission error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
