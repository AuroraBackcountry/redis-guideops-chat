import React, { useState, useRef, useEffect } from 'react';
import { Avatar, useChatContext } from 'stream-chat-react';

interface UserProfileMenuProps {
  onLogout: () => void;
}

export const UserProfileMenu: React.FC<UserProfileMenuProps> = ({ onLogout }) => {
  const { client } = useChatContext();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu on escape key
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => document.removeEventListener('keydown', handleEscapeKey);
  }, []);

  const handleLogoutClick = () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      setIsMenuOpen(false);
      onLogout();
    }
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  if (!client?.user) {
    return null;
  }

  const user = client.user;
  const displayName = user.name || user.id || 'User';
  const userRole = user.role || 'user';

  return (
    <div className="user-profile-menu" ref={menuRef}>
      <button 
        className="user-profile-menu__trigger"
        onClick={toggleMenu}
        aria-expanded={isMenuOpen}
        aria-haspopup="true"
        title={`${displayName} - Click for profile options`}
      >
        <div className="user-profile-menu__avatar">
          <Avatar
            image={user.image}
            name={displayName}
          />
        </div>
        <div className="user-profile-menu__info">
          <div className="user-profile-menu__name">{displayName}</div>
          <div className="user-profile-menu__status">
            <span className="user-profile-menu__status-indicator" />
            Online
          </div>
        </div>
        <div className="user-profile-menu__chevron">
          <svg 
            width="12" 
            height="12" 
            viewBox="0 0 12 12" 
            fill="currentColor"
            className={isMenuOpen ? 'rotated' : ''}
          >
            <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </button>

      {isMenuOpen && (
        <div className="user-profile-menu__dropdown">
          <div className="user-profile-menu__dropdown-header">
            <div className="user-profile-menu__dropdown-avatar">
              <Avatar
                image={user.image}
                name={displayName}
              />
            </div>
            <div className="user-profile-menu__dropdown-info">
              <div className="user-profile-menu__dropdown-name">{displayName}</div>
              <div className="user-profile-menu__dropdown-role">
                {userRole === 'admin' && '👑 Admin'}
                {userRole === 'channel_moderator' && '🛡️ Moderator'}
                {userRole === 'user' && '👤 User'}
              </div>
              {(user as any).email && (
                <div className="user-profile-menu__dropdown-email">{(user as any).email}</div>
              )}
            </div>
          </div>

          <div className="user-profile-menu__dropdown-divider" />

          <div className="user-profile-menu__dropdown-actions">
            <button 
              className="user-profile-menu__dropdown-action"
              onClick={() => {
                setIsMenuOpen(false);
                // TODO: Implement profile editing
                alert('Profile editing coming soon!');
              }}
            >
              <span className="user-profile-menu__dropdown-action-icon">👤</span>
              Edit Profile
            </button>
            
            <button 
              className="user-profile-menu__dropdown-action"
              onClick={() => {
                setIsMenuOpen(false);
                // TODO: Implement preferences
                alert('Preferences coming soon!');
              }}
            >
              <span className="user-profile-menu__dropdown-action-icon">⚙️</span>
              Preferences
            </button>

            <div className="user-profile-menu__dropdown-divider" />

            <button 
              className="user-profile-menu__dropdown-action logout-action"
              onClick={handleLogoutClick}
            >
              <span className="user-profile-menu__dropdown-action-icon">🚪</span>
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
