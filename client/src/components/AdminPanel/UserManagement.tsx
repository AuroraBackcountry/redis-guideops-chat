import React, { useState, useEffect } from 'react';
import { useChatContext, useChannelStateContext } from 'stream-chat-react';
import type { UserResponse } from 'stream-chat';

export const UserManagement = () => {
  const { client } = useChatContext();
  const { channel } = useChannelStateContext();
  const [channelMembers, setChannelMembers] = useState<UserResponse[]>([]);
  const [allUsers, setAllUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (channel) {
      // Get channel members
      const members = Object.values(channel.state.members).map(member => member.user).filter(Boolean) as UserResponse[];
      setChannelMembers(members);
    }
  }, [channel]);

  const loadAllUsers = async () => {
    setLoading(true);
    try {
      const response = await client.queryUsers({}, { id: 1 }, { limit: 100 });
      setAllUsers(response.users);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMuteUser = async (userId: string) => {
    try {
      await client.muteUser(userId);
      alert(`User ${userId} has been muted`);
    } catch (error) {
      console.error('Failed to mute user:', error);
      alert('Failed to mute user');
    }
  };

  const handleUnmuteUser = async (userId: string) => {
    try {
      await client.unmuteUser(userId);
      alert(`User ${userId} has been unmuted`);
    } catch (error) {
      console.error('Failed to unmute user:', error);
      alert('Failed to unmute user');
    }
  };

  const handleBanUser = async (userId: string) => {
    if (!channel) return;
    
    // eslint-disable-next-line no-restricted-globals
    if (window.confirm(`Are you sure you want to ban user ${userId} from this channel?`)) {
      try {
        await channel.banUser(userId, { reason: 'Admin action' });
        alert(`User ${userId} has been banned from the channel`);
      } catch (error) {
        console.error('Failed to ban user:', error);
        alert('Failed to ban user');
      }
    }
  };

  const handleUnbanUser = async (userId: string) => {
    if (!channel) return;
    
    try {
      await channel.unbanUser(userId);
      alert(`User ${userId} has been unbanned from the channel`);
    } catch (error) {
      console.error('Failed to unban user:', error);
      alert('Failed to unban user');
    }
  };

  const handlePromoteToModerator = async (userId: string) => {
    if (!channel) return;
    
    try {
      await channel.addModerators([userId]);
      alert(`User ${userId} has been promoted to moderator`);
    } catch (error) {
      console.error('Failed to promote user:', error);
      alert('Failed to promote user to moderator');
    }
  };

  const isMuted = (userId: string) => {
    return client.mutedUsers.some(mute => mute.target.id === userId);
  };

  const isModerator = (userId: string) => {
    return channel?.state.members[userId]?.role === 'moderator';
  };

  return (
    <div className='user-management'>
      <div className='user-management__section'>
        <h3>👥 Channel Members ({channelMembers.length})</h3>
        <div className='user-management__list'>
          {channelMembers.map((user) => (
            <div key={user.id} className='user-management__item'>
              <div className='user-management__user-info'>
                <img 
                  src={user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                  alt={user.name || user.id}
                  className='user-management__avatar'
                />
                <div>
                  <div className='user-management__name'>{user.name || user.id}</div>
                  <div className='user-management__role'>
                    {isModerator(user.id) ? '👑 Moderator' : '👤 Member'}
                    {user.id === client.userID && ' (You)'}
                  </div>
                </div>
              </div>
              
              {user.id !== client.userID && (
                <div className='user-management__actions'>
                  {!isModerator(user.id) && (
                    <button 
                      className='user-management__action-btn promote'
                      onClick={() => handlePromoteToModerator(user.id)}
                      title='Promote to Moderator'
                    >
                      👑
                    </button>
                  )}
                  
                  <button 
                    className={`user-management__action-btn ${isMuted(user.id) ? 'unmute' : 'mute'}`}
                    onClick={() => isMuted(user.id) ? handleUnmuteUser(user.id) : handleMuteUser(user.id)}
                    title={isMuted(user.id) ? 'Unmute User' : 'Mute User'}
                  >
                    {isMuted(user.id) ? '🔊' : '🔇'}
                  </button>
                  
                  <button 
                    className='user-management__action-btn ban'
                    onClick={() => handleBanUser(user.id)}
                    title='Ban User from Channel'
                  >
                    🚫
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className='user-management__section'>
        <div className='user-management__load-section'>
          <h3>🌐 All Users</h3>
          <button 
            className='user-management__load-btn'
            onClick={loadAllUsers}
            disabled={loading}
          >
            {loading ? '⏳ Loading...' : '📋 Load All Users'}
          </button>
        </div>
        
        {allUsers.length > 0 && (
          <div className='user-management__list'>
            {allUsers.filter(user => !channelMembers.find(member => member.id === user.id)).map((user) => (
              <div key={user.id} className='user-management__item'>
                <div className='user-management__user-info'>
                  <img 
                    src={user.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} 
                    alt={user.name || user.id}
                    className='user-management__avatar'
                  />
                  <div>
                    <div className='user-management__name'>{user.name || user.id}</div>
                    <div className='user-management__role'>Not in channel</div>
                  </div>
                </div>
                
                <div className='user-management__actions'>
                  <button 
                    className='user-management__action-btn add'
                    onClick={async () => {
                      if (channel) {
                        try {
                          await channel.addMembers([user.id]);
                          alert(`Added ${user.name || user.id} to channel`);
                          // Refresh members list
                          const members = Object.values(channel.state.members).map(member => member.user).filter(Boolean) as UserResponse[];
                          setChannelMembers(members);
                        } catch (error) {
                          console.error('Failed to add user:', error);
                          alert('Failed to add user to channel');
                        }
                      }
                    }}
                    title='Add to Channel'
                  >
                    ➕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
