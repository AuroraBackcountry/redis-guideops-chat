/**
 * Redis-based Stream Chat compatibility hooks
 * Drop-in replacements for Stream Chat React hooks
 */

import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import io from 'socket.io-client';

// ============================================================================
// CONTEXTS (Stream Chat Compatibility)
// ============================================================================

export const RedisChatContext = createContext({
  client: null,
  user: null,
  isConnected: false,
  channels: {},
  activeChannel: null,
  messages: {},
  onlineUsers: {},
  connectionStatus: 'disconnected'
});

export const RedisChannelContext = createContext({
  channel: null,
  messages: [],
  members: [],
  typing: {},
  loading: false,
  error: null
});

export const RedisMessageContext = createContext({
  message: null,
  channel: null,
  user: null,
  isMyMessage: false,
  groupStyles: ['single']
});

export const RedisMessageInputContext = createContext({
  sendMessage: () => {},
  uploadFile: () => {},
  handleSubmit: () => {},
  isUploading: false
});

// ============================================================================
// MAIN CHAT HOOK (replaces useChatContext)
// ============================================================================

export const useRedisChat = () => {
  const [state, setState] = useState({
    client: null,
    user: null,
    isConnected: false,
    channels: {},
    activeChannel: null,
    messages: {},
    onlineUsers: {},
    connectionStatus: 'disconnected'
  });

  const socket = useRef(null);
  const eventSource = useRef(null);

  // Initialize Redis client (mimics Stream Chat client)
  const initializeClient = useCallback(async (user) => {
    try {
      // Create mock client that matches Stream Chat API
      const redisClient = {
        userID: user.id,
        user: user,
        
        // Mock Stream Chat client methods
        updateMessage: async (message) => {
          const response = await fetch(`/api/messages/${message.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(message)
          });
          return response.json();
        },
        
        deleteMessage: async (messageId) => {
          const response = await fetch(`/api/messages/${messageId}`, {
            method: 'DELETE'
          });
          return response.json();
        },

        // Add user to channel
        addMembers: async (channelId, userIds) => {
          const response = await fetch(`/api/channels/${channelId}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds })
          });
          return response.json();
        }
      };

      // Initialize Socket.IO connection
      if (!socket.current) {
        socket.current = io('/', {
          withCredentials: true,
          transports: ['websocket', 'polling']
        });

        // Socket event handlers
        socket.current.on('connect', () => {
          console.log('✅ Socket.IO connected');
          setState(prev => ({ ...prev, isConnected: true, connectionStatus: 'connected' }));
        });

        socket.current.on('disconnect', () => {
          console.log('❌ Socket.IO disconnected');
          setState(prev => ({ ...prev, isConnected: false, connectionStatus: 'disconnected' }));
        });

        // Message events
        socket.current.on('message', (message) => {
          console.log('📨 New message received:', message);
          setState(prev => ({
            ...prev,
            messages: {
              ...prev.messages,
              [message.roomId]: [
                ...(prev.messages[message.roomId] || []),
                {
                  id: `${message.date}-${message.from}`,
                  text: message.message,
                  user: { id: message.from },
                  created_at: new Date(message.date * 1000).toISOString(),
                  channel_id: message.roomId,
                  type: 'regular'
                }
              ]
            }
          }));
        });

        // User connection events
        socket.current.on('user.connected', (user) => {
          console.log('👤 User connected:', user);
          setState(prev => ({
            ...prev,
            onlineUsers: {
              ...prev.onlineUsers,
              [user.id]: { ...user, online: true }
            }
          }));
        });

        socket.current.on('user.disconnected', (user) => {
          console.log('👤 User disconnected:', user);
          setState(prev => ({
            ...prev,
            onlineUsers: {
              ...prev.onlineUsers,
              [user.id]: { ...user, online: false }
            }
          }));
        });
      }

      // Set up Server-Sent Events for real-time updates
      if (!eventSource.current) {
        eventSource.current = new EventSource('/stream');
        
        eventSource.current.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📡 SSE Event:', data);
            
            // Handle different event types
            switch (data.type) {
              case 'message':
                // Handle new message
                break;
              case 'user.connected':
              case 'user.disconnected':
                // Handle user status changes
                break;
            }
          } catch (error) {
            console.error('SSE parse error:', error);
          }
        };
      }

      setState(prev => ({
        ...prev,
        client: redisClient,
        user: user,
        connectionStatus: 'connected'
      }));

      return redisClient;

    } catch (error) {
      console.error('Failed to initialize Redis client:', error);
      setState(prev => ({ ...prev, connectionStatus: 'failed' }));
      throw error;
    }
  }, []);

  // Load channels for user
  const loadChannels = useCallback(async (userId) => {
    try {
      const response = await fetch(`/rooms/${userId}`);
      const channels = await response.json();
      
      // Transform to Stream Chat format
      const channelsMap = {};
      channels.forEach(channel => {
        channelsMap[channel.id] = {
          id: channel.id,
          name: channel.names ? channel.names.join(', ') : 'Unnamed Channel',
          type: channel.names && channel.names.length === 2 ? 'messaging' : 'team',
          members: {},
          state: {
            members: {},
            messages: [],
            typing: {},
            read: {}
          }
        };
      });

      setState(prev => ({ ...prev, channels: channelsMap }));
      return channelsMap;
    } catch (error) {
      console.error('Failed to load channels:', error);
      return {};
    }
  }, []);

  // Load messages for a channel
  const loadMessages = useCallback(async (channelId, offset = 0, limit = 50) => {
    try {
      const response = await fetch(`/room/${channelId}/messages?offset=${offset}&size=${limit}`);
      const messages = await response.json();
      
      // Transform to Stream Chat format
      const transformedMessages = messages.map(msg => ({
        id: `${msg.date}-${msg.from}`,
        text: msg.message,
        user: { id: msg.from },
        created_at: new Date(msg.date * 1000).toISOString(),
        channel_id: channelId,
        type: 'regular',
        attachments: [],
        latest_reactions: [],
        reply_count: 0,
        status: 'received'
      }));

      setState(prev => ({
        ...prev,
        messages: {
          ...prev.messages,
          [channelId]: transformedMessages
        }
      }));

      return transformedMessages;
    } catch (error) {
      console.error('Failed to load messages:', error);
      return [];
    }
  }, []);

  // Send message
  const sendMessage = useCallback((channelId, messageText, attachments = []) => {
    if (!socket.current || !state.user) {
      console.error('Cannot send message: not connected or no user');
      return;
    }

    const message = {
      roomId: channelId,
      message: messageText,
      from: state.user.id,
      date: Math.floor(Date.now() / 1000)
    };

    console.log('📤 Sending message:', message);
    socket.current.emit('message', message);
  }, [state.user]);

  // Join channel/room
  const joinChannel = useCallback((channelId) => {
    if (!socket.current) {
      console.error('Cannot join channel: not connected');
      return;
    }

    console.log('🚪 Joining channel:', channelId);
    socket.current.emit('room.join', channelId);
    
    setState(prev => ({ ...prev, activeChannel: channelId }));
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (socket.current) {
        socket.current.disconnect();
        socket.current = null;
      }
      if (eventSource.current) {
        eventSource.current.close();
        eventSource.current = null;
      }
    };
  }, []);

  return {
    ...state,
    initializeClient,
    loadChannels,
    loadMessages,
    sendMessage,
    joinChannel
  };
};

