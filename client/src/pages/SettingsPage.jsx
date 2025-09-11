// @ts-check
import React from "react";
import { useNavigate } from "react-router-dom";

/**
 * Settings Page - App settings and preferences
 * Route: /settings
 */
export default function SettingsPage({ user, onLogOut }) {
  const navigate = useNavigate();

  return (
    <div className="settings-page" style={{ 
      flex: 1,
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f8f9fa',
      overflow: 'hidden'
    }}>
      
      {/* Header */}
      <div className="settings-header" style={{
        padding: '16px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #eee',
        flexShrink: 0
      }}>
        <div className="d-flex align-items-center">
          <button 
            className="btn btn-light mr-3"
            onClick={() => navigate('/channels')}
            style={{ border: 'none', padding: '8px' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <h4 className="mb-0">Settings</h4>
        </div>
      </div>

      {/* Settings Content */}
      <div className="settings-content" style={{
        flex: 1,
        overflow: 'auto',
        padding: '16px'
      }}>
        
        {/* Account Section */}
        <div className="settings-section mb-4">
          <h6 className="text-muted mb-3">ACCOUNT</h6>
          <div className="settings-items">
            
            <div className="setting-item d-flex align-items-center justify-content-between" style={{
              padding: '12px 0',
              borderBottom: '1px solid #f0f0f0'
            }}>
              <div>
                <div style={{ fontWeight: '500' }}>Profile</div>
                <small className="text-muted">Manage your profile information</small>
              </div>
              <button 
                className="btn btn-light btn-sm"
                onClick={() => navigate('/profile')}
              >
                Edit
              </button>
            </div>

            <div className="setting-item d-flex align-items-center justify-content-between" style={{
              padding: '12px 0',
              borderBottom: '1px solid #f0f0f0'
            }}>
              <div>
                <div style={{ fontWeight: '500' }}>Notifications</div>
                <small className="text-muted">Push notifications and alerts</small>
              </div>
              <span className="text-muted">Coming Soon</span>
            </div>
          </div>
        </div>

        {/* App Section */}
        <div className="settings-section mb-4">
          <h6 className="text-muted mb-3">APP</h6>
          <div className="settings-items">
            
            <div className="setting-item d-flex align-items-center justify-content-between" style={{
              padding: '12px 0',
              borderBottom: '1px solid #f0f0f0'
            }}>
              <div>
                <div style={{ fontWeight: '500' }}>Theme</div>
                <small className="text-muted">Light mode (Dark mode coming)</small>
              </div>
              <span className="text-muted">Light</span>
            </div>

            <div className="setting-item d-flex align-items-center justify-content-between" style={{
              padding: '12px 0',
              borderBottom: '1px solid #f0f0f0'
            }}>
              <div>
                <div style={{ fontWeight: '500' }}>Install App</div>
                <small className="text-muted">Add GuideOps Chat to home screen</small>
              </div>
              <button 
                className="btn btn-outline-primary btn-sm"
                onClick={() => alert('Add to Home Screen via browser menu')}
              >
                Install
              </button>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="settings-section mb-4">
          <h6 className="text-muted mb-3">ABOUT</h6>
          <div className="settings-items">
            <div className="setting-item" style={{
              padding: '12px 0',
              borderBottom: '1px solid #f0f0f0'
            }}>
              <div style={{ fontWeight: '500' }}>GuideOps Chat</div>
              <small className="text-muted">Version 2.0 - Mobile-First</small>
              <br />
              <small className="text-muted">Team communication for guide professionals</small>
            </div>
          </div>
        </div>

        {/* Logout */}
        <div className="logout-section mt-5">
          <button 
            className="btn btn-outline-danger btn-block"
            onClick={onLogOut}
            style={{ width: '100%' }}
          >
            <svg width="16" height="16" className="mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9"/>
            </svg>
            Log Out
          </button>
        </div>
      </div>
    </div>
  );
}
