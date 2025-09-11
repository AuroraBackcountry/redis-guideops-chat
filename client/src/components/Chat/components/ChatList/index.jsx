// @ts-check
import React, { useMemo } from "react";
import ChatListItem from "./components/ChatListItem";
import Footer from "./components/Footer";

const ChatList = ({ rooms, dispatch, user, currentRoom }) => {
  const processedRooms = useMemo(() => {
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
  return (
    <>
      <div className="chat-list-container flex-column d-flex pr-4">
        <div className="py-2">
          <p className="h5 mb-0 py-1 chats-title">💬 Channels & DMs</p>
          <small className="text-muted">Swipe right to open</small>
        </div>
        <div className="messages-box flex flex-1" style={{ overflowY: 'auto' }}>
          
          {/* Channels Section */}
          {processedRooms.channels.length > 0 && (
            <div className="mb-3">
              <div className="px-3 pb-1">
                <small className="text-muted font-weight-bold">CHANNELS</small>
              </div>
              <div className="list-group rounded-0">
                {processedRooms.channels.map((room) => (
                  <ChatListItem
                    key={room.id}
                    onClick={() =>
                      dispatch({ type: "set current room", payload: room.id })
                    }
                    active={currentRoom === room.id}
                    room={room}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Direct Messages Section */}
          {processedRooms.directMessages.length > 0 && (
            <div className="mb-3">
              <div className="px-3 pb-1">
                <small className="text-muted font-weight-bold">DIRECT MESSAGES</small>
              </div>
              <div className="list-group rounded-0">
                {processedRooms.directMessages.map((room) => (
                  <ChatListItem
                    key={room.id}
                    onClick={() =>
                      dispatch({ type: "set current room", payload: room.id })
                    }
                    active={currentRoom === room.id}
                    room={room}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
        <Footer user={user} />
      </div>
    </>
  );
};

export default ChatList;
