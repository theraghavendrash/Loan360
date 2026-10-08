// ============================================================================
// LOAN 360 - SUPABASE CLIENT CONFIGURATION
// ============================================================================
// Hardcoded Project URL and Anon Public Key for Loan 360.
// This allows the application to work out of the box on GitHub Pages
// even when the browser has no keys saved in localStorage.
// (Do NOT use service_role key here; only anon/publishable key is used).
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
 * Prioritizes custom localStorage overrides if present, otherwise defaults
 * directly to the hardcoded SUPABASE_CONFIG credentials.
 * @returns {object|null} The initialized Supabase client, or null if keys are missing.
 */
function getSupabase() {
  if (supabaseClient) {
    return supabaseClient;
  }

  // Use localStorage if custom keys were saved in the browser modal, otherwise fallback to hardcoded keys
  const storedUrl = localStorage.getItem('loan_mg_supabase_url');
  const storedKey = localStorage.getItem('loan_mg_supabase_anon_key');

  const finalUrl = (storedUrl && storedUrl.trim()) || SUPABASE_CONFIG.url;
  const finalKey = (storedKey && storedKey.trim()) || SUPABASE_CONFIG.anonKey;

  // Validate that required credentials exist
  if (!finalUrl || !finalKey) {
    console.warn('Supabase credentials have not been configured yet.');
    return null;
  }

  // Check if the Supabase script was loaded from CDN
  if (typeof window.supabase === 'undefined') {
    console.error('Supabase CDN library is not loaded on the page.');
    return null;
  }

  supabaseClient = window.supabase.createClient(finalUrl, finalKey);
  return supabaseClient;
}

/**
 * Saves Supabase credentials into localStorage for custom overrides from the browser UI.
 * @param {string} url - Supabase Project URL
 * @param {string} key - Supabase Anon Public Key
 */
function saveSupabaseConfig(url, key) {
  if (url && key) {
    localStorage.setItem('loan_mg_supabase_url', url.trim());
    localStorage.setItem('loan_mg_supabase_anon_key', key.trim());
    supabaseClient = null; // Reset to force re-instantiation
  }
}

/**
 * Clears saved Supabase credentials from localStorage and reverts to hardcoded defaults.
 */
function clearSupabaseConfig() {
  localStorage.removeItem('loan_mg_supabase_url');
  localStorage.removeItem('loan_mg_supabase_anon_key');
  supabaseClient = null;
}
