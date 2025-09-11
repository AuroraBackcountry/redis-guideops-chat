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
            
            if (+message.from !== +user.id) {
              // Use embedded user data from message (always available)
              const senderUser = message.user || users[message.from];
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
            
            return (
              <ReceiverMessage
                username={users[message.from] ? users[message.from].username : ""}
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
