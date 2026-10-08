// ============================================================================
// SUPABASE CLIENT CONFIGURATION
// ============================================================================
// Replace the values below with your Project URL and anon public key from:
// Supabase Dashboard -> Project Settings -> API
// ============================================================================

const SUPABASE_CONFIG = {
  // Put your Supabase Project URL here (e.g. 'https://xyzcompany.supabase.co')
  url: window.SUPABASE_URL || "https://mgsnboigqmuzrykeahff.supabase.co",

  // Put your Supabase anon/public key here
  anonKey: window.SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'
};

// Global Supabase client instance
let supabaseClient = null;

/**
 * Initializes and returns the shared Supabase client instance.
 * Checks for configuration keys in SUPABASE_CONFIG or browser localStorage.
 * @returns {object|null} The initialized Supabase client, or null if keys are missing.
 */
function getSupabase() {
  if (supabaseClient) {
    return supabaseClient;
  }

  // Allow fallback from localStorage if customized in the browser modal
  const storedUrl = localStorage.getItem('loan_mg_supabase_url');
  const storedKey = localStorage.getItem('loan_mg_supabase_anon_key');

  const finalUrl = storedUrl || SUPABASE_CONFIG.url;
  const finalKey = storedKey || SUPABASE_CONFIG.anonKey;

  // Validate that placeholder text was replaced
  if (
    !finalUrl ||
    !finalKey ||
    finalUrl.includes('YOUR_SUPABASE') ||
    finalKey.includes('YOUR_SUPABASE')
  ) {
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
 * Saves Supabase credentials into localStorage for instant setup from the browser UI.
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
 * Clears saved Supabase credentials from localStorage.
 */
function clearSupabaseConfig() {
  localStorage.removeItem('loan_mg_supabase_url');
  localStorage.removeItem('loan_mg_supabase_anon_key');
  supabaseClient = null;
}
