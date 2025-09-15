// @ts-check
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { url } from '../api';

/**
 * Channel Information Modal
 * Shows channel details, member list, and management options
 */
const ChannelInfoModal = ({ channel, isOpen, onClose, onChannelUpdated }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load channel members when modal opens
  useEffect(() => {
    if (isOpen && channel) {
      loadChannelMembers();
    }
  }, [isOpen, channel]);

  const loadChannelMembers = async () => {
    if (!channel) return;
    
    setLoading(true);
    setError('');
    
    try {
      // TODO: Add API endpoint to get channel members
      // For now, show placeholder data
      setMembers([
        { id: '1', username: 'ben johns', role: 'admin', online: true },
        { id: '2', username: 'will smith', role: 'member', online: false }
      ]);
    } catch (err) {
      setError('Failed to load channel members');
      console.error('Error loading channel members:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleArchiveChannel = async () => {
    if (!channel) return;
    
    const confirmed = window.confirm(
      `Archive "${channel.name}"? This will hide the channel but keep all messages. You can find it again by searching.`
    );
    
    if (confirmed) {
      try {
        const response = await axios.post(url(`/api/channels/${channel.id}/archive`), {}, {
          withCredentials: true
        });
        
        if (response.data.success) {
          alert('Channel archived successfully!');
          onClose();
          if (onChannelUpdated) onChannelUpdated();
          // Redirect to channels page since current channel is now archived
          window.location.href = '/channels';
        }
      } catch (err) {
        alert('Failed to archive channel. Please try again.');
        console.error('Error archiving channel:', err);
      }
    }
  };

  const handleDeleteChannel = async () => {
    if (!channel) return;
    
    const confirmed = window.confirm(
      `⚠️ DELETE "${channel.name}"?\n\nThis will permanently delete:\n• All messages in this channel\n• The channel itself\n• All member data\n\nThis action CANNOT be undone!`
    );
    
    if (confirmed) {
      const channelNameInput = prompt(
        `Type the channel name to confirm deletion:\n\nExpected: "${channel.name}"`
      );
      
      if (channelNameInput === channel.name) {
        try {
          const response = await axios.delete(url(`/api/channels/${channel.id}/delete`), {
            withCredentials: true
          });
          
          if (response.data.success) {
            alert('Channel deleted permanently!');
            onClose();
            if (onChannelUpdated) onChannelUpdated();
            // Redirect to channels page since current channel is deleted
            window.location.href = '/channels';
          }
        } catch (err) {
          alert('Failed to delete channel. Please try again.');
          console.error('Error deleting channel:', err);
        }
      } else if (channelNameInput !== null) {
        alert('Channel name did not match. Deletion cancelled.');
      }
    }
  };

  if (!isOpen || !channel) return null;

  return (
    <div 
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
      onClick={onClose}
    >
      <div 
        className="modal-content"
        style={{
          backgroundColor: '#fff',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '400px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header" style={{ marginBottom: '20px' }}>
          <div className="d-flex align-items-center justify-content-between">
            <h4 className="mb-0">#{channel.name}</h4>
            <button 
              className="btn btn-link p-0"
              onClick={onClose}
              style={{ fontSize: '24px', color: '#6c757d' }}
            >
              ×
            </button>
          </div>
          <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
            Channel Information
          </p>
        </div>

        {/* Channel Details */}
        <div className="channel-details" style={{ marginBottom: '24px' }}>
          <div className="detail-item" style={{ marginBottom: '12px' }}>
            <strong>Channel ID:</strong> {channel.id}
          </div>
          <div className="detail-item" style={{ marginBottom: '12px' }}>
            <strong>Type:</strong> {channel.type || 'Public'}
          </div>
          {channel.description && (
            <div className="detail-item" style={{ marginBottom: '12px' }}>
              <strong>Description:</strong> {channel.description}
            </div>
          )}
        </div>

        {/* Members List */}
        <div className="members-section" style={{ marginBottom: '24px' }}>
          <h6 className="mb-3">Members ({members.length})</h6>
          
          {loading ? (
            <div className="text-center">
              <small className="text-muted">Loading members...</small>
            </div>
          ) : error ? (
            <div className="text-center text-danger">
              <small>{error}</small>
            </div>
          ) : (
            <div className="members-list">
              {members.map(member => (
                <div 
                  key={member.id}
                  className="member-item d-flex align-items-center justify-content-between"
                  style={{ 
                    padding: '8px 0',
                    borderBottom: '1px solid #f8f9fa'
                  }}
                >
                  <div className="d-flex align-items-center">
                    <div 
                      className={`rounded-circle ${member.online ? 'bg-success' : 'bg-secondary'}`}
                      style={{ width: '8px', height: '8px', marginRight: '8px' }}
                    ></div>
                    <span>{member.username}</span>
                    {member.role === 'admin' && (
                      <span className="badge badge-primary ml-2" style={{ fontSize: '10px' }}>
                        Admin
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          {/* Only show management buttons for non-General channels */}
          {channel.id !== "0" && (
            <div className="d-flex flex-column gap-2" style={{ marginBottom: '16px' }}>
              <button 
                className="btn btn-warning btn-sm"
                onClick={handleArchiveChannel}
                style={{ marginBottom: '8px' }}
              >
                📦 Archive Channel
              </button>
              
              <button 
                className="btn btn-danger btn-sm"
                onClick={handleDeleteChannel}
              >
                🗑️ Delete Channel
              </button>
            </div>
          )}
          
          {/* General channel info message */}
          {channel.id === "0" && (
            <div className="alert alert-info" style={{ 
              fontSize: '14px', 
              marginBottom: '16px',
              padding: '12px',
              backgroundColor: '#e3f2fd',
              border: '1px solid #bbdefb',
              borderRadius: '6px'
            }}>
              <strong>🏠 General Channel</strong><br/>
              This is the main channel for your team. It cannot be archived or deleted.
            </div>
          )}
          
          <div className="text-center">
            <button 
              className="btn btn-secondary btn-sm"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelInfoModal;
