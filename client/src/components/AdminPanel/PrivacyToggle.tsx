import React from 'react';
import { useChatContext } from 'stream-chat-react';

interface PrivacyToggleProps {
  isPrivate: boolean;
  onChange: (isPrivate: boolean) => void;
  disabled?: boolean;
}

export const PrivacyToggle: React.FC<PrivacyToggleProps> = ({ isPrivate, onChange, disabled }) => {
  const { client } = useChatContext();
  
  // Check if user has admin permissions
  const isAdmin = client.user?.role === 'admin' || client.user?.role === 'channel_moderator';
  
  if (!isAdmin) {
    return (
      <div className='privacy-toggle disabled'>
        <div className='privacy-toggle__header'>
          <span className='privacy-toggle__label'>🔒 Channel Privacy</span>
          <span className='privacy-toggle__admin-only'>Admin Only</span>
        </div>
        <div className='privacy-toggle__description'>
          <p>Only admins can create private channels. This channel will be public.</p>
        </div>
      </div>
    );
  }

  return (
    <div className='privacy-toggle'>
      <div className='privacy-toggle__header'>
        <span className='privacy-toggle__label'>🔒 Channel Privacy</span>
      </div>
      
      <div className='privacy-toggle__control'>
        <label className='privacy-toggle__switch'>
          <input
            type='checkbox'
            checked={isPrivate}
            onChange={(e) => onChange(e.target.checked)}
            disabled={disabled}
          />
          <span className='privacy-toggle__slider'></span>
        </label>
        
        <div className='privacy-toggle__labels'>
          <span className={`privacy-toggle__option ${!isPrivate ? 'active' : ''}`}>
            📢 Public Channel
          </span>
          <span className={`privacy-toggle__option ${isPrivate ? 'active' : ''}`}>
            🔒 Private Channel
          </span>
        </div>
      </div>
      
      <div className='privacy-toggle__description'>
        {isPrivate ? (
          <p>🔒 Only invited members can see and join this channel</p>
        ) : (
          <p>📢 Anyone in the workspace can see and join this channel</p>
        )}
      </div>
    </div>
  );
};
