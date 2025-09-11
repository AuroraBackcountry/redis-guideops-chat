import React, { useEffect, useState } from 'react';
import { 
  RedisChatProvider, 
  RedisChannelProvider, 
  useChatContext, 
  useChannelStateContext 
} from '../../hooks/useRedisChat';

// Import your advanced Stream Chat components
import { TeamMessageRedis } from '../TeamMessage/TeamMessageRedis';
import { TeamMessageInputRedis } from '../TeamMessageInput/TeamMessageInputRedis';
import { SidebarRedis as Sidebar } from '../Sidebar/SidebarRedis';
// import { TeamChannelHeader } from '../TeamChannelHeader';

interface ChatRedisEnhancedProps {
  user: any;
  onLogOut: () => void;
  onMessageSend: (message: string, roomId: string) => void;
}

const ChatContent: React.FC<ChatRedisEnhancedProps> = ({ user, onLogOut, onMessageSend }) => {
  const { channels, activeChannel, loadChannels, joinChannel } = useChatContext();
  const [selectedChannelId, setSelectedChannelId] = useState<string>('0');

  // Load user channels on mount
  useEffect(() => {
    if (user?.id) {
      loadChannels(user.id).then((userChannels) => {
        // Join the general channel by default
        if (userChannels['0']) {
          setSelectedChannelId('0');
          joinChannel('0');
        }
      });
    }
  }, [user, loadChannels, joinChannel]);

  const handleChannelSelect = (channelId: string) => {
    setSelectedChannelId(channelId);
    joinChannel(channelId);
  };

  return (
    <div className="str-chat str-chat-team">
      <div className="str-chat__container">
        {/* Sidebar with channels */}
        <Sidebar
          user={user}
          channels={Object.values(channels)}
          activeChannelId={selectedChannelId}
          onChannelSelect={handleChannelSelect}
          onLogOut={onLogOut}
        />

        {/* Main chat area */}
        <div className="str-chat__main-panel">
          {selectedChannelId ? (
            <RedisChannelProvider channelId={selectedChannelId}>
              <ChannelView 
                channelId={selectedChannelId} 
                user={user}
                onMessageSend={onMessageSend}
              />
            </RedisChannelProvider>
          ) : (
            <div className="str-chat__empty-channel">
              <p>Select a channel to start chatting</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ChannelView: React.FC<{ channelId: string; user: any; onMessageSend: any }> = ({ 
  channelId, 
  user, 
  onMessageSend 
}) => {
  const { channel, messages, loading, error } = useChannelStateContext();

  if (loading) {
    return (
      <div className="str-chat__loading">
        <p>Loading channel...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="str-chat__error">
        <p>Error loading channel: {error.message}</p>
      </div>
    );
  }

  return (
    <>
      {/* Channel Header */}
      <div className="str-chat__header-livestream">
        <div className="str-chat__header-livestream-left">
          <h2>{channel?.name || 'Channel'}</h2>
          <p>{channel?.description || ''}</p>
        </div>
      </div>

      {/* Message List */}
      <div className="str-chat__list">
        <div className="str-chat__list-notifications"></div>
        {messages.map((message, index) => (
          <TeamMessageRedis 
            key={message.id || `${message.created_at}-${index}`}
            message={message}
            channel={channel}
            user={user}
          />
        ))}
      </div>

      {/* Message Input */}
      <TeamMessageInputRedis 
        channelId={channelId}
        user={user}
      />
    </>
  );
};

export const ChatRedisEnhanced: React.FC<ChatRedisEnhancedProps> = (props) => {
  return (
    <RedisChatProvider user={props.user}>
      <ChatContent {...props} />
    </RedisChatProvider>
  );
};
