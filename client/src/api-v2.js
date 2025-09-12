/**
 * GuideOps Chat API v2 - Redis Streams
 * Professional message handling with perfect attribution
 */

import axios from 'axios';

// Configure for Redis Streams testing with live backend (Railway deployed)
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_API_URL || 'https://redis-guideops-chat-production.up.railway.app'
  : 'https://redis-guideops-chat-production.up.railway.app'; // Use live backend for Redis Streams testing

axios.defaults.withCredentials = true;

const url = x => `${BASE_URL}${x}`;

// Log API configuration
console.log('[API v2] Redis Streams API initialized');
console.log('[API v2] Base URL:', BASE_URL);

/**
 * Get messages using Redis Streams
 * @param {string} roomId - Room identifier
 * @param {number} count - Number of messages to retrieve (default 15)
 * @param {string} beforeId - Stream ID for pagination (optional)
 * @returns {Promise<{messages: Array, hasMore: boolean, oldestId: string, newestId: string}>}
 */
// Add missing V2 API functions for App.jsx compatibility
export const getOnlineUsersV2 = () => {
  return axios.get(url('/users/online'))
    .then(x => x.data)
    .catch(e => { 
      throw new Error(e.response && e.response.data && e.response.data.error || 'Failed to get online users'); 
    });
};

export const getRoomsV2 = (userId) => {
  return axios.get(url(`/rooms/${userId}`))
    .then(x => x.data)
    .catch(e => { 
      throw new Error(e.response && e.response.data && e.response.data.error || 'Failed to get rooms'); 
    });
};

export const getMessagesV2 = (roomId, count = 15, beforeId = null) => {
  const params = { count };
  if (beforeId) {
    params.before = beforeId;
  }
  
  return axios.get(url(`/v2/rooms/${roomId}/messages`), { params })
    .then(response => {
      console.log(`[API v2] Retrieved ${response.data.messages.length} messages for room ${roomId}`);
      return response.data;
    })
    .catch(error => {
      console.error('[API v2] Error getting messages:', error);
      throw error;
    });
};

/**
 * Send message using Redis Streams with optional GPS location
 * @param {string} roomId - Room identifier
 * @param {string} messageText - Message content
 * @param {Object} options - Optional parameters
 * @param {number} options.latitude - GPS latitude
 * @param {number} options.longitude - GPS longitude
 * @returns {Promise<Object>} Complete message object with stream ID
 */
export const sendMessageV2 = (roomId, messageText, options = {}) => {
  const payload = {
    message: messageText
  };
  
  // Add GPS coordinates if provided
  if (options.latitude !== undefined && options.longitude !== undefined) {
    payload.latitude = options.latitude;
    payload.longitude = options.longitude;
  }
  
  return axios.post(url(`/v2/rooms/${roomId}/messages`), payload)
    .then(response => {
      console.log(`[API v2] Message sent to room ${roomId}${options.latitude ? ' with location' : ''}:`, response.data.id);
      return response.data;
    })
    .catch(error => {
      console.error('[API v2] Error sending message:', error);
      throw error;
    });
};

/**
 * Clear all messages from room (admin only)
 * @param {string} roomId - Room identifier  
 * @returns {Promise<Object>} Operation result
 */
export const clearRoomMessagesV2 = (roomId) => {
  return axios.delete(url(`/v2/rooms/${roomId}/clear`))
    .then(response => {
      console.log(`[API v2] Room ${roomId} cleared:`, response.data);
      return response.data;
    })
    .catch(error => {
      console.error('[API v2] Error clearing room:', error);
      throw error;
    });
};

/**
 * Get Redis Streams system status
 * @returns {Promise<Object>} System status and capabilities
 */
export const getSystemStatusV2 = () => {
  return axios.get(url('/v2/system/status'))
    .then(response => {
      console.log('[API v2] System status:', response.data);
      return response.data;
    })
    .catch(error => {
      console.error('[API v2] Error getting system status:', error);
      throw error;
    });
};

/**
 * Migrate to Redis Streams (super admin only)
 * @returns {Promise<Object>} Migration result
 */
export const migrateToStreamsV2 = () => {
  return axios.post(url('/v2/system/migrate'))
    .then(response => {
      console.log('[API v2] Migration completed:', response.data);
      return response.data;
    })
    .catch(error => {
      console.error('[API v2] Error migrating:', error);
      throw error;
    });
};
