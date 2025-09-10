import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Avatar, useChatContext, useChannelStateContext } from 'stream-chat-react';
import type { UserResponse } from 'stream-chat';
import _debounce from 'lodash.debounce';

import { SearchIcon } from '../../assets';
import { UserInfoModal } from '../UserInfoModal/UserInfoModal';

interface AllUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AllUsersModal: React.FC<AllUsersModalProps> = ({ isOpen, onClose }) => {
  const { client } = useChatContext();
  const { channel } = useChannelStateContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<UserResponse[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserInfo, setSelectedUserInfo] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'members' | 'non-members'>('all');

  // Get current channel members
  const channelMembers = useMemo(() => 
    Object.keys(channel?.state?.members || {}), 
    [channel?.state?.members]
  );

  // Load all users
  const loadAllUsers = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    
    try {
      console.log('🔍 Loading all users...');
      const response = await client.queryUsers({}, { id: 1 }, { limit: 100 });
      console.log('✅ Loaded users:', response.users.length);
      setAllUsers(response.users);
    } catch (error) {
      console.error('❌ Failed to load users:', error);
      setAllUsers([]);
    } finally {
      setLoading(false);
    }
  }, [client, loading]);

  // Filter users based on search and view mode
  const filterUsers = useCallback((users: UserResponse[], query: string, mode: string) => {
    let filtered = users;

    // Filter by view mode
    if (mode === 'members') {
      filtered = users.filter(user => channelMembers.includes(user.id));
    } else if (mode === 'non-members') {
      filtered = users.filter(user => !channelMembers.includes(user.id));
    }

    // Filter by search query
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(user => 
        (user.name || '').toLowerCase().includes(lowerQuery) ||
        user.id.toLowerCase().includes(lowerQuery)
      );
    }

    return filtered;
  }, [channelMembers]);

  // Debounced search
  const debouncedFilter = useMemo(
    () => _debounce((users: UserResponse[], query: string, mode: string) => {
      const filtered = filterUsers(users, query, mode);
      setFilteredUsers(filtered);
    }, 300),
    [filterUsers]
  );

  // Load users on mount
  useEffect(() => {
    if (isOpen && allUsers.length === 0) {
      loadAllUsers();
    }
  }, [isOpen, allUsers.length, loadAllUsers]);

  // Update filtered users when search or view mode changes
  useEffect(() => {
    debouncedFilter(allUsers, searchQuery, viewMode);
    return () => debouncedFilter.cancel();
  }, [allUsers, searchQuery, viewMode, debouncedFilter]);

  const handleClose = () => {
    debouncedFilter.cancel();
    setSearchQuery('');
    setSelectedUserInfo(null);
    onClose();
  };

  const handleAddToChannel = async (userId: string, userName: string) => {
    if (!channel) return;
    
    try {
      await channel.addMembers([userId]);
      console.log(`✅ Added ${userName} to channel`);
      alert(`Added ${userName} to channel`);
    } catch (error) {
      console.error('❌ Failed to add user to channel:', error);
      alert('Failed to add user to channel');
    }
  };

  const handleRemoveFromChannel = async (userId: string, userName: string) => {
    if (!channel) return;
    
    // eslint-disable-next-line no-restricted-globals
    if (window.confirm(`Remove ${userName} from this channel?`)) {
      try {
        await channel.removeMembers([userId]);
        console.log(`✅ Removed ${userName} from channel`);
        alert(`Removed ${userName} from channel`);
      } catch (error) {
        console.error('❌ Failed to remove user from channel:', error);
        alert('Failed to remove user from channel');
      }
    }
  };

  const isChannelMember = (userId: string) => channelMembers.includes(userId);
  const isCurrentUser = (userId: string) => userId === client.userID;
  const isAdmin = client.user?.role === 'admin' || client.user?.role === 'channel_moderator';

  const getUserStats = () => {
    const total = allUsers.length;
    const members = allUsers.filter(user => isChannelMember(user.id)).length;
    const nonMembers = total - members;
    return { total, members, nonMembers };
  };

  const stats = getUserStats();

  if (!isOpen) return null;

  return (
    <>
      <div className="all-users-modal-overlay" onClick={handleClose}>
        <div className="all-users-modal" onClick={(e) => e.stopPropagation()}>
          <div className="all-users-modal__header">
            <h3>👥 All Users ({stats.total})</h3>
            <button className="all-users-modal__close" onClick={handleClose}>✕</button>
          </div>

          <div className="all-users-modal__controls">
            <div className="all-users-search">
              <div className="all-users-search__input-wrapper">
                <SearchIcon />
                <input
                  type="text"
                  placeholder="Search users by name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="all-users-search__input"
                />
              </div>
            </div>

            <div className="all-users-filter">
              <button 
                className={`filter-btn ${viewMode === 'all' ? 'active' : ''}`}
                onClick={() => setViewMode('all')}
              >
                All ({stats.total})
              </button>
              <button 
                className={`filter-btn ${viewMode === 'members' ? 'active' : ''}`}
                onClick={() => setViewMode('members')}
              >
                Members ({stats.members})
              </button>
              <button 
                className={`filter-btn ${viewMode === 'non-members' ? 'active' : ''}`}
                onClick={() => setViewMode('non-members')}
              >
                Non-Members ({stats.nonMembers})
              </button>
            </div>
          </div>

          <div className="all-users-modal__content">
            {loading && (
              <div className="all-users-modal__loading">
                <div className="loading-spinner">⏳</div>
                Loading users...
              </div>
            )}

            {!loading && filteredUsers.length === 0 && (
              <div className="all-users-modal__empty">
                {searchQuery ? 
                  `No users found matching "${searchQuery}"` : 
                  'No users found'
                }
              </div>
            )}

            {!loading && filteredUsers.length > 0 && (
              <div className="all-users-list">
                {filteredUsers.map((user) => {
                  const isMember = isChannelMember(user.id);
                  const isMe = isCurrentUser(user.id);
                  
                  return (
                    <div key={user.id} className="all-users-item">
                      <div className="all-users-item__info">
                        <div className="all-users-item__avatar">
                          <Avatar 
                            image={user.image} 
                            name={user.name || user.id}
                          />
                          <div className={`user-status ${user.online ? 'online' : 'offline'}`}>
                            {user.online ? '🟢' : '⚪'}
                          </div>
                        </div>
                        
                        <div className="all-users-item__details">
                          <div className="all-users-item__name">
                            {user.name || user.id}
                            {isMe && ' (You)'}
                          </div>
                          <div className="all-users-item__meta">
                            <span className="user-role">
                              {user.role === 'admin' ? '👑 Admin' : '👤 User'}
                            </span>
                            {isMember && <span className="member-badge">📋 Channel Member</span>}
                          </div>
                          <div className="all-users-item__id">ID: {user.id}</div>
                        </div>
                      </div>

                      <div className="all-users-item__actions">
                        <button 
                          className="action-btn info"
                          onClick={() => setSelectedUserInfo(user.id)}
                          title="View user info"
                        >
                          ℹ️
                        </button>
                        
                        {channel && !isMe && (
                          <>
                            {isMember ? (
                              isAdmin && (
                                <button 
                                  className="action-btn remove"
                                  onClick={() => handleRemoveFromChannel(user.id, user.name || user.id)}
                                  title="Remove from channel"
                                >
                                  ➖
                                </button>
                              )
                            ) : (
                              <button 
                                className="action-btn add"
                                onClick={() => handleAddToChannel(user.id, user.name || user.id)}
                                title="Add to channel"
                              >
                                ➕
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="all-users-modal__footer">
            <div className="all-users-stats">
              Showing {filteredUsers.length} of {stats.total} users
            </div>
            {!loading && allUsers.length < 100 && (
              <button 
                className="refresh-btn"
                onClick={loadAllUsers}
                title="Refresh user list"
              >
                🔄 Refresh
              </button>
            )}
          </div>
        </div>
      </div>

      {selectedUserInfo && (
        <UserInfoModal
          userId={selectedUserInfo}
          onClose={() => setSelectedUserInfo(null)}
        />
      )}
    </>
  );
};

