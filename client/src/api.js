import axios from 'axios';
axios.defaults.withCredentials = true;

const BASE_URL = '';

export const MESSAGES_TO_LOAD = 15;

const url = x => `${BASE_URL}${x}`;

/** Checks if there's an existing session. */
export const getMe = () => {
  return axios.get(url('/me'))
    .then(x => x.data)
    .catch(_ => null);
};

/** Handle user log in */
export const login = (username, password) => {
  return axios.post(url('/login'), {
    username,
    password
  }).then(x =>
    x.data
  )
    .catch(e => { throw new Error(e.response && e.response.data && e.response.data.message); });
};

export const logOut = () => {
  return axios.post(url('/logout'));
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

export const getEventSource = () => new EventSource(url('/stream'));

// ============================================================================
// ENHANCED REDIS API FUNCTIONS
// ============================================================================

/** Create a new channel */
export const createChannel = async (name, type = 'public', description = '') => {
  return axios.post(url('/api/channels'), {
    name,
    type,
    description
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