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
 * Prioritizes custom localStorage overrides if valid, otherwise defaults
 * directly to the hardcoded SUPABASE_CONFIG credentials. Clears any stale or
 * corrupted placeholder values from localStorage.
 * @returns {object|null} The initialized Supabase client, or null if keys are missing.
 */
function getSupabase() {
  if (supabaseClient) {
    return supabaseClient;
  }

  try {
    let finalUrl = SUPABASE_CONFIG.url;
    let finalKey = SUPABASE_CONFIG.anonKey;

    // Read localStorage overrides, while ignoring corruptions / placeholder strings
    const storedUrl = localStorage.getItem('loan_mg_supabase_url');
    const storedKey = localStorage.getItem('loan_mg_supabase_anon_key');

    if (
      storedUrl && 
      storedUrl.trim() && 
      !storedUrl.includes('YOUR_SUPABASE') && 
      storedUrl !== 'undefined' && 
      storedUrl !== 'null'
    ) {
      finalUrl = storedUrl.trim();
    } else if (storedUrl) {
      // Clear corrupt or placeholder entry
      localStorage.removeItem('loan_mg_supabase_url');
    }

    if (
      storedKey && 
      storedKey.trim() && 
      !storedKey.includes('YOUR_SUPABASE') && 
      storedKey !== 'undefined' && 
      storedKey !== 'null'
    ) {
      finalKey = storedKey.trim();
    } else if (storedKey) {
      // Clear corrupt or placeholder entry
      localStorage.removeItem('loan_mg_supabase_anon_key');
    }

    // Validate that required credentials exist
    if (!finalUrl || !finalKey) {
      console.warn('Supabase credentials have not been configured yet.');
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
