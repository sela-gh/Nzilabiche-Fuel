import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./env.js";

loadEnv();

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

export const getSupabaseStatus = async () => {
  if (!isSupabaseConfigured) {
    return {
      connected: false,
      configured: false,
      url: null,
      message: "Supabase environment variables are not configured."
    };
  }

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`
      }
    });

    return {
      connected: response.ok,
      configured: true,
      url: supabaseUrl,
      status: response.status,
      message: response.ok ? "Supabase project is reachable." : `Supabase returned HTTP ${response.status}.`
    };
  } catch (error) {
    return {
      connected: false,
      configured: true,
      url: supabaseUrl,
      message: error.message || "Could not reach Supabase."
    };
  }
};
