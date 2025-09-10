// @ts-check
import React from "react";
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
    <div className="container py-5 px-4">
      <div className="chat-body row overflow-hidden shadow bg-light rounded">
        <div className="col-4 px-0">
          <ChatList
            user={user}
            onLogOut={onLogOut}
            rooms={rooms}
            currentRoom={currentRoom}
            dispatch={dispatch}
          />
          
          {/* Enhanced Features Panel */}
          <div className="enhanced-features" style={{ 
            padding: '15px', 
            borderTop: '1px solid #eee',
            backgroundColor: '#f8f9fa'
          }}>
            <h6 style={{ marginBottom: '10px', color: '#495057' }}>Enhanced Features</h6>
            <button 
              className="btn btn-primary btn-sm mb-2" 
              style={{ width: '100%' }}
              onClick={handleCreateChannel}
            >
              + Create Channel
            </button>
            <small className="text-muted">
              Redis-powered features:<br/>
              ✅ Enhanced user profiles<br/>
              ✅ Channel management<br/>
              ✅ AI assistant ready<br/>
              🔄 Real-time updates (coming)
            </small>
          </div>
        </div>
        {/* Chat Box*/}
        <div className="col-8 px-0 flex-column bg-white rounded-lg">
          <div className="px-4 py-4" style={{ borderBottom: "1px solid #eee" }}>
            <h2 className="font-size-15 mb-0">{room ? room.name : "Room"}</h2>
          </div>
          <MessageList
            messageListElement={messageListElement}
            messages={messages}
            room={room}
            onLoadMoreMessages={onLoadMoreMessages}
            user={user}
            onUserClicked={onUserClicked}
            users={users}
          />

          {/* Typing area */}
          <TypingArea
            message={message}
            setMessage={setMessage}
            onSubmit={(e) => {
              e.preventDefault();
              onMessageSend(message.trim(), roomId);
              setMessage("");

              messageListElement.current.scrollTop =
                messageListElement.current.scrollHeight;
            }}
          />
        </div>
      </div>
    </div>
  );
}
