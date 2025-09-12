// @ts-check
import { useCallback } from "react";
import { useEffect, useState, useRef } from "react";
import { addRoom } from "../../api";
import { getMessagesV2 } from "../../api-v2";
import { useAppState } from "../../state";
import { parseRoomName, populateUsersFromLoadedMessages } from "../../utils";

/** Lifecycle hooks with callbacks for the Chat component */
const useChatHandlers = (/** @type {import("../../state").UserEntry} */ user) => {
  const [state, dispatch] = useAppState();
  const messageListElement = useRef(null);

  /** @type {import("../../state").Room} */
  const room = state.rooms[state.currentRoom];
  const roomId = room?.id;
  const messages = room?.messages;

  const [message, setMessage] = useState("");

  const scrollToTop = useCallback(() => {
    setTimeout(() => {
      if (messageListElement.current) {
        messageListElement.current.scrollTop = 0;
      }
    }, 0);
  }, []);

  const scrollToBottom = useCallback(() => {
    if (messageListElement.current) {
      messageListElement.current.scrollTo({
        top: messageListElement.current.scrollHeight,
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const onFetchMessages = useCallback(
    (offset = 0, prepend = false) => {
      getMessagesV2(roomId, 15).then(async (result) => {
        const messages = result.messages || [];
        /** We've got messages but it's possible we might not have the cached user entires which correspond to those messages */
        await populateUsersFromLoadedMessages(state.users, dispatch, messages);

        dispatch({
          type: prepend ? "prepend messages" : "set messages",
          payload: { id: roomId, messages: messages },
        });
        if (prepend) {
          setTimeout(() => {
            scrollToTop();
          }, 10);
        } else {
          scrollToBottom();
        }
      });
    },
    [dispatch, roomId, scrollToBottom, scrollToTop, state.users]
  );

  useEffect(() => {
    if (roomId === undefined) {
      return;
    }
    if (messages === undefined) {
      /** Fetch logic goes here */
      onFetchMessages();
    }
  }, [
    messages,
    dispatch,
    roomId,
    state.users,
    state,
    scrollToBottom,
    onFetchMessages,
  ]);

  useEffect(() => {
    if (messageListElement.current) {
      scrollToBottom();
    }
  }, [scrollToBottom, roomId]);

  const onUserClicked = async (userId) => {
    try {
      console.log(`[UserClick] Attempting to open DM with user ${userId}`);
      
      /** Check if user exists in state */
      const targetUser = state.users[userId];
      if (!targetUser) {
        console.log(`[UserClick] User ${userId} not found in state`);
        alert(`User ${userId} information not available`);
        return;
      }

      /** Check if room exists. */
      let roomId = targetUser.room;
      if (roomId === undefined) {
        console.log(`[UserClick] Creating new DM room with user ${userId}`);
        // @ts-ignore
        const room = await addRoom(userId, user.id);
        roomId = room.id;
        /** We need to set this room id to user. */
        dispatch({ type: "set user", payload: { ...targetUser, room: roomId } });
        /** Then a new room should be added to the store. */
        dispatch({
          type: "add room",
          // @ts-ignore
          payload: { id: roomId, name: parseRoomName(room.names, user.username) },
        });
      }
      
      console.log(`[UserClick] Switching to room ${roomId}`);
      /** Then a room should be changed */
      dispatch({ type: "set current room", payload: roomId });
    } catch (error) {
      console.error('[UserClick] Error opening DM:', error);
      alert('Unable to open direct message with this user');
    }
  };

  const onLoadMoreMessages = useCallback(() => {
    onFetchMessages(room.offset, true);
  }, [onFetchMessages, room]);

  return {
    onLoadMoreMessages,
    onUserClicked,
    message,
    setMessage,
    dispatch,
    room,
    rooms: state.rooms,
    currentRoom: state.currentRoom,
    messageListElement,
    roomId,
    users: state.users,
    messages,
  };
};
export default useChatHandlers;