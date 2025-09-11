// @ts-check
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MessageListV2 from "../components/MessageListV2";
import TypingArea from "../components/Chat/components/TypingArea";
import useChatHandlers from "../components/Chat/use-chat-handlers";
import { getMessagesV2, sendMessageV2 } from "../api-v2";

/**
 * Chat Page - Main messaging interface
 * Route: /chat/:roomId
 */
export default function ChatPage({ user, onMessageSend }) {
  const navigate = useNavigate();
  const { roomId } = useParams(); // Get room ID from URL
  
  // Swipe navigation state
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isScrolling, setIsScrolling] = useState(false);

  const minSwipeDistance = 60;
  const maxVerticalDistance = 80;
  
  // Swipe gesture handlers
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

    const isRightSwipe = xDistance < -minSwipeDistance;

    // Swipe right = go to channels page
    if (isRightSwipe) {
      console.log('[Chat] Swipe right - Going to channels');
      navigate('/channels');
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
  
  // Redis Streams v2 state (simplified, focused)
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [oldestId, setOldestId] = useState(null);
  const [message, setMessage] = useState("");
  const messageListElement = React.useRef(null);
  
  // Get basic state for room and user info (keep existing for compatibility)
  const { rooms, users, currentRoom, dispatch } = useChatHandlers(user);

  // Enhanced onUserClicked for multi-page architecture
  const handleUserClicked = async (userId) => {
    try {
      console.log(`[ChatPage] User clicked: ${userId}`);
      
      // Simple implementation: just show user info for now
      const targetUser = users[userId];
      if (targetUser) {
        alert(`Start DM with ${targetUser.username}? (Feature coming soon!)`);
      } else {
        alert(`User ${userId} information not available`);
      }
    } catch (error) {
      console.error('[ChatPage] Error handling user click:', error);
      alert('User interaction feature coming soon!');
    }
  };

  // Load messages using Redis Streams v2 API
  const loadMessages = async (beforeId = null) => {
    if (!roomId) return;
    
    try {
      console.log(`[ChatPage] Loading messages for room ${roomId}${beforeId ? ` before ${beforeId}` : ''}`);
      
      const result = await getMessagesV2(roomId, 15, beforeId);
      
      if (beforeId) {
        // Loading more (prepend older messages)
        setMessages(prev => [...result.messages, ...prev]);
      } else {
        // Initial load
        setMessages(result.messages);
      }
      
      setHasMore(result.hasMore);
      setOldestId(result.oldestId);
      setLoading(false);
      
      console.log(`[ChatPage] Loaded ${result.messages.length} messages, hasMore: ${result.hasMore}`);
      
    } catch (error) {
      console.error('[ChatPage] Error loading messages:', error);
      setLoading(false);
    }
  };

  const onLoadMoreMessages = () => {
    if (hasMore && oldestId) {
      loadMessages(oldestId);
    }
  };

  // Load messages when room changes
  useEffect(() => {
    if (roomId) {
      setLoading(true);
      loadMessages();
      // Set current room in global state for compatibility
      dispatch({ type: "set current room", payload: roomId });
    }
  }, [roomId, dispatch]);

  // Send message using Redis Streams
  const handleSendMessage = async (messageText) => {
    if (!messageText.trim() || !roomId) return;
    
    try {
      console.log(`[ChatPage] Sending message to room ${roomId}`);
      
      const newMessage = await sendMessageV2(roomId, messageText.trim());
      
      // Add to local state (optimistic update)
      setMessages(prev => [...prev, newMessage]);
      
      // Scroll to bottom
      if (messageListElement.current) {
        setTimeout(() => {
          messageListElement.current.scrollTop = messageListElement.current.scrollHeight;
        }, 50);
      }
      
      console.log(`[ChatPage] Message sent: ${newMessage.id}`);
      
    } catch (error) {
      console.error('[ChatPage] Error sending message:', error);
      alert('Failed to send message. Please try again.');
    }
  };

  // Get current room data
  const currentRoomData = rooms[roomId || currentRoom] || rooms["0"];

  return (
    <div className="chat-page" style={{ 
      flex: 1,
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#fff',
      overflow: 'hidden'
    }}>
      
      {/* Mobile Chat Header - No back button, swipe navigation */}
      <div className="chat-header d-flex align-items-center justify-content-center" style={{
        padding: '12px 16px',
        backgroundColor: '#fff',
        borderBottom: '1px solid #eee',
        minHeight: '60px',
        flexShrink: 0,
        position: 'relative'
      }}>
        <h5 className="mb-0" style={{ fontWeight: '500' }}>
          {currentRoomData ? currentRoomData.name : "Chat"}
        </h5>
        
        {/* Swipe hint */}
        <div style={{
          position: 'absolute',
          bottom: '-20px',
          left: '50%',
          transform: 'translateX(-50%)',
          fontSize: '10px',
          color: '#6c757d',
          opacity: 0.7
        }}>
          ← Swipe for channels
        </div>
      </div>

      {/* Message List - Full height with swipe navigation */}
      <div 
        className="messages-container"
        style={{ 
          flex: 1,
          overflow: 'auto',
          minHeight: 0,
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y'
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchCancel}
      >
        {loading ? (
          <div className="d-flex justify-content-center align-items-center" style={{height: "100px"}}>
            <div className="spinner-border" role="status">
              <span className="sr-only">Loading messages...</span>
            </div>
          </div>
        ) : (
          <MessageListV2
            messageListElement={messageListElement}
            messages={messages}
            hasMore={hasMore}
            onLoadMoreMessages={onLoadMoreMessages}
            user={user}
            onUserClicked={handleUserClicked}
            users={users}
          />
        )}
      </div>

      {/* Typing Area - Fixed at bottom */}
      <div 
        className="typing-area"
        style={{ 
          borderTop: '1px solid #eee',
          backgroundColor: '#fff',
          flexShrink: 0,
          minHeight: '60px'
        }}
      >
        <TypingArea
          message={message}
          setMessage={setMessage}
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(message.trim());
            setMessage("");
          }}
        />
      </div>
    </div>
  );
}
