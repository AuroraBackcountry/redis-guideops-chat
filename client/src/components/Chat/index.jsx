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
export default function Chat({ onLogOut, user, onMessageSend }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
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
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#f8f9fa'
    }}>
      
      {/* Mobile Header with Hamburger */}
      <div className="mobile-header d-flex d-lg-none align-items-center justify-content-between" style={{
        padding: '12px 16px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #eee',
        minHeight: '60px'
      }}>
        <button 
          className="btn btn-light"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          style={{ border: 'none', padding: '8px' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 12h18M3 6h18M3 18h18"/>
          </svg>
        </button>
        <h5 className="mb-0">{room ? room.name : "GuideOps Chat"}</h5>
        <div style={{ width: '36px' }}></div> {/* Spacer for centering */}
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
              onLogOut={onLogOut}
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

        {/* Chat Area */}
        <div 
          className="chat-area-mobile"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#fff'
          }}
        >
          {/* Desktop Chat Header */}
          <div className="d-none d-lg-flex align-items-center justify-content-between" style={{
            padding: '16px 20px',
            borderBottom: '1px solid #eee',
            minHeight: '60px'
          }}>
            <h5 className="mb-0">{room ? room.name : "Select a Channel"}</h5>
          </div>

          {/* Message List */}
          <div style={{ flex: 1, overflow: 'hidden' }}>
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

          {/* Typing Area */}
          <div style={{ borderTop: '1px solid #eee' }}>
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
