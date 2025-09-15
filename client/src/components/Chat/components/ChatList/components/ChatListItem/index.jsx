// @ts-check
import "./style.css";
import React, { useMemo } from "react";
import { useAppState } from "../../../../../../state";
import moment from "moment";
import { useEffect } from "react";
import { getMessagesV2 } from "../../../../../../api-v2";
import AvatarImage from "../AvatarImage";
import OnlineIndicator from "../../../OnlineIndicator";

/**
 * @param {{ active: boolean; room: import('../../../../../../state').Room; onClick: () => void; }} props
 */
const ChatListItem = ({ room, active = false, onClick }) => {
  const { online, name, lastMessage, userId, messagePreview, hasUnread, isChannel, isDirectMessage } = useChatListItemHandlers(room);
  
  // Determine indicator logic
  const showIndicator = isDirectMessage ? true : hasUnread; // DMs: always show, Channels: only if unread
  const indicatorOnline = isDirectMessage ? online : true; // DMs: actual status, Channels: green if unread
  
  return (
    <div
      onClick={onClick}
      className={`chat-list-item d-flex align-items-start rounded ${
        active ? "bg-white" : ""
      }`}
    >
      <div className="align-self-center mr-3">
        <OnlineIndicator online={indicatorOnline} hide={!showIndicator} />
      </div>
      <div className="align-self-center mr-3">
        <AvatarImage name={name} id={userId} />
      </div>
      <div className="media-body overflow-hidden">
        <h5 className="text-truncate font-size-14 mb-1">{name}</h5>
        {messagePreview && (
          <p className="text-truncate mb-0" style={{ fontSize: '13px', color: '#6c757d' }}>
            {messagePreview}
          </p>
        )}
      </div>
      {lastMessage && (
        <div className="font-size-11">
          {moment(lastMessage.date).format("LT")}
        </div>
      )}
    </div>
  );
};

const useChatListItemHandlers = (
  /** @type {import("../../../../../../state").Room} */ room
) => {
  const { id, name } = room;
  const [state] = useAppState();
  
  // Get current user info for "You:" vs "SenderName:" logic
  const currentUser = state.users?.[state.currentUser] || JSON.parse(localStorage.getItem('guideops_user') || '{}');
  
  // Determine room type
  const isChannel = id === "0" || !String(id).includes(":");
  const isDirectMessage = String(id).includes(":") && id !== "0";

  /** Here we want to associate the room with a user by its name (since it's unique). */
  const [isUser, online, userId] = useMemo(() => {
    try {
      let pseudoUserId = Math.abs(parseInt(id.split(":").reverse().pop()));
      const isUser = pseudoUserId > 0;
      const usersFiltered = Object.entries(state.users)
        .filter(([, user]) => user.username === name)
        .map(([, user]) => user);
      let online = false;
      if (usersFiltered.length > 0) {
        online = usersFiltered[0].online;
        pseudoUserId = +usersFiltered[0].id;
      }
      return [isUser, online, pseudoUserId];
    } catch (_) {
      return [false, false, "0"];
    }
  }, [id, name, state.users]);

  const lastMessage = useLastMessage(room);
  
  // Create message preview with sender identification
  const messagePreview = useMemo(() => {
    if (!lastMessage) return null;
    
    // Handle info messages (system messages)
    if (lastMessage.from === 'info') {
      return lastMessage.message;
    }
    
    // Get sender information
    const senderId = lastMessage.from;
    let senderUser = lastMessage.user || state.users[senderId];
    
    // Additional fallback: try to find user by ID in state
    if (!senderUser && senderId) {
      const userEntries = Object.entries(state.users);
      const foundUser = userEntries.find(([userId, userData]) => 
        userId === senderId || userId === String(senderId)
      );
      if (foundUser) {
        senderUser = foundUser[1];
      }
    }
    
    if (!senderUser) {
      return lastMessage.message; // Fallback if no user data found
    }
    
    // Create "SenderName: Message" format like WhatsApp  
    const messageText = lastMessage.message;
    
    // Check if current user sent the message
    const isCurrentUser = currentUser && (senderId === currentUser.id || senderId === String(currentUser.id));
    
    if (isCurrentUser) {
      return `You: ${messageText}`;
    }
    
    // For other users, show their name
    const senderName = senderUser.username || senderUser.first_name || 'Unknown';
    
    // For direct messages, don't show sender name if it's the other person's name
    // (since the room name is already their name) 
    if (room.id.includes(':') && senderName === room.name) {
      return messageText;
    }
    
    return `${senderName}: ${messageText}`;
  }, [lastMessage, state.users, room.name, room.id, currentUser]);
  
  // Simple unread detection: if there's a lastMessage and room isn't currently active
  const hasUnread = useMemo(() => {
    // For now, assume unread if there's a message and room isn't the current room
    // TODO: Implement proper last-read tracking with Redis
    return lastMessage && state.currentRoom !== id;
  }, [lastMessage, state.currentRoom, id]);

  return {
    isUser,
    online,
    userId,
    name: room.name,
    lastMessage,
    messagePreview,
    hasUnread,
    isChannel,
    isDirectMessage,
  };
};

const useLastMessage = (
  /** @type {import("../../../../../../state").Room} */ room
) => {
  const [, dispatch] = useAppState();
  const { lastMessage } = room;
  useEffect(() => {
    if (lastMessage === undefined) {
      /** need to fetch it */
      if (room.messages === undefined) {
        getMessagesV2(room.id, 1).then((result) => {
          const messages = result.messages || [];
          let message = null;
          if (messages.length !== 0) {
            message = messages.pop();
          }
          dispatch({
            type: "set last message",
            payload: { id: room.id, lastMessage: message },
          });
        });
      } else if (room.messages.length === 0) {
        dispatch({
          type: "set last message",
          payload: { id: room.id, lastMessage: null },
        });
      } else {
        dispatch({
          type: "set last message",
          payload: {
            id: room.id,
            lastMessage: room.messages[room.messages.length - 1],
          },
        });
      }
    }
  }, [lastMessage, dispatch, room]);

  return lastMessage;
};

export default ChatListItem;
