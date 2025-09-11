import React, { useState } from 'react';
import { useChatContext } from 'stream-chat-react';

interface AdminInfoPanelProps {
  onClose: () => void;
}

export const AdminInfoPanel: React.FC<AdminInfoPanelProps> = ({ onClose }) => {
  const { client } = useChatContext();
  const [activeTab, setActiveTab] = useState<'settings' | 'policies' | 'users' | 'system'>('settings');

  const handleLogout = async () => {
    // eslint-disable-next-line no-restricted-globals
    if (window.confirm('Are you sure you want to logout?')) {
      await client.disconnectUser();
      window.location.reload();
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'settings':
        return (
          <div className='admin-info-section'>
            <h4>⚙️ Application Settings</h4>
            <div className='admin-info-item'>
              <strong>App Name:</strong> GuideOps
            </div>
            <div className='admin-info-item'>
              <strong>Current User:</strong> {client.user?.name || client.userID} ({client.user?.role || 'user'})
            </div>
            <div className='admin-info-item'>
              <strong>Connection Status:</strong> {client.wsConnection?.isDisconnected ? '🔴 Disconnected' : '🟢 Connected'}
            </div>
            <div className='admin-info-item'>
              <strong>Stream App ID:</strong> {client.key}
            </div>
            <div className='admin-info-actions'>
              <button className='admin-action-btn logout' onClick={handleLogout}>
                🚪 Logout
              </button>
            </div>
          </div>
        );
        
      case 'policies':
        return (
          <div className='admin-info-section'>
            <h4>📋 Channel Policies</h4>
            <div className='policy-item'>
              <strong>Public Channels:</strong> Anyone can create and join
            </div>
            <div className='policy-item'>
              <strong>Private Channels:</strong> Admin-only creation, invite-only access
            </div>
            <div className='policy-item'>
              <strong>File Uploads:</strong> Web-compatible formats only (JPEG, PNG, GIF, PDF, etc.)
            </div>
            <div className='policy-item'>
              <strong>User Roles:</strong> Admin, User
            </div>
            <div className='policy-item'>
              <strong>Moderation:</strong> Admins can mute, ban, and manage users
            </div>
          </div>
        );
        
      case 'users':
        return (
          <div className='admin-info-section'>
            <h4>👥 User Management</h4>
            <div className='admin-info-item'>
              <strong>Total Users:</strong> {Object.keys(client.state.users || {}).length}
            </div>
            <div className='admin-info-item'>
              <strong>Online Users:</strong> {Object.values(client.state.users || {}).filter(u => u.online).length}
            </div>
            <div className='admin-info-actions'>
              <button 
                className='admin-action-btn'
                onClick={() => {
                  // This would open the full admin panel
                  onClose();
                  // You could trigger workspace change here if needed
                }}
              >
                👥 Manage Users
              </button>
            </div>
          </div>
        );
        
      case 'system':
        return (
          <div className='admin-info-section'>
            <h4>🖥️ System Information</h4>
            <div className='admin-info-item'>
              <strong>Environment:</strong> Development
            </div>
            <div className='admin-info-item'>
              <strong>Version:</strong> GuideOps v1.0.0
            </div>
            <div className='admin-info-item'>
              <strong>Stream SDK:</strong> React v13.5.1
            </div>
            <div className='admin-info-item'>
              <strong>Last Updated:</strong> {new Date().toLocaleDateString()}
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className='admin-info-modal__backdrop' onClick={onClose}>
      <div className='admin-info-modal' onClick={(e) => e.stopPropagation()}>
        <div className='admin-info-modal__header'>
          <h3>⚙️ Admin Panel</h3>
          <button className='admin-info-modal__close' onClick={onClose}>✕</button>
        </div>

        <div className='admin-info-modal__tabs'>
          <button 
            className={`admin-info-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            ⚙️ Settings
          </button>
          <button 
            className={`admin-info-tab ${activeTab === 'policies' ? 'active' : ''}`}
            onClick={() => setActiveTab('policies')}
          >
            📋 Policies
          </button>
          <button 
            className={`admin-info-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👥 Users
          </button>
          <button 
            className={`admin-info-tab ${activeTab === 'system' ? 'active' : ''}`}
            onClick={() => setActiveTab('system')}
          >
            🖥️ System
          </button>
        </div>

        <div className='admin-info-modal__content'>
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};
