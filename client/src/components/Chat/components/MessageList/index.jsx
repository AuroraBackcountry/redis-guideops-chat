// @ts-check
import React from "react";
import { MESSAGES_TO_LOAD } from "../../../../api";
import InfoMessage from "./components/InfoMessage";
import MessagesLoading from "./components/MessagesLoading";
import NoMessages from "./components/NoMessages";
import ReceiverMessage from "./components/ReceiverMessage";
import SenderMessage from "./components/SenderMessage";

const MessageList = ({
  messageListElement,
  messages,
  room,
  onLoadMoreMessages,
  user,
  onUserClicked,
  users,
}) => {
  return (
    <div
      ref={messageListElement}
      className="chat-messages-mobile"
      style={{
        height: '100%',
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        WebkitOverflowScrolling: 'touch'
      }}
    >
      {messages === undefined ? (
        <MessagesLoading />
      ) : messages.length === 0 ? (
        <NoMessages />
      ) : (
        <div className="messages-list">
          {/* Load More Button */}
          {room && room.offset && room.offset >= MESSAGES_TO_LOAD && (
            <div className="d-flex flex-row align-items-center mb-4">
              <div style={{ height: 1, backgroundColor: "#eee", flex: 1 }}></div>
              <div className="mx-3">
                <button
                  type="button"
                  onClick={onLoadMoreMessages}
                  className="btn rounded-button btn-secondary nav-btn"
                >
                  Load more
                </button>
              </div>
              <div style={{ height: 1, backgroundColor: "#eee", flex: 1 }}></div>
            </div>
          )}
          
          {/* Messages */}
          {messages.map((message, x) => {
            const key = message.message + message.date + message.from + x;
            
            if (message.from === "info") {
              return <InfoMessage key={key} message={message.message} />;
            }
            
            // Get the actual sender's user data
            const senderId = String(message.from);
            const currentUserId = String(user.id);
            const senderUser = message.user || users[senderId] || users[message.from];
            
            console.log(`[Message] From: ${senderId}, Current: ${currentUserId}, Sender data:`, senderUser);
            
            if (senderId !== currentUserId) {
              // Message from someone else (left side)
              return (
                <SenderMessage
                  onUserClicked={() => onUserClicked(message.from)}
                  key={key}
                  message={message.message}
                  date={message.date}
                  user={senderUser}
                />
              );
            }
            
            // Message from current user (right side)
            return (
              <ReceiverMessage
                username={senderUser ? senderUser.username : user.username || "You"}
                key={key}
                message={message.message}
                date={message.date}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
export default MessageList;
