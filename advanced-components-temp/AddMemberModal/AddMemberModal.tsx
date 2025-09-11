import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Avatar, useChatContext, useChannelStateContext } from 'stream-chat-react';
import type { UserResponse } from 'stream-chat';
import _debounce from 'lodash.debounce';

import { SearchIcon } from '../../assets';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddMemberModal: React.FC<AddMemberModalProps> = ({ isOpen, onClose }) => {
  const { client } = useChatContext();
  const { channel } = useChannelStateContext();
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  
  // Use ref to avoid recreating the debounced function
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Get current channel members to exclude them from search (memoized to prevent recreations)
  const channelMembers = useMemo(() => 
    Object.keys(channel?.state?.members || {}), 
    [channel?.state?.members]
  );

  const searchUsers = useCallback(async (query: string) => {
    if (!client || !query.trim()) {
      return; // Don't clear users, let the effect handle it
    }

    // Clear any existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    setLoading(true);
    try {
      console.log('🔍 Searching for users with query:', query);
      
      const response = await client.queryUsers(
        {
          name: { $autocomplete: query }
          // Note: $nin is not supported, so we'll filter out members in JavaScript
        },
        { id: 1 },
        { limit: 10 }
      );
      
      // Filter out only current user, keep all others (including channel members), then sort alphabetically
      const filteredUsers = response.users
        .filter(user => user.id !== client.userID)
        .sort((a, b) => {
          const nameA = (a.name || a.id).toLowerCase();
          const nameB = (b.name || b.id).toLowerCase();
          return nameA.localeCompare(nameB);
        });
      console.log('✅ Found users:', filteredUsers.length);
      setUsers(filteredUsers);
    } catch (error) {
      console.error('❌ Error searching users:', error);
      setUsers([]);
      // Show user-friendly error message for rate limiting
      if (error && typeof error === 'object' && 'code' in error && error.code === 9) {
        console.warn('⚠️ Rate limit hit, please wait a moment before searching again');
      }
    } finally {
      setLoading(false);
    }
  }, [client, channelMembers]);

  // Create stable debounced search function
  const debouncedSearch = useMemo(
    () => _debounce(searchUsers, 500), // Increased debounce time to 500ms
    [searchUsers]
  );

  // Load all users when modal opens
  useEffect(() => {
    const loadInitialUsers = async () => {
      if (!isOpen || !client) return;
      
      setLoading(true);
      try {
        console.log('🔍 Loading all users for member selection...');
        
        const response = await client.queryUsers(
          {}, // No filter - get all users
          { name: 1 }, // Sort by name alphabetically
          { limit: 50 }
        );
        
        // Filter out only current user, keep all others (including channel members), then sort alphabetically
        const filteredUsers = response.users
          .filter(user => user.id !== client.userID)
          .sort((a, b) => {
            const nameA = (a.name || a.id).toLowerCase();
            const nameB = (b.name || b.id).toLowerCase();
            return nameA.localeCompare(nameB);
          });
        
        console.log('✅ Loaded users:', filteredUsers.length);
        setUsers(filteredUsers);
      } catch (error) {
        console.error('❌ Error loading users:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen) {
      loadInitialUsers();
    }
  }, [isOpen, client, channelMembers]);

  // Handle search query changes
  useEffect(() => {
    if (searchQuery.trim()) {
      debouncedSearch(searchQuery);
    } else {
      // When search is cleared, reload all users
      const reloadAllUsers = async () => {
        if (!client) return;
        
        setLoading(true);
        try {
          const response = await client.queryUsers(
            {}, // No filter - get all users
            { name: 1 }, // Sort by name alphabetically
            { limit: 50 }
          );
          
          // Filter out only current user, keep all others (including channel members), then sort alphabetically
          const filteredUsers = response.users
            .filter(user => user.id !== client.userID)
            .sort((a, b) => {
              const nameA = (a.name || a.id).toLowerCase();
              const nameB = (b.name || b.id).toLowerCase();
              return nameA.localeCompare(nameB);
            });
          
          setUsers(filteredUsers);
        } catch (error) {
          console.error('❌ Error reloading users:', error);
          setUsers([]);
        } finally {
          setLoading(false);
        }
      };
      
      reloadAllUsers();
    }

    // Cleanup function
    return () => {
      debouncedSearch.cancel();
    };
  }, [searchQuery, debouncedSearch, client, channelMembers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  const handleUserToggle = (userId: string) => {
    const newSelected = new Set(selectedUsers);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedUsers(newSelected);
  };

  const handleAddMembers = async () => {
    if (!channel || selectedUsers.size === 0) return;

    try {
      await channel.addMembers(Array.from(selectedUsers));
      console.log(`✅ Added ${selectedUsers.size} members to channel`);
      handleClose();
    } catch (error) {
      console.error('Error adding members:', error);
      alert('Failed to add members. Please try again.');
    }
  };

  const handleClose = () => {
    // Cancel any pending searches
    debouncedSearch.cancel();
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Reset all state
    setSelectedUsers(new Set());
    setSearchQuery('');
    setUsers([]);
    setLoading(false);
    
    // Call the parent close handler
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="add-member-modal-overlay" onClick={handleClose}>
      <div className="add-member-modal" onClick={(e) => e.stopPropagation()}>
        <div className="add-member-modal__header">
          <h3>Add Members to #{channel?.data?.name || channel?.id}</h3>
          <button className="add-member-modal__close" onClick={handleClose}>
            ✕
          </button>
        </div>

        <div className="add-member-modal__search">
          <div className="add-member-search__input-wrapper">
            <SearchIcon />
            <input
              type="text"
              placeholder="Search users or scroll to browse all..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="add-member-search__input"
            />
          </div>
        </div>

        <div className="add-member-modal__content">
          {loading && (
            <div className="add-member-modal__loading">
              {searchQuery ? 'Searching users...' : 'Loading users...'}
            </div>
          )}
          
          {!loading && searchQuery && users.length === 0 && (
            <div className="add-member-modal__empty">
              No users found matching "{searchQuery}"
            </div>
          )}

          {!loading && users.length > 0 && (
            <div className="add-member-modal__users">
              {users.map((user) => {
                const isChannelMember = channelMembers.includes(user.id);
                return (
                  <div key={user.id} className={`add-member-user-item ${isChannelMember ? 'is-member' : 'not-member'}`}>
                    <div className="add-member-user-info">
                      <Avatar 
                        image={user.image} 
                        name={user.name || user.id}
                      />
                      <div className="add-member-user-details">
                        <div className="add-member-user-name">
                          {user.name || user.id}
                        </div>
                        <div className="add-member-user-role">
                          {user.role || 'user'}
                          {isChannelMember && <span className="member-badge">• Channel Member</span>}
                        </div>
                      </div>
                    </div>
                    
                    {isChannelMember ? (
                      <div className="member-indicator">
                        <span className="member-status">✓ Member</span>
                      </div>
                    ) : (
                      <input
                        type="checkbox"
                        checked={selectedUsers.has(user.id)}
                        onChange={() => handleUserToggle(user.id)}
                        className="add-member-user-checkbox"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!searchQuery && users.length === 0 && !loading && (
            <div className="add-member-modal__prompt">
              No users available to add to this channel
            </div>
          )}
        </div>

        {selectedUsers.size > 0 && (
          <div className="add-member-modal__footer">
            <button 
              className="add-member-modal__add-btn"
              onClick={handleAddMembers}
            >
              Add {selectedUsers.size} Member{selectedUsers.size > 1 ? 's' : ''}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
