import React, { useState, useEffect } from 'react';
import { useChatContext, useChannelStateContext } from 'stream-chat-react';
import type { UserResponse } from 'stream-chat';

interface UserInfoModalProps {
  userId: string;
  onClose: () => void;
}

export const UserInfoModal: React.FC<UserInfoModalProps> = ({ userId, onClose }) => {
  const { client } = useChatContext();
  const { channel } = useChannelStateContext();
  const [userInfo, setUserInfo] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const response = await client.queryUsers({ id: userId });
        if (response.users.length > 0) {
          setUserInfo(response.users[0]);
        }
      } catch (error) {
        console.error('Failed to fetch user info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();
  }, [userId, client]);

  if (loading) {
    return (
      <div className='user-info-modal__backdrop' onClick={onClose}>
        <div className='user-info-modal' onClick={(e) => e.stopPropagation()}>
          <div className='user-info-modal__loading'>Loading user info...</div>
        </div>
      </div>
    );
  }

  if (!userInfo) {
    return (
      <div className='user-info-modal__backdrop' onClick={onClose}>
        <div className='user-info-modal' onClick={(e) => e.stopPropagation()}>
          <div className='user-info-modal__error'>User not found</div>
          <button onClick={onClose} className='user-info-modal__close'>Close</button>
        </div>
      </div>
    );
  }

  const isCurrentUser = userInfo.id === client.userID;
  const isAdmin = userInfo.role === 'admin' || userInfo.role === 'channel_moderator';
  const currentUserIsAdmin = client.user?.role === 'admin' || client.user?.role === 'channel_moderator';
  const channelMember = channel?.state.members[userId];

  const handleMuteUser = async () => {
    try {
      await client.muteUser(userId);
      alert(`${userInfo.name || userId} has been muted`);
      onClose();
    } catch (error) {
      console.error('Failed to mute user:', error);
      alert('Failed to mute user');
    }
  };

  const handleBanUser = async () => {
    if (!channel) return;
    
    // eslint-disable-next-line no-restricted-globals
    if (window.confirm(`Ban ${userInfo.name || userId} from this channel?`)) {
      try {
        await channel.banUser(userId, { reason: 'Admin action' });
        alert(`${userInfo.name || userId} has been banned`);
        onClose();
      } catch (error) {
        console.error('Failed to ban user:', error);
        alert('Failed to ban user');
      }
    }
  };

  return (
    <div className='user-info-modal__backdrop' onClick={onClose}>
      <div className='user-info-modal' onClick={(e) => e.stopPropagation()}>
        <div className='user-info-modal__header'>
          <div className='user-info-modal__avatar'>
            <img 
              src={userInfo.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`}
              alt={userInfo.name || userId}
            />
          </div>
          <div className='user-info-modal__basic-info'>
            <h3>{userInfo.name || userId}</h3>
            <p className='user-info-modal__role'>
              {isAdmin ? '👑 Admin' : '👤 User'}
              {isCurrentUser && ' (You)'}
            </p>
          </div>
          <button className='user-info-modal__close-btn' onClick={onClose}>✕</button>
        </div>

        <div className='user-info-modal__details'>
          <div className='user-info-item'>
            <strong>User ID:</strong> {userInfo.id}
          </div>
          <div className='user-info-item'>
            <strong>Role:</strong> {userInfo.role || 'user'}
          </div>
          <div className='user-info-item'>
            <strong>Online:</strong> {userInfo.online ? '🟢 Online' : '⚪ Offline'}
          </div>
          <div className='user-info-item'>
            <strong>Last Active:</strong> {userInfo.last_active ? new Date(userInfo.last_active).toLocaleString() : 'Unknown'}
          </div>
          {channelMember && (
            <>
              <div className='user-info-item'>
                <strong>Channel Role:</strong> {channelMember.role || 'member'}
              </div>
              <div className='user-info-item'>
                <strong>Joined Channel:</strong> {channelMember.created_at ? new Date(channelMember.created_at).toLocaleString() : 'Unknown'}
              </div>
            </>
          )}
        </div>

        {currentUserIsAdmin && !isCurrentUser && (
          <div className='user-info-modal__admin-actions'>
            <h4>🔧 Admin Actions</h4>
            <div className='user-info-modal__actions'>
              <button 
                className='user-info-action-btn mute'
                onClick={handleMuteUser}
              >
                🔇 Mute User
              </button>
              {channel && (
                <button 
                  className='user-info-action-btn ban'
                  onClick={handleBanUser}
                >
                  🚫 Ban from Channel
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
