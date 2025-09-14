// @ts-check
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ChatListItem from "../components/Chat/components/ChatList/components/ChatListItem";
import { createChannel, url } from "../api";
import axios from "axios";

/**
 * Channels Page - List of all channels and direct messages
 * Route: /channels
 */
export default function ChannelsPage({ user, rooms, dispatch, currentRoom }) {
  const navigate = useNavigate();
  
  // Swipe navigation state
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isScrolling, setIsScrolling] = useState(false);
  
  // Channel search state
  const [searchTerm, setSearchTerm] = useState('');
  const [availableChannels, setAvailableChannels] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  
  // Remember the last visited chat room
  const [lastChatRoom, setLastChatRoom] = useState(() => 
    localStorage.getItem('lastChatRoom') || '0'
  );

  const minSwipeDistance = 60;
  const maxVerticalDistance = 80;
  
  // Save current room as last visited when component mounts
  useEffect(() => {
    if (currentRoom) {
      setLastChatRoom(currentRoom);
      localStorage.setItem('lastChatRoom', currentRoom);
    }
  }, [currentRoom]);

  // Swipe gesture handlers for going back to chat
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setIsScrolling(false);
    const touch = e.targetTouches[0];
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });
  };

  const onTouchMove = (e) => {
    if (!touchStart) return;
    
    const touch = e.targetTouches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;
    
    const xDiff = Math.abs(currentX - touchStart.x);
    const yDiff = Math.abs(currentY - touchStart.y);
    
    // If vertical movement is greater, it's scrolling
    if (yDiff > xDiff && yDiff > 20) {
      setIsScrolling(true);
      return;
    }
    
    // If horizontal movement is significant, prevent default scrolling
    if (xDiff > 20 && xDiff > yDiff) {
      e.preventDefault();
      setTouchEnd({
        x: currentX,
        y: currentY,
        time: Date.now()
      });
    }
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd || isScrolling) return;
    
    const xDistance = touchStart.x - touchEnd.x;
    const yDistance = Math.abs(touchStart.y - touchEnd.y);
    const timeDiff = touchEnd.time - touchStart.time;
    
    // Must be primarily horizontal and quick enough
    if (yDistance > maxVerticalDistance || timeDiff > 500) return;

    const isLeftSwipe = xDistance > minSwipeDistance;

    // Swipe left = go back to last chat
    if (isLeftSwipe) {
      console.log('[Channels] Swipe left - Going back to chat:', lastChatRoom);
      navigate(`/chat/${lastChatRoom}`);
    }
    
    // Reset states
    setTouchStart(null);
    setTouchEnd(null);
    setIsScrolling(false);
  };

  const onTouchCancel = () => {
    setTouchStart(null);
    setTouchEnd(null);
    setIsScrolling(false);
  };

  // Organize rooms into channels and DMs
  const { channels, directMessages } = useMemo(() => {
    const roomsList = Object.values(rooms);
    const channels = roomsList.filter((x) => x.id === "0" || !x.id.includes(":")); // General + named channels
    const directMessages = roomsList.filter((x) => x.id.includes(":") && x.id !== "0"); // Private chats
    
    return {
      channels: channels,
      directMessages: directMessages.sort(
        (a, b) => +a.id.split(":").pop() - +b.id.split(":").pop()
      )
    };
  }, [rooms]);

  const handleRoomSelect = (roomId) => {
    dispatch({ type: "set current room", payload: roomId });
    navigate(`/chat/${roomId}`);
  };

  const handleCreateChannel = async () => {
    const name = prompt('Enter channel name:');
    if (name && name.trim()) {
      try {
        const newChannel = await createChannel(name.trim(), 'public', `Channel created by ${user.username}`);
        console.log('✅ Created channel:', newChannel);
        
        // Add new channel to state so it appears in sidebar
        dispatch({ 
          type: "add room", 
          payload: { 
            id: newChannel.id, 
            name: newChannel.name,
            connected: false  // Will be connected when Socket.IO joins
          } 
        });
        
        alert(`Channel "${name}" created successfully!`);
        // Navigate to new channel
        handleRoomSelect(newChannel.id);
      } catch (error) {
        console.error('❌ Failed to create channel:', error);
        alert('Failed to create channel. Please try again.');
      }
    }
  };

  // Search for available channels
  const searchAvailableChannels = async () => {
    if (!user) return;
    
    setSearchLoading(true);
    try {
      const response = await axios.get(url('/api/channels/available'), {
        withCredentials: true
      });
      setAvailableChannels(response.data);
      console.log('Available channels:', response.data);
    } catch (error) {
      console.error('Failed to search channels:', error);
      console.error('Error details:', error.response?.data || error.message);
      alert('Failed to search channels. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  // Join a channel
  const joinChannel = async (roomId, roomName) => {
    if (!user) return;
    
    try {
      const response = await axios.post(url(`/api/channels/${roomId}/join`), {}, {
        withCredentials: true
      });
      
      if (response.data.success) {
        // Add channel to local state so it appears immediately
        dispatch({ 
          type: "add room", 
          payload: { 
            id: roomId, 
            name: roomName,
            connected: false
          } 
        });
        
        alert(`Successfully joined "${roomName}"!`);
        
        // Refresh available channels to update membership status
        searchAvailableChannels();
        
        // Navigate to the newly joined channel
        handleRoomSelect(roomId);
      }
    } catch (error) {
      console.error('Failed to join channel:', error);
      alert('Failed to join channel. Please try again.');
    }
  };

  // Filter available channels based on search term
  const filteredChannels = availableChannels.filter(channel => 
    channel.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    channel.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Show available channels that user isn't already a member of
  const joinableChannels = filteredChannels.filter(channel => !channel.is_member);

  return (
    <div className="channels-page" style={{ 
      flex: 1,
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f8f9fa',
      overflow: 'hidden'
    }}>
      
      {/* Header */}
      <div className="channels-header" style={{
        padding: '16px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #eee',
        flexShrink: 0
      }}>
        <div className="mb-3">
          <h4 className="mb-0">Channels & DMs</h4>
        </div>
        <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
          Tap any conversation to open
        </p>
        <div style={{
          fontSize: '10px',
          color: '#6c757d',
          opacity: 0.7,
          marginTop: '4px'
        }}>
          Swipe left to return to chat →
        </div>
      </div>

      {/* Channel Search Section */}
      <div className="channel-search" style={{
        padding: '16px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #eee'
      }}>
        <div className="d-flex align-items-center mb-2">
          <input
            type="text"
            className="form-control form-control-sm"
            placeholder="Search for channels to join..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => {
              setShowSearch(true);
              if (availableChannels.length === 0) searchAvailableChannels();
            }}
            style={{ marginRight: '8px' }}
          />
          <button
            className="btn btn-primary btn-sm"
            onClick={searchAvailableChannels}
            disabled={searchLoading}
            style={{ minWidth: '60px' }}
          >
            {searchLoading ? '...' : '🔍'}
          </button>
        </div>
        
        {/* Search Results */}
        {showSearch && (
          <div className="search-results" style={{
            maxHeight: '200px',
            overflowY: 'auto',
            border: '1px solid #eee',
            borderRadius: '4px',
            backgroundColor: '#f8f9fa'
          }}>
            {joinableChannels.length > 0 ? (
              <div className="p-2">
                <small className="text-muted font-weight-bold d-block mb-2">
                  AVAILABLE CHANNELS TO JOIN ({joinableChannels.length})
                </small>
                {joinableChannels.map((channel) => (
                  <div 
                    key={channel.id} 
                    className="d-flex justify-content-between align-items-center p-2 mb-1"
                    style={{ 
                      backgroundColor: '#fff', 
                      borderRadius: '4px',
                      border: '1px solid #eee'
                    }}
                  >
                    <div className="flex-grow-1">
                      <div className="font-weight-bold">{channel.name}</div>
                      {channel.description && (
                        <small className="text-muted">{channel.description}</small>
                      )}
                      <small className="text-muted d-block">
                        {channel.member_count} members • {channel.type}
                      </small>
                    </div>
                    <button
                      className="btn btn-success btn-sm ml-2"
                      onClick={() => joinChannel(channel.id, channel.name)}
                      style={{ minWidth: '60px' }}
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
            ) : searchLoading ? (
              <div className="text-center p-3">
                <small className="text-muted">Searching for channels...</small>
              </div>
            ) : availableChannels.length > 0 ? (
              <div className="text-center p-3">
                <small className="text-muted">
                  {searchTerm ? 'No matching channels found' : 'You\'re already a member of all available channels!'}
                </small>
              </div>
            ) : (
              <div className="text-center p-3">
                <small className="text-muted">Click search to find available channels</small>
              </div>
            )}
            
            {/* Elrich AI Channel Creator */}
            <div className="text-center p-2 border-top">
              <button
                className="btn btn-success btn-sm mr-2"
                onClick={async () => {
                  try {
                    const response = await axios.post(url('/api/channels/create-elrich'), {}, {
                      withCredentials: true
                    });
                    if (response.data.success) {
                      alert('🤖 ' + response.data.message);
                      searchAvailableChannels(); // Refresh to show new channel
                    }
                  } catch (error) {
                    console.error('Failed to create Elrich channel:', error);
                    alert('Failed to create Elrich channel. Please try again.');
                  }
                }}
                style={{ marginRight: '8px' }}
              >
                🤖 Create Elrich AI
              </button>
              
              <button
                className="btn btn-link btn-sm text-muted"
                onClick={() => setShowSearch(false)}
              >
                Close Search
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Room Lists with swipe navigation */}
      <div className="room-lists" style={{
        flex: 1,
        overflow: 'auto',
        padding: '0 16px',
        WebkitOverflowScrolling: 'touch',
        touchAction: 'pan-y',
        position: 'relative'
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchCancel}
      >
        
        {/* Channels Section */}
        {channels.length > 0 && (
          <div className="channels-section mb-4">
            <div className="section-header" style={{
              padding: '16px 0 8px 0',
              borderBottom: '1px solid #f0f0f0',
              marginBottom: '8px'
            }}>
              <small className="text-muted font-weight-bold">CHANNELS</small>
            </div>
            <div className="channels-list">
              {channels.map((room) => (
                <div key={room.id} style={{ marginBottom: '8px' }}>
                  <ChatListItem
                    onClick={() => handleRoomSelect(room.id)}
                    active={currentRoom === room.id}
                    room={room}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Direct Messages Section */}
        {directMessages.length > 0 && (
          <div className="direct-messages-section mb-4">
            <div className="section-header" style={{
              padding: '16px 0 8px 0',
              borderBottom: '1px solid #f0f0f0',
              marginBottom: '8px'
            }}>
              <small className="text-muted font-weight-bold">DIRECT MESSAGES</small>
            </div>
            <div className="dm-list">
              {directMessages.map((room) => (
                <div key={room.id} style={{ marginBottom: '8px' }}>
                  <ChatListItem
                    onClick={() => handleRoomSelect(room.id)}
                    active={currentRoom === room.id}
                    room={room}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {channels.length === 0 && directMessages.length === 0 && (
          <div className="empty-state text-center" style={{ 
            padding: '60px 20px',
            color: '#6c757d'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>💬</div>
            <h5>No conversations yet</h5>
            <p>Use the button below to create your first channel!</p>
          </div>
        )}
      </div>
      
      {/* Add New Channel Footer - Like chat input */}
      <div 
        className="channels-footer"
        style={{ 
          borderTop: '1px solid #eee',
          backgroundColor: '#fff',
          flexShrink: 0,
          minHeight: '60px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <button 
          className="btn btn-primary"
          onClick={handleCreateChannel}
          style={{ 
            width: '100%',
            padding: '12px',
            fontSize: '16px',
            fontWeight: '500'
          }}
        >
          + Create New Channel
        </button>
      </div>
    </div>
  );
}
