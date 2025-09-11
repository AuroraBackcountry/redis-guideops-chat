import React from 'react';
import clsx from 'clsx';

interface SidebarRedisProps {
  user: any;
  channels: any[];
  activeChannelId: string;
  onChannelSelect: (channelId: string) => void;
  onLogOut: () => void;
}

export const SidebarRedis: React.FC<SidebarRedisProps> = ({
  user,
  channels,
  activeChannelId,
  onChannelSelect,
  onLogOut
}) => {
  return (
    <div className="str-chat__sidebar">
      {/* Header */}
      <div className="str-chat__sidebar-header">
        <h3>GuideOps Chat</h3>
        <div className="user-info">
          <span>{user?.first_name || user?.username}</span>
          <button onClick={onLogOut} className="logout-btn">
            Logout
          </button>
        </div>
      </div>

      {/* Channel List */}
      <div className="str-chat__sidebar-content">
        <div className="channel-list">
          <h4>Channels</h4>
          {channels.map((channel) => (
            <div
              key={channel.id}
              className={clsx('channel-item', {
                'active': channel.id === activeChannelId
              })}
              onClick={() => onChannelSelect(channel.id)}
              style={{
                padding: '10px 15px',
                cursor: 'pointer',
                backgroundColor: channel.id === activeChannelId ? '#e3f2fd' : 'transparent',
                borderLeft: channel.id === activeChannelId ? '3px solid #1976d2' : '3px solid transparent'
              }}
            >
              <div className="channel-name">
                {channel.type === 'dm' ? '💬' : '#'} {channel.name}
              </div>
              {channel.type && (
                <div className="channel-type" style={{ fontSize: '12px', color: '#666' }}>
                  {channel.type === 'dm' ? 'Direct Message' : channel.type}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Channel Button */}
        <div className="add-channel" style={{ padding: '15px' }}>
          <button 
            className="btn btn-primary btn-sm"
            onClick={() => {
              const name = prompt('Enter channel name:');
              if (name) {
                createChannel(name);
              }
            }}
          >
            + Create Channel
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper function to create a channel
const createChannel = async (name: string) => {
  try {
    const response = await fetch('/api/channels', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'credentials': 'include'
      },
      body: JSON.stringify({
        name: name,
        type: 'public',
        description: `Channel created for ${name}`
      })
    });
    
    if (response.ok) {
      const channel = await response.json();
      console.log('✅ Channel created:', channel);
      // Reload the page to see the new channel
      window.location.reload();
    } else {
      console.error('❌ Failed to create channel');
      alert('Failed to create channel. Please try again.');
    }
  } catch (error) {
    console.error('❌ Channel creation error:', error);
    alert('Failed to create channel. Please try again.');
  }
};
