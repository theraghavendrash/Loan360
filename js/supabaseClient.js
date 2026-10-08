// ============================================================================
// LOAN 360 - SUPABASE CLIENT CONFIGURATION
// ============================================================================
// Hardcoded Project URL and Anon Public Key for Loan 360.
// ============================================================================

const SUPABASE_CONFIG = {
  // Hardcoded Supabase Project URL
  url: 'https://mgsnboigqmuzrykeahff.supabase.co',

  // Hardcoded Supabase Anon / Publishable public key
  anonKey: 'sb_publishable_l-Bmlr8QC8VclhL98Ay5yQ_Mn8YQ8fR'
};

// Global Supabase client instance
let supabaseClient = null;

/**
 * Initializes and returns the shared Supabase client instance.
 * Uses only the hardcoded SUPABASE_CONFIG credentials.
 * @returns {object|null} The initialized Supabase client, or null if keys are missing.
 */
function getSupabase() {
  if (supabaseClient) {
    return supabaseClient;
  }

  try {
    const finalUrl = SUPABASE_CONFIG.url;
    const finalKey = SUPABASE_CONFIG.anonKey;

    // Validate that required credentials exist
    if (!finalUrl || !finalKey) {
      console.warn('Supabase credentials missing.');
      return null;
    }

    // Check if the Supabase script was loaded from CDN
    if (typeof window.supabase === 'undefined' || typeof window.supabase.createClient !== 'function') {
      console.error('Supabase CDN library is not loaded on the page.');
      return null;
    }

    supabaseClient = window.supabase.createClient(finalUrl, finalKey);
    return supabaseClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}
