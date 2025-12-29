-- Fix: ensure views run with invoker privileges (prevents SECURITY DEFINER view behavior)
-- This addresses Supabase linter "Security Definer View".

ALTER VIEW IF EXISTS public.commercial_airports SET (security_invoker = true);
ALTER VIEW IF EXISTS public.search_autocomplete SET (security_invoker = true);
