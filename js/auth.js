// ============================================================================
// LOAN 360 - AUTHENTICATION MODULE
// ============================================================================
// Handles borrower registration, login, logout, profile role retrieval,
// and role-based page protection / redirection.
// ============================================================================

/**
 * Registers a new borrower with Supabase Auth.
 * Role is strictly assigned as 'customer' (borrower) by the database trigger.
 * 
 * @param {string} email - Borrower email address
 * @param {string} password - User password (min 6 chars)
 * @param {string} fullName - Borrower display name
 * @returns {Promise<object>} Supabase signup response data
 */
async function signUpUser(email, password, fullName) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client is not configured yet.');

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName
      }
    }
  });

  if (error) throw error;
  return data;
}

/**
 * Logs in an existing user with email and password.
 * 
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<object>} Supabase sign-in response data
 */
async function signInUser(email, password) {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client is not configured yet.');

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) throw error;
  return data;
}

/**
 * Signs out the currently authenticated user and redirects to login page.
 */
async function signOutUser() {
  const supabase = getSupabase();
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign-out error:', err);
    }
  }
  window.location.href = 'index.html';
}

/**
 * Retrieves the currently active Supabase session user.
 * 
 * @returns {Promise<object|null>} The auth user object or null
 */
async function getCurrentUser() {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return null;
  return session.user;
}

/**
 * Fetches the user profile from the 'profiles' table by user UUID.
 * 
 * @param {string} userId - User UUID
 * @returns {Promise<object|null>} The profile record with role
 */
async function getUserProfile(userId) {
  const supabase = getSupabase();
  if (!supabase || !userId) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
}

/**
 * Redirects the user to the appropriate portal based on their assigned role.
 * 
 * @param {string} role - 'admin' or 'customer'
 */
function redirectByRole(role) {
  if (role === 'admin') {
    window.location.href = 'admin.html';
  } else {
    window.location.href = 'customer.html';
  }
}

/**
 * Route guard that ensures the user is logged in and possesses the required role.
 * Redirects unauthorized or unauthenticated users to the login screen.
 * 
 * @param {string} expectedRole - Optional: 'admin' or 'customer'
 * @returns {Promise<{user: object, profile: object}|null>} User and profile objects
 */
async function requireAuth(expectedRole = null) {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = 'index.html';
    return null;
  }

  const profile = await getUserProfile(user.id);
  const actualRole = profile ? profile.role : (user.user_metadata?.role || 'customer');

  if (expectedRole && actualRole !== expectedRole) {
    redirectByRole(actualRole);
    return null;
  }

  return { user, profile: profile || { id: user.id, role: actualRole, full_name: user.user_metadata?.full_name } };
}
