// @ts-check
import React, { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ChatListItem from "../components/Chat/components/ChatList/components/ChatListItem";
import { createChannel } from "../api";

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
        alert(`Channel "${name}" created successfully!`);
        // Navigate to new channel
        handleRoomSelect(newChannel.id);
      } catch (error) {
        console.error('❌ Failed to create channel:', error);
        alert('Failed to create channel. Please try again.');
      }
    }
  };

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
