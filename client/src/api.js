import axios from 'axios';
axios.defaults.withCredentials = true;

// Configure API base URL for split deployment
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_API_URL || 'https://redis-guideops-chat-production.up.railway.app'
  : 'https://redis-guideops-chat-production.up.railway.app'; // Use live backend for local dev

export const MESSAGES_TO_LOAD = 15;

export const url = x => `${BASE_URL}${x}`;

// Log API configuration for debugging
console.log(`[API] Environment: ${process.env.NODE_ENV}`);
console.log(`[API] Base URL: ${BASE_URL}`);

/** Checks if there's an existing session. */
export const getMe = () => {
  return axios.get(url('/me'))
    .then(x => {
      console.log('[Session] Valid session found:', x.data);
      // Store user data in localStorage as backup
      localStorage.setItem('guideops_user', JSON.stringify(x.data));
      return x.data;
    })
    .catch(error => {
      console.log('[Session] No valid session:', error.response?.status);
      // Clear any stale localStorage data
      localStorage.removeItem('guideops_user');
      return null;
    });
};

/** Handle user log in */
export const login = (username, password) => {
  return axios.post(url('/login'), {
    username,
    password
  }).then(x => {
    console.log('[Login] Successful login:', x.data);
    // Store user data for session persistence
    localStorage.setItem('guideops_user', JSON.stringify(x.data));
    return x.data;
  })
    .catch(e => { 
      console.log('[Login] Login failed:', e.response?.data?.message);
      localStorage.removeItem('guideops_user');
      throw new Error(e.response && e.response.data && e.response.data.message); 
    });
};

export const logOut = () => {
  return axios.post(url('/logout'))
    .then(() => {
      console.log('[Logout] Session cleared');
      // Clear localStorage on logout
      localStorage.removeItem('guideops_user');
    })
    .catch(error => {
      console.log('[Logout] Error:', error);
      // Clear localStorage even if logout fails
      localStorage.removeItem('guideops_user');
    });
};

/** Handle user registration */
export const register = (userData) => {
  return axios.post(url('/register'), userData)
    .then(x => x.data)
    .catch(e => { 
      throw new Error(e.response && e.response.data && e.response.data.error || 'Registration failed'); 
    });
};

/** Check if system needs initialization */
export const getSystemStatus = () => {
  return axios.get(url('/system/status'))
    .then(x => x.data)
    .catch(e => { 
      throw new Error(e.response && e.response.data && e.response.data.error || 'Failed to get system status'); 
    });
};

/** Get user profile */
export const getProfile = () => {
  return axios.get(url('/profile'))
    .then(x => x.data)
    .catch(e => { 
      throw new Error(e.response && e.response.data && e.response.data.error || 'Failed to get profile'); 
    });
};

/** Update user profile */
export const updateProfile = (profileData) => {
  return axios.put(url('/profile'), profileData)
    .then(x => x.data)
    .catch(e => { 
      throw new Error(e.response && e.response.data && e.response.data.error || 'Failed to update profile'); 
    });
};

/** 
 * Function for checking which deployment urls exist.
 * 
 * @returns {Promise<{
 *   heroku?: string;
 *   google_cloud?: string;
 *   vercel?: string;
 *   github?: string;
 * }>} 
 */
export const getButtonLinks = () => {
  return axios.get(url('/links'))
    .then(x => x.data)
    .catch(_ => null);
};

/** This was used to get a random login name (for demo purposes). */
export const getRandomName = () => {
  return axios.get(url('/randomname')).then(x => x.data);
};

/**
 * Load messages
 * 
 * @param {string} id room id
 * @param {number} offset 
 * @param {number} size 
 */
export const getMessages = (id,
  offset = 0,
  size = MESSAGES_TO_LOAD
) => {
  return axios.get(url(`/room/${id}/messages`), {
    params: {
      offset,
      size
    }
  })
    .then(x => x.data.reverse());
};

/**
 * @returns {Promise<{ name: string, id: string, messages: Array<import('./state').Message> }>}
 */
export const getPreloadedRoom = async () => {
  return axios.get(url(`/room/0/preload`)).then(x => x.data);
};

/** 
 * Fetch users by requested ids
 * @param {Array<number | string>} ids
 */
export const getUsers = (ids) => {
  return axios.get(url(`/users`), { params: { ids } }).then(x => x.data);
};

/** Fetch users which are online */
export const getOnlineUsers = () => {
  return axios.get(url(`/users/online`)).then(x => x.data);
};

/** This one is called on a private messages room created. */
export const addRoom = async (user1, user2) => {
  return axios.post(url(`/room`), { user1, user2 }).then(x => x.data);
};

/** 
 * @returns {Promise<Array<{ names: string[]; id: string }>>} 
 */
export const getRooms = async (userId) => {
  return axios.get(url(`/rooms/${userId}`)).then(x => x.data);
};

// REMOVED: getEventSource - replaced with V2 XREAD system in ChatPage.jsx
// export const getEventSource = () => new EventSource(url('/stream'));

// ============================================================================
// ENHANCED REDIS API FUNCTIONS
// ============================================================================

/** Create a new channel */
export const createChannel = async (name, type = 'public', description = '') => {
  // Get user ID for cross-domain requests
  let user_id = null;
  try {
    const storedUser = localStorage.getItem('guideops_user');
    if (storedUser) {
      const userData = JSON.parse(storedUser);
      user_id = userData.id;
    }
  } catch (error) {
    console.warn('[API] Could not get user_id for channel creation:', error);
  }
  
  return axios.post(url('/api/channels'), {
    name,
    type,
    description,
    user_id  // Include user_id for cross-domain auth
  }).then(x => x.data);
};

/** Get channel details */
export const getChannel = async (channelId) => {
  return axios.get(url(`/api/channels/${channelId}`)).then(x => x.data);
};

/** Get channel members */
export const getChannelMembers = async (channelId) => {
  return axios.get(url(`/api/channels/${channelId}/members`)).then(x => x.data);
};

/** Send message to channel using new API */
export const sendChannelMessage = async (channelId, text, attachments = []) => {
  return axios.post(url(`/api/channels/${channelId}/messages`), {
    text,
    attachments
  }).then(x => x.data);
};

/** Get channel messages using new API */
export const getChannelMessages = async (channelId, offset = 0, limit = 50) => {
  return axios.get(url(`/api/channels/${channelId}/messages`), {
    params: { offset, limit }
  }).then(x => x.data);
};

/** Create DM channel */
export const createDM = async (userId) => {
  return axios.post(url(`/api/dm/${userId}`)).then(x => x.data);
};

/** Get user profile */
export const getUserProfile = async (userId) => {
  return axios.get(url(`/api/users/${userId}`)).then(x => x.data);
};