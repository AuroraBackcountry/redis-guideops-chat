/**
 * GuideOps Chat API v2 - Redis Streams
 * Professional message handling with perfect attribution
 */

import axios from 'axios';

// Configure API base URL - matches api.js for consistent local/production split
const BASE_URL = process.env.NODE_ENV === 'production' 
  ? process.env.REACT_APP_API_URL || 'https://redis-guideops-chat-production.up.railway.app'
  : process.env.REACT_APP_API_URL || 'http://localhost:5000'; // Local backend for local dev

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
export const sendMessageV2 = async (roomId, messageText, options = {}) => {
  const payload = {
    message: messageText
  };
  
  // Add user ID for cross-domain authentication
  let userData = {};
  try {
    const storedUser = localStorage.getItem('guideops_user');
    if (storedUser) {
      userData = JSON.parse(storedUser);
      payload.user_id = userData.id;
      console.log(`[API v2] Including user_id in request: ${userData.id} (${userData.username})`);
    }
  } catch (error) {
    console.warn('[API v2] Could not get user_id from localStorage:', error);
  }
  
  // Add GPS coordinates if provided
  if (options.latitude !== undefined && options.longitude !== undefined) {
    payload.latitude = options.latitude;
    payload.longitude = options.longitude;
  }
  
  // SPLIT APPROACH: For bot room, send directly to N8N in parallel with backend storage
  if (roomId === 'bot_room') {
    // Send to N8N directly for instant AI processing (fire-and-forget)
    try {
      const n8nPayload = {
        room_id: roomId,
        user: {
          id: userData.id || '1',
          first_name: userData.first_name || 'Unknown',
          last_name: userData.last_name || 'User',
          email: userData.email || 'unknown@example.com'
        },
        message: {
          text: messageText,
          latitude: options.latitude || null,
          longitude: options.longitude || null
        }
      };
      
      // Direct N8N webhook (parallel, don't wait)
      // Simplified payload for Postgres chat memory node compatibility
      const simplifiedPayload = {
        text: messageText,
        user_id: userData.id || '1',
        user_name: `${userData.first_name || 'Unknown'} ${userData.last_name || 'User'}`,
        room_id: roomId,
        latitude: options.latitude || null,
        longitude: options.longitude || null,
        webhook_url: 'https://redis-guideops-chat-production.up.railway.app/v2/bot/webhook'  // For N8N to post back
      };
      
      fetch('https://n8n-aurora-ai.com/webhook/stream/query-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'User-Agent': 'GuideOps-Chat-Frontend/1.0'
        },
        body: JSON.stringify(simplifiedPayload)
      }).then(() => {
        console.log('[N8N] Direct webhook sent for instant AI processing ⚡');
      }).catch(err => {
        console.warn('[N8N] Direct webhook failed:', err);
      });
      
    } catch (e) {
      console.warn('[N8N] Failed to prepare direct webhook:', e);
    }
  }
  
  // Always store in backend (parallel to N8N for bot room)
  return axios.post(url(`/v2/rooms/${roomId}/messages`), payload, { withCredentials: true })
    .then(response => {
      const messageId = response.data?.message?.id;
      console.log(`[API v2] Message sent to room ${roomId}${options.latitude ? ' with location' : ''}:`, messageId);
      return response.data.message; // Extract the message from the API response
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
