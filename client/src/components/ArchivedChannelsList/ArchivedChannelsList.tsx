import React, { useState, useEffect, useCallback } from 'react';
import { useChatContext } from 'stream-chat-react';
import type { Channel } from 'stream-chat';

interface ArchivedChannelsListProps {
  onClose?: () => void;
}

export const ArchivedChannelsList: React.FC<ArchivedChannelsListProps> = ({ onClose }) => {
  const { client } = useChatContext();
  const [archivedChannels, setArchivedChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(false);

  // Load archived channels when component mounts
  useEffect(() => {
    const loadChannels = async () => {
      if (!client) {
        console.log('❌ No client available for loading archived channels');
        return;
      }
      
      setLoading(true);
      try {
        console.log('🔍 Loading archived channels via backend...');
        console.log('👤 Client user:', client.user?.name, 'Role:', client.user?.role);
        
        // Query for disabled channels using Stream's native properties
        console.log('🔍 Querying disabled (archived) channels...');
        const disabledChannels = await client.queryChannels(
          { 
            type: 'team',
            disabled: true
          },
          { updated_at: -1 },
          { limit: 50 }
        );
        
        console.log('📦 Found disabled channels:', disabledChannels.length);
        disabledChannels.forEach(ch => {
          console.log(`  - ${ch.id} (${ch.data?.name || 'No name'}) disabled: ${ch.data?.disabled}`);
        });
        
        setArchivedChannels(disabledChannels);
      } catch (error) {
        console.error('❌ Error loading archived channels via backend:', error);
        setArchivedChannels([]);
      } finally {
        setLoading(false);
      }
    };

    loadChannels();
  }, [client]);

  const loadArchivedChannels = useCallback(async () => {
    if (!client) return;
    
    setLoading(true);
    try {
      console.log('🔄 Refreshing disabled (archived) channels...');
      
      // Query for disabled channels using Stream's native properties
      const disabledChannels = await client.queryChannels(
        { 
          type: 'team',
          disabled: true
        },
        { updated_at: -1 },
        { limit: 50 }
      );
      
      console.log('📦 Refreshed disabled channels:', disabledChannels.length);
      disabledChannels.forEach(ch => {
        console.log(`  - ${ch.id} (${ch.data?.name || 'No name'}) disabled: ${ch.data?.disabled}`);
      });
      
      setArchivedChannels(disabledChannels);
    } catch (error) {
      console.error('❌ Error refreshing archived channels:', error);
      setArchivedChannels([]);
    } finally {
      setLoading(false);
    }
  }, [client]);

  const handleUnarchiveChannel = async (channel: Channel) => {
    // eslint-disable-next-line no-restricted-globals
    if (window.confirm(`📤 Are you sure you want to unarchive "${channel.data?.name || channel.id}"? It will be restored to your channel list.`)) {
      try {
        console.log('📤 Unarchiving channel using native Stream properties...');
        
        // Get the actual channel instance from the client
        const clientChannel = client.channel(channel.type || 'team', channel.id || '');
        
        // First watch the channel to initialize it
        await clientChannel.watch();
        
        // Re-enable the channel (remove disabled status)
        await clientChannel.update({
          disabled: false
        }, { 
          text: `Channel unarchived by ${client.user?.name || client.userID}` 
        });
        
        // Show the channel again in user's channel list
        await clientChannel.show();
        
        console.log('✅ Channel unarchived using native properties');
        alert('Channel unarchived successfully');
        
        // Refresh the archived channels list
        loadArchivedChannels();
      } catch (error) {
        console.error('❌ Failed to unarchive channel:', error);
        alert('Failed to unarchive channel. You may not have permission.');
      }
    }
  };

  const handleDeleteArchivedChannel = async (channel: Channel) => {
    // eslint-disable-next-line no-restricted-globals
    if (window.confirm(`🗑️ Are you sure you want to permanently delete archived channel "${channel.data?.name || channel.id}"? This action cannot be undone!`)) {
      try {
        await channel.delete();
        alert('Archived channel deleted permanently');
        
        // Refresh the archived channels list
        loadArchivedChannels();
      } catch (error) {
        console.error('❌ Failed to delete archived channel:', error);
        alert('Failed to delete archived channel.');
      }
    }
  };

  const isAdmin = client.user?.role === 'admin' || client.user?.role === 'channel_moderator';

  // Debug: Log when component renders
  console.log('🎬 ArchivedChannelsList component rendered');
  console.log('👤 User role:', client.user?.role);
  console.log('🔑 Is admin:', isAdmin);

  if (!isAdmin) {
    console.log('❌ User is not admin, showing unauthorized message');
    return (
      <div className="archived-channels-unauthorized">
        <p>⚠️ Admin access required to view archived channels</p>
      </div>
    );
  }

  console.log('🎨 Rendering ArchivedChannelsList UI');
  console.log('📊 Current state - loading:', loading, 'channels:', archivedChannels.length);

  return (
    <div className="archived-channels-container">
      <div className="archived-channels-header">
        <h3>📦 Archived Channels</h3>
        <button 
          className="refresh-archived-btn"
          onClick={loadArchivedChannels}
          disabled={loading}
        >
          🔄 Refresh
        </button>
        {onClose && (
          <button className="archived-channels-close" onClick={onClose}>✕</button>
        )}
      </div>

      <div className="archived-channels-content">
        {loading && (
          <div className="archived-channels-loading">
            <div className="loading-spinner">⏳</div>
            Loading archived channels...
          </div>
        )}

        {!loading && archivedChannels.length === 0 && (
          <div className="archived-channels-empty">
            📭 No archived channels found
          </div>
        )}

        {!loading && archivedChannels.length > 0 && (
          <div className="archived-channels-list">
            {archivedChannels.map((channel) => {
              const updatedAt = channel.data?.updated_at ? new Date(channel.data.updated_at).toLocaleDateString() : 'Unknown';
              const createdBy = channel.data?.created_by?.name || 'Unknown';
              
              return (
                <div key={channel.id} className="archived-channel-item">
                  <div className="archived-channel-info">
                    <div className="archived-channel-name">
                      📦 {channel.data?.name || channel.id}
                    </div>
                    <div className="archived-channel-meta">
                      Disabled on {updatedAt} • Created by {createdBy}
                    </div>
                    <div className="archived-channel-id">
                      ID: {channel.id}
                    </div>
                  </div>
                  
                  <div className="archived-channel-actions">
                    <button 
                      className="archived-action-btn unarchive"
                      onClick={() => handleUnarchiveChannel(channel)}
                      title="Restore this channel"
                    >
                      📤 Unarchive
                    </button>
                    <button 
                      className="archived-action-btn delete"
                      onClick={() => handleDeleteArchivedChannel(channel)}
                      title="Permanently delete this archived channel"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="archived-channels-footer">
        <div className="archived-channels-stats">
          {archivedChannels.length} archived channel{archivedChannels.length !== 1 ? 's' : ''}
        </div>
        <div className="archived-channels-help">
          💡 Tip: Unarchived channels will reappear in your channel list
        </div>
      </div>
    </div>
  );
};
