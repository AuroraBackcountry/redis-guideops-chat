// @ts-check
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

/**
 * Profile Page - User profile management
 * Route: /profile
 */
export default function ProfilePage({ user }) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    first_name: user?.first_name || '',
    last_name: user?.last_name || ''
  });

  const handleSave = async () => {
    // TODO: Implement profile update API call
    alert('Profile updates coming soon!');
    setEditing(false);
  };

  return (
    <div className="profile-page" style={{ 
      flex: 1,
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f8f9fa',
      overflow: 'hidden'
    }}>
      
      {/* Header */}
      <div className="profile-header" style={{
        padding: '16px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #eee',
        flexShrink: 0
      }}>
        <div className="d-flex align-items-center justify-content-between">
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
            <h4 className="mb-0">Profile</h4>
          </div>
          
          {!editing ? (
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => setEditing(true)}
            >
              Edit
            </button>
          ) : (
            <div>
              <button 
                className="btn btn-outline-secondary btn-sm mr-2"
                onClick={() => {
                  setEditing(false);
                  setProfileData({
                    username: user?.username || '',
                    email: user?.email || '',
                    first_name: user?.first_name || '',
                    last_name: user?.last_name || ''
                  });
                }}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary btn-sm"
                onClick={handleSave}
              >
                Save
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Profile Content */}
      <div className="profile-content" style={{
        flex: 1,
        overflow: 'auto',
        padding: '16px'
      }}>
        
        {/* Profile Picture */}
        <div className="profile-picture text-center mb-4" style={{
          padding: '20px'
        }}>
          <div className="avatar-large mx-auto mb-3" style={{
            width: '80px',
            height: '80px',
            backgroundColor: '#007bff',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '24px',
            color: 'white',
            fontWeight: 'bold'
          }}>
            {(user?.first_name?.[0] || user?.username?.[0] || 'U').toUpperCase()}
          </div>
          <h5 className="mb-1">{user?.username || 'User'}</h5>
          <p className="text-muted mb-0">{user?.role || 'Member'}</p>
        </div>

        {/* Profile Fields */}
        <div className="profile-fields">
          
          <div className="field-group mb-3">
            <label className="form-label text-muted">First Name</label>
            {editing ? (
              <input
                type="text"
                className="form-control"
                value={profileData.first_name}
                onChange={(e) => setProfileData({...profileData, first_name: e.target.value})}
              />
            ) : (
              <div className="field-display" style={{
                padding: '8px 12px',
                backgroundColor: '#fff',
                border: '1px solid #e9ecef',
                borderRadius: '4px'
              }}>
                {user?.first_name || 'Not set'}
              </div>
            )}
          </div>

          <div className="field-group mb-3">
            <label className="form-label text-muted">Last Name</label>
            {editing ? (
              <input
                type="text"
                className="form-control"
                value={profileData.last_name}
                onChange={(e) => setProfileData({...profileData, last_name: e.target.value})}
              />
            ) : (
              <div className="field-display" style={{
                padding: '8px 12px',
                backgroundColor: '#fff',
                border: '1px solid #e9ecef',
                borderRadius: '4px'
              }}>
                {user?.last_name || 'Not set'}
              </div>
            )}
          </div>

          <div className="field-group mb-3">
            <label className="form-label text-muted">Email</label>
            {editing ? (
              <input
                type="email"
                className="form-control"
                value={profileData.email}
                onChange={(e) => setProfileData({...profileData, email: e.target.value})}
              />
            ) : (
              <div className="field-display" style={{
                padding: '8px 12px',
                backgroundColor: '#fff',
                border: '1px solid #e9ecef',
                borderRadius: '4px'
              }}>
                {user?.email || 'Not set'}
              </div>
            )}
          </div>

          <div className="field-group mb-3">
            <label className="form-label text-muted">Username</label>
            <div className="field-display" style={{
              padding: '8px 12px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '4px',
              color: '#6c757d'
            }}>
              {user?.username || 'Not set'} <small>(cannot be changed)</small>
            </div>
          </div>

          <div className="field-group mb-3">
            <label className="form-label text-muted">Role</label>
            <div className="field-display" style={{
              padding: '8px 12px',
              backgroundColor: '#f8f9fa',
              border: '1px solid #e9ecef',
              borderRadius: '4px',
              color: '#6c757d'
            }}>
              {user?.role || 'Member'} <small>(set by admin)</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
