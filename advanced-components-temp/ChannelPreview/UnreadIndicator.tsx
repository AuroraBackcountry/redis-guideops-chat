import React from 'react';
import { ChannelPreviewUIComponentProps, useChatContext } from 'stream-chat-react';

interface UnreadIndicatorProps {
  channel?: ChannelPreviewUIComponentProps['channel'];
}

export const UnreadIndicator: React.FC<UnreadIndicatorProps> = ({ channel }) => {
  const { client } = useChatContext();

  const unreadCount = React.useMemo(() => {
    if (!channel || !client?.userID) return 0;

    // Method 1: Use the countUnread() method if available
    if (typeof (channel as any).countUnread === 'function') {
      try {
        return (channel as any).countUnread();
      } catch (e) {
        console.warn('Error calling countUnread:', e);
      }
    }

    // Method 2: Calculate from read state and messages
    if (channel.state?.read && channel.state?.messages) {
      const userRead = channel.state.read[client.userID];
      if (userRead?.last_read) {
        const lastReadDate = new Date(userRead.last_read);
        const unreadMessages = channel.state.messages.filter(
          (msg) => {
            if (!msg.created_at || msg.user?.id === client.userID) return false;
            return new Date(msg.created_at) > lastReadDate;
          }
        );
        return unreadMessages.length;
      }
    }

    // Method 3: Check if channel has any unread count property
    const state = channel.state as any;
    if (state?.unreadCount !== undefined) {
      return state.unreadCount;
    }

    return 0;
  }, [channel, client?.userID]);

  if (!channel || unreadCount === 0) {
    return null;
  }

  return (
    <div className="unread-indicator">
      <span className="unread-count" title={`${unreadCount} unread messages`}>
        {unreadCount > 99 ? '99+' : unreadCount}
      </span>
    </div>
  );
};