// ============================================================================
// CHANNEL HOOK (replaces useChannelStateContext)
// ============================================================================

export const useRedisChannel = (channelId) => {
  const { channels, messages, loadMessages, user } = useRedisChat();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const channel = channels[channelId] || null;
  const channelMessages = messages[channelId] || [];

  // Load messages when channel changes
  useEffect(() => {
    if (channelId && user) {
      setLoading(true);
      setError(null);
      
      loadMessages(channelId)
        .then(() => setLoading(false))
        .catch(err => {
          setError(err);
          setLoading(false);
        });
    }
  }, [channelId, user, loadMessages]);

  // Mock channel object that matches Stream Chat API
  const mockChannel = channel ? {
    id: channelId,
    type: channel.type,
    name: channel.name,
    state: {
      members: channel.members || {},
      messages: channelMessages,
      typing: {},
      read: {},
      watchers: {}
    },
    
    // Mock methods
    sendMessage: async (message) => {
      console.log('📤 Sending message via Redis channel:', message);
      try {
        const response = await fetch(`/api/channels/${channelId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            text: message.text,
            attachments: message.attachments || []
          })
        });
        const result = await response.json();
        console.log('✅ Message sent:', result);
        return { message: { ...result, id: result.id } };
      } catch (error) {
        console.error('❌ Failed to send message:', error);
        throw error;
      }
    },
    
    keystroke: async (data) => {
      console.log('Typing indicator:', data);
    },
    
    stopTyping: async (data) => {
      console.log('Stop typing:', data);
    }
  } : null;

  return {
    channel: mockChannel,
    messages: channelMessages,
    members: Object.values(channel?.members || {}),
    typing: {},
    loading,
    error
  };
};

// ============================================================================
// MESSAGE INPUT HOOK (replaces useMessageInputContext)
// ============================================================================

export const useRedisMessageInput = (channelId) => {
  const { sendMessage, user } = useRedisChat();
  const [isUploading, setIsUploading] = useState(false);

  const handleSubmit = useCallback((message) => {
    if (!message || !message.text || !message.text.trim()) {
      return;
    }

    console.log('📝 Submitting message:', message);
    sendMessage(channelId, message.text, message.attachments);
  }, [channelId, sendMessage]);

  const uploadFile = useCallback(async (file) => {
    setIsUploading(true);
    try {
      // Mock file upload - replace with actual implementation
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      setIsUploading(false);
      return result;
    } catch (error) {
      console.error('File upload failed:', error);
      setIsUploading(false);
      throw error;
    }
  }, []);

  return {
    handleSubmit,
    sendMessage: (messageText) => sendMessage(channelId, messageText),
    uploadFile,
    isUploading
  };
};

// ============================================================================
// MESSAGE HOOK (replaces useMessageContext)
// ============================================================================

export const useRedisMessage = (message) => {
  const { user } = useRedisChat();
  
  const isMyMessage = message && user && message.user?.id === user.id;
  
  // Mock message actions
  const getMessageActions = useCallback(() => {
    const actions = ['react', 'reply'];
    if (isMyMessage) {
      actions.push('edit', 'delete');
    }
    return actions;
  }, [isMyMessage]);

  const handleAction = useCallback((action, event) => {
    console.log('Message action:', action, message);
    
    switch (action) {
      case 'react':
        // Handle reaction
        break;
      case 'reply':
        // Handle reply
        break;
      case 'edit':
        // Handle edit
        break;
      case 'delete':
        // Handle delete
        break;
    }
  }, [message]);

  const handleRetry = useCallback((msg) => {
    console.log('Retrying message:', msg);
    // Implement retry logic
  }, []);

  return {
    message,
    isMyMessage,
    getMessageActions,
    handleAction,
    handleRetry,
    groupStyles: ['single'], // Simplified for now
    editing: false,
    clearEditingState: () => {},
    initialMessage: false,
    threadList: false,
    onMentionsClickMessage: () => {},
    onMentionsHoverMessage: () => {},
    onUserClick: () => {},
    onUserHover: () => {},
    handleOpenThread: () => {},
    renderText: (text) => text
  };
};

// ============================================================================
// CONTEXT PROVIDERS
// ============================================================================

export const RedisChatProvider = ({ children, user }) => {
  const chatState = useRedisChat();

  // Initialize when user is provided
  useEffect(() => {
    if (user && !chatState.client) {
      chatState.initializeClient(user);
      chatState.loadChannels(user.id);
    }
  }, [user, chatState]);

  return (
    <RedisChatContext.Provider value={chatState}>
      {children}
    </RedisChatContext.Provider>
  );
};

export const RedisChannelProvider = ({ children, channelId }) => {
  const channelState = useRedisChannel(channelId);

  return (
    <RedisChannelContext.Provider value={channelState}>
      {children}
    </RedisChannelContext.Provider>
  );
};

// ============================================================================
// HOOK EXPORTS (Stream Chat Compatibility)
// ============================================================================

export const useChatContext = () => {
  const context = useContext(RedisChatContext);
  if (!context) {
    throw new Error('useChatContext must be used within a RedisChatProvider');
  }
  return context;
};

export const useChannelStateContext = () => {
  const context = useContext(RedisChannelContext);
  if (!context) {
    throw new Error('useChannelStateContext must be used within a RedisChannelProvider');
  }
  return context;
};

export const useMessageInputContext = () => {
  const context = useContext(RedisMessageInputContext);
  if (!context) {
    throw new Error('useMessageInputContext must be used within a RedisMessageInputProvider');
  }
  return context;
};

export const useMessageContext = () => {
  const context = useContext(RedisMessageContext);
  if (!context) {
    throw new Error('useMessageContext must be used within a RedisMessageProvider');
  }
  return context;
};
