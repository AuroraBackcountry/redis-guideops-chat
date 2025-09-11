import React, { useState } from 'react';
import { useChannelStateContext } from 'stream-chat-react';

export const ChannelDebugInfo = () => {
  const { channel } = useChannelStateContext();
  const [showDebug, setShowDebug] = useState(false);

  if (!channel) return null;

  const channelData = channel.data;
  const isPrivate = channelData?.private || channelData?.invite_only;

  return (
    <div className='channel-debug-info'>
      <button 
        className='channel-debug-toggle'
        onClick={() => setShowDebug(!showDebug)}
        title='Toggle channel debug info'
      >
        🔍 Debug Channel Info
      </button>
      
      {showDebug && (
        <div className='channel-debug-panel'>
          <h4>🔍 Channel Debug Information</h4>
          <div className='debug-item'>
            <strong>Privacy Status:</strong> 
            <span className={isPrivate ? 'private' : 'public'}>
              {isPrivate ? '🔒 Private' : '📢 Public'}
            </span>
          </div>
          <div className='debug-item'>
            <strong>Channel ID:</strong> {channel.id}
          </div>
          <div className='debug-item'>
            <strong>Channel Type:</strong> {channel.type}
          </div>
          <div className='debug-item'>
            <strong>Private Property:</strong> {String(channelData?.private || false)}
          </div>
          <div className='debug-item'>
            <strong>Invite Only:</strong> {String(channelData?.invite_only || false)}
          </div>
          <div className='debug-item'>
            <strong>Members Count:</strong> {Object.keys(channel.state.members || {}).length}
          </div>
          <div className='debug-item'>
            <strong>Created By Admin:</strong> {String(channelData?.created_by_admin || false)}
          </div>
          <details className='debug-raw-data'>
            <summary>📋 Raw Channel Data</summary>
            <pre>{JSON.stringify(channelData, null, 2)}</pre>
          </details>
        </div>
      )}
    </div>
  );
};
