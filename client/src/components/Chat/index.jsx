// @ts-check
import React, { useState } from "react";
import ChatList from "./components/ChatList";
import MessageList from "./components/MessageList";
import TypingArea from "./components/TypingArea";
import useChatHandlers from "./use-chat-handlers";
import { createChannel } from "../../api";

/**
 * @param {{
 *  onLogOut: () => void,
 *  onMessageSend: (message: string, roomId: string) => void,
 *  user: import("../../state").UserEntry
 * }} props
 */
export default function Chat({ onLogOut, user, onMessageSend, sidebarOpen, setSidebarOpen }) {
  
  const {
    onLoadMoreMessages,
    onUserClicked,
    message,
    setMessage,
    rooms,
    room,
    currentRoom,
    dispatch,
    messageListElement,
    roomId,
    messages,
    users,
  } = useChatHandlers(user);

  // Enhanced touch gesture handling for mobile devices
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isScrolling, setIsScrolling] = useState(false);
  const [swipeDebug, setSwipeDebug] = useState('');

  const minSwipeDistance = 60; // Optimized for mobile testing
  const maxVerticalDistance = 100; // Prevent accidental vertical swipes

  const onTouchStart = (e) => {
    console.log('[Swipe] Touch start detected');
    setSwipeDebug('👆 Touch start');
    setTouchEnd(null);
    setIsScrolling(false);
    const touch = e.targetTouches[0];
    setTouchStart({
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    });
    
    // Clear debug message after 1 second
    setTimeout(() => setSwipeDebug(''), 1000);
  };

  const onTouchMove = (e) => {
    if (!touchStart) return;
    
    const touch = e.targetTouches[0];
    const currentX = touch.clientX;
    const currentY = touch.clientY;
    
    // Calculate distances
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

  const onTouchEnd = (e) => {
    if (!touchStart || !touchEnd || isScrolling) {
      console.log('[Swipe] Touch end - no valid swipe detected');
      return;
    }
    
    const xDistance = touchStart.x - touchEnd.x;
    const yDistance = Math.abs(touchStart.y - touchEnd.y);
    const timeDiff = touchEnd.time - touchStart.time;
    
    // Must be primarily horizontal and quick enough
    if (yDistance > maxVerticalDistance || timeDiff > 500) {
      console.log('[Swipe] Touch rejected - too vertical or too slow');
      return;
    }

    const isLeftSwipe = xDistance > minSwipeDistance;
    const isRightSwipe = xDistance < -minSwipeDistance;

    console.log(`[Swipe] Distance: ${Math.abs(xDistance)}px, Direction: ${isLeftSwipe ? 'left' : isRightSwipe ? 'right' : 'none'}`);

    // Swipe right = open sidebar (show channels)
    if (isRightSwipe && !sidebarOpen) {
      console.log('[Swipe] Opening sidebar');
      setSwipeDebug('👉 Swipe right - Opening channels');
      setSidebarOpen(true);
      setTimeout(() => setSwipeDebug(''), 2000);
    }
    // Swipe left = close sidebar  
    else if (isLeftSwipe && sidebarOpen) {
      console.log('[Swipe] Closing sidebar');
      setSwipeDebug('👈 Swipe left - Closing channels');
      setSidebarOpen(false);
      setTimeout(() => setSwipeDebug(''), 2000);
    }
    else {
      setSwipeDebug(`📏 Swipe too short: ${Math.abs(xDistance)}px (need ${minSwipeDistance}px)`);
      setTimeout(() => setSwipeDebug(''), 2000);
    }
    
    // Reset states
    setTouchStart(null);
    setTouchEnd(null);
    setIsScrolling(false);
  };

  const onTouchCancel = () => {
    console.log('[Swipe] Touch cancelled');
    setTouchStart(null);
    setTouchEnd(null);
    setIsScrolling(false);
  };

  const handleCreateChannel = async () => {
    const name = prompt('Enter channel name:');
    if (name && name.trim()) {
      try {
        const newChannel = await createChannel(name.trim(), 'public', `Channel created by ${user.username}`);
        console.log('✅ Created channel:', newChannel);
        alert(`Channel "${name}" created successfully! Refresh the page to see it.`);
        // For now, refresh to see the new channel
        window.location.reload();
      } catch (error) {
        console.error('❌ Failed to create channel:', error);
        alert('Failed to create channel. Please try again.');
      }
    }
  };

  return (
    <div className="mobile-chat-container" style={{ 
      flex: 1, // Fill remaining space after navbar
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f8f9fa',
      overflow: 'hidden', // Prevent body scrolling
      position: 'relative'
    }}>
      
      {/* Mobile Header - Centered Room Name */}
      <div className="mobile-header d-flex d-lg-none align-items-center justify-content-center" style={{
        padding: '12px 16px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #eee',
        minHeight: '60px',
        flexShrink: 0,  // Fixed size header
        position: 'relative'
      }}>
        <h5 className="mb-0" style={{ fontWeight: '500' }}>
          {room ? room.name : "GuideOps Chat"}
        </h5>
        
        {/* Swipe Debug Indicator for Mobile Testing */}
        {swipeDebug && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'rgba(0,0,0,0.8)',
            color: 'white',
            padding: '8px 12px',
            borderRadius: '8px',
            fontSize: '12px',
            zIndex: 10000,
            whiteSpace: 'nowrap'
          }}>
            {swipeDebug}
          </div>
        )}
      </div>

      <div className="chat-body-mobile" style={{ 
        flex: 1, 
        display: 'flex', 
        overflow: 'hidden',
        position: 'relative'
      }}>
        
        {/* Sidebar - Mobile First */}
        <div 
          className={`sidebar-mobile ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}
          style={{
            position: window.innerWidth < 992 ? 'absolute' : 'relative',
            left: sidebarOpen || window.innerWidth >= 992 ? '0' : '-100%',
            width: window.innerWidth < 992 ? '100%' : '320px',
            height: '100%',
            backgroundColor: '#f8f9fa',
            borderRight: window.innerWidth >= 992 ? '1px solid #eee' : 'none',
            zIndex: window.innerWidth < 992 ? 1000 : 1,
            transition: 'left 0.3s ease-in-out',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Desktop Header */}
          <div className="d-none d-lg-block" style={{
            padding: '20px 16px',
            borderBottom: '1px solid #eee',
            backgroundColor: '#fff'
          }}>
            <h4 className="mb-0">GuideOps Chat</h4>
          </div>
          
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ChatList
              user={user}
              rooms={rooms}
              currentRoom={currentRoom}
              dispatch={dispatch}
            />
          </div>
          
          {/* Enhanced Features Panel */}
          <div className="enhanced-features" style={{ 
            padding: '16px', 
            borderTop: '1px solid #eee',
            backgroundColor: '#fff'
          }}>
            <button 
              className="btn btn-primary btn-sm mb-2" 
              style={{ width: '100%' }}
              onClick={handleCreateChannel}
            >
              + Create Channel
            </button>
          </div>
        </div>

        {/* Chat Area - Mobile First with Swipe Gestures */}
        <div 
          className="chat-area-mobile"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fff',
            position: 'relative',
            height: '100%'
          }}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onTouchCancel={onTouchCancel}
        >
          {/* Desktop Chat Header */}
          <div className="d-none d-lg-flex align-items-center justify-content-between" style={{
            padding: '16px 20px',
            borderBottom: '1px solid #eee',
            minHeight: '60px',
            flexShrink: 0
          }}>
            <h5 className="mb-0">{room ? room.name : "Select a Channel"}</h5>
          </div>

          {/* Message List - Dynamic height fills available space */}
          <div 
            className="messages-container"
            style={{ 
              flex: 1,
              overflow: 'auto',
              minHeight: 0, // Allow flex to shrink below content size
              WebkitOverflowScrolling: 'touch', // Smooth iOS scrolling
              // Ensures proper scrolling on all mobile browsers
              overscrollBehavior: 'contain',
              // Better touch handling
              touchAction: 'pan-y' // Allow vertical scrolling, detect horizontal swipes
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            onTouchCancel={onTouchCancel}
          >
            <MessageList
              messageListElement={messageListElement}
              messages={messages}
              room={room}
              onLoadMoreMessages={onLoadMoreMessages}
              user={user}
              onUserClicked={onUserClicked}
              users={users}
            />
          </div>

          {/* Typing Area - Fixed at bottom */}
          <div 
            className="typing-area-fixed"
            style={{ 
              borderTop: '1px solid #eee',
              backgroundColor: '#fff',
              flexShrink: 0,  // Fixed size input area
              minHeight: '60px', // Minimum input height
              position: 'relative',
              zIndex: 10
            }}
          >
            <TypingArea
              message={message}
              setMessage={setMessage}
              onSubmit={(e) => {
                e.preventDefault();
                onMessageSend(message.trim(), roomId);
                setMessage("");
                setSidebarOpen(false); // Close sidebar on mobile after sending

                messageListElement.current.scrollTop =
                  messageListElement.current.scrollHeight;
              }}
            />
          </div>
        </div>

        {/* Mobile Overlay */}
        {sidebarOpen && (
          <div 
            className="mobile-overlay d-lg-none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.3)',
              zIndex: 999
            }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </div>
    </div>
  );
}
