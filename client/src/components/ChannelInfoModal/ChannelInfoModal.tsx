import React, { useState } from 'react';
import { useChannelStateContext, useChatContext } from 'stream-chat-react';
import { AddMemberButton } from '../AddMemberButton';
import { AddMemberModal } from '../AddMemberModal';

interface ChannelInfoModalProps {
  onClose: () => void;
}

export const ChannelInfoModal: React.FC<ChannelInfoModalProps> = ({ onClose }) => {
  const { channel } = useChannelStateContext();
  const { client } = useChatContext();
  const [editingName, setEditingName] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);

  if (!channel) return null;

  const isPrivate = channel.data?.private || channel.data?.invite_only;
  const memberCount = Object.keys(channel.state.members || {}).length;
  const isAdmin = client.user?.role === 'admin' || client.user?.role === 'channel_moderator';
  
  // Protect the general channel from editing/deletion
  const isGeneralChannel = channel.id === 'general' && channel.type === 'team';
  const canEditChannel = isAdmin && !isGeneralChannel;
  const canDeleteChannel = isAdmin && !isGeneralChannel;
  const canTogglePrivacy = isAdmin && !isGeneralChannel;
  
  // Check if current user is the channel owner (moderator role indicates ownership)
  const isChannelOwner = channel.state.members[client.userID || '']?.role === 'moderator';
  const canArchiveOrDelete = (isAdmin || isChannelOwner) && !isGeneralChannel;

  const channelMembers = Object.values(channel.state.members || {}).map(member => member.user).filter(Boolean);

  const handleEditChannel = () => {
    setEditingName(true);
    setNewChannelName(channel.data?.name || '');
  };

  const handleSaveChannelName = async () => {
    if (!newChannelName.trim()) return;
    
    try {
      await channel.update({ name: newChannelName }, { text: `Channel name changed to ${newChannelName}` });
      setEditingName(false);
      alert('Channel name updated successfully!');
    } catch (error) {
      console.error('Failed to update channel name:', error);
      alert('Failed to update channel name');
    }
  };

  const handleTogglePrivacy = async () => {
    try {
      const newPrivacyState = !isPrivate;
      const currentName = channel.data?.name;
      
      console.log('🔄 Toggling privacy...');
      console.log('📝 Current channel name:', currentName);
      console.log('🔒 Current privacy state:', isPrivate);
      console.log('🔄 New privacy state:', newPrivacyState);
      
      // Try to update via backend server first (more likely to have proper permissions)
      try {
        const response = await fetch('http://localhost:3001/update-channel-privacy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: channel.id,
            channelType: channel.type,
            private: newPrivacyState,
            invite_only: newPrivacyState,
            preserveName: currentName, // Ensure name is preserved
          }),
        });
        
        if (response.ok) {
          console.log('✅ Privacy updated via backend');
          alert(`Channel is now ${newPrivacyState ? 'private' : 'public'}`);
          return;
        }
      } catch (backendError) {
        console.log('Backend update failed, trying client-side update...');
      }
      
      // Follow existing codebase pattern: ONLY update privacy properties
      const updateData: any = {};
      
      if (newPrivacyState) {
        updateData.private = true;
        updateData.invite_only = true;
      } else {
        updateData.private = false;
        updateData.invite_only = false;
      }
      
      // DO NOT include name - following working pattern from AdminPanelFormContext
      console.log('📝 Privacy-only update data:', updateData);
      
      await channel.update(updateData, { 
        text: `Channel is now ${newPrivacyState ? 'private' : 'public'}` 
      });
      
      console.log('✅ Privacy updated, name should be preserved');
      alert(`Channel is now ${newPrivacyState ? 'private' : 'public'}`);
    } catch (error) {
      console.error('Failed to update channel privacy:', error);
      alert('Failed to update channel privacy. This operation may require additional permissions.');
    }
  };

  const handleArchiveChannel = async () => {
    // eslint-disable-next-line no-restricted-globals
    if (window.confirm(`📦 Are you sure you want to archive "${channel.data?.name || channel.id}"? The channel will be hidden and disabled.`)) {
      try {
        console.log('📦 Archiving channel via backend (server-side disabled change)...');
        
        // Use backend endpoint since disabled changes are server-side only
        const response = await fetch('http://localhost:3001/admin/archive-channel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: channel.id,
            channelType: channel.type,
            userId: client.userID
          })
        });
        
        if (!response.ok) {
          throw new Error(`Backend request failed: ${response.status}`);
        }
        
        const result = await response.json();
        if (result.success) {
          // Hide the channel from user's channel list
          await channel.hide();
          
          console.log('✅ Channel archived via backend');
          alert('Channel archived successfully');
          onClose();
        } else {
          throw new Error(result.message || 'Unknown error');
        }
      } catch (error) {
        console.error('Failed to archive channel:', error);
        alert('Failed to archive channel. You may not have permission.');
      }
    }
  };

  const handleDeleteChannel = async () => {
    // eslint-disable-next-line no-restricted-globals
    if (window.confirm(`🗑️ Are you sure you want to permanently delete "${channel.data?.name || channel.id}"? This action cannot be undone!`)) {
      try {
        await channel.delete();
        alert('Channel deleted successfully');
        onClose();
      } catch (error) {
        console.error('Failed to delete channel:', error);
        alert('Failed to delete channel. You may not have permission.');
      }
    }
  };

  return (
    <div className='channel-info-modal__backdrop' onClick={onClose}>
      <div className='channel-info-modal' onClick={(e) => e.stopPropagation()}>
        <div className='channel-info-modal__header'>
          <div className='channel-info-modal__title'>
            <span className='channel-icon'>{isPrivate ? '🔒' : '#'}</span>
            <h3>{channel.data?.name || channel.id}</h3>
            {canTogglePrivacy && (
              <div className='privacy-toggle-wrapper'>
                <span className='privacy-toggle-label'>Private</span>
                <label className='privacy-toggle-switch'>
                  <input
                    type='checkbox'
                    checked={isPrivate}
                    onChange={handleTogglePrivacy}
                    className='privacy-toggle-input'
                  />
                  <span className='privacy-toggle-slider'></span>
                </label>
              </div>
            )}
            <AddMemberButton
              variant="text"
              size="small"
              onClick={() => setShowAddMemberModal(true)}
              className="channel-info-add-member"
            />
          </div>
          <button className='channel-info-modal__close' onClick={onClose}>✕</button>
        </div>

        <div className='channel-info-modal__content'>
          <div className='channel-info-section'>
            <h4>📋 Channel Information</h4>
            <div className='channel-info-item'>
              <strong>Type:</strong> {channel.type}
            </div>
            <div className='channel-info-item'>
              <strong>Name:</strong> 
              {editingName ? (
                <div className='edit-name-controls'>
                  <input 
                    type='text'
                    value={newChannelName}
                    onChange={(e) => setNewChannelName(e.target.value)}
                    className='edit-name-input'
                    placeholder='Channel name'
                  />
                  <button onClick={handleSaveChannelName} className='save-btn'>💾</button>
                  <button onClick={() => setEditingName(false)} className='cancel-btn'>❌</button>
                </div>
              ) : (
                <div className='channel-name-display'>
                  <span>
                    {channel.data?.name || 'Unnamed'}
                    {isGeneralChannel && <span className='protected-badge'>🛡️ Protected</span>}
                  </span>
                  {canEditChannel && (
                    <button 
                      className='edit-name-btn'
                      onClick={handleEditChannel}
                      title='Edit channel name'
                    >
                      ✏️ Edit
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className='channel-info-item'>
              <strong>Channel ID:</strong> {channel.id}
            </div>
            <div className='channel-info-item'>
              <strong>Created:</strong> {channel.data?.created_at ? new Date(channel.data.created_at).toLocaleDateString() : 'Unknown'}
            </div>
            <div className='channel-info-item'>
              <strong>Members:</strong> {memberCount}
            </div>
          </div>

          <div className='channel-info-section'>
            <h4>👥 Channel Members ({memberCount})</h4>
            <div className='channel-members-list'>
              {channelMembers.map((user) => (
                <div key={user?.id} className='channel-member-item'>
                  <img 
                    src={user?.image || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.id}`}
                    alt={user?.name || user?.id}
                    className='channel-member-avatar'
                  />
                  <div className='channel-member-info'>
                    <div className='channel-member-name'>{user?.name || user?.id}</div>
                    <div className='channel-member-role'>
                      {channel.state.members[user?.id || '']?.role === 'moderator' ? '👑 Moderator' : '👤 Member'}
                      {user?.id === client.userID && ' (You)'}
                    </div>
                  </div>
                  <div className='channel-member-actions'>
                    <span className='channel-member-status'>
                      {user?.online ? '🟢' : '⚪'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {isGeneralChannel ? (
            <div className='general-protection-note'>
              🛡️ The general channel is protected and cannot be edited or deleted
            </div>
          ) : (
            canArchiveOrDelete && (
              <div className='channel-danger-actions'>
                <button 
                  className='danger-action-btn archive'
                  onClick={handleArchiveChannel}
                  title='Archive this channel (can be restored later)'
                >
                  📦 Archive
                </button>
                <button 
                  className='danger-action-btn delete'
                  onClick={handleDeleteChannel}
                  title='Permanently delete this channel'
                >
                  🗑️ Delete
                </button>
              </div>
            )
          )}
        </div>
      </div>
      
      {showAddMemberModal && (
        <AddMemberModal 
          isOpen={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)} 
        />
      )}
    </div>
  );
};
