// @ts-check
import React, { useMemo, useCallback } from "react";
import InfoMessage from "./Chat/components/MessageList/components/InfoMessage";
import MessagesLoading from "./Chat/components/MessageList/components/MessagesLoading";
import NoMessages from "./Chat/components/MessageList/components/NoMessages";
import ReceiverMessage from "./Chat/components/MessageList/components/ReceiverMessage";
import SenderMessage from "./Chat/components/MessageList/components/SenderMessage";

// ---- utils (tiny & pure) ----
const normId = (v) => (v == null ? "" : String(v));
const toEpochMs = (d) => (typeof d === "number" ? d : Number(d) || 0);

/** Stable sort using Redis Stream IDs (lexicographic order matches time) */
const sortMessages = (items) => {
  if (!Array.isArray(items)) return items;
  // Stream IDs are already chronologically ordered, but sort for safety
  return [...items].sort((a, b) => String(a.id).localeCompare(String(b.id)));
};

/** Resolve the best user object without guesses - Redis Streams edition */
const resolveUser = (msg, usersById) => {
  const fromId = normId(msg?.from);
  
  // 1) Trust the denormalized user bundled with the message (Redis Streams snapshot)
  if (msg?.user && normId(msg.user.id) === fromId) {
    return msg.user;
  }
  
  // 2) Fallback: look in the users map (for real-time user data)
  const candidate = usersById?.[fromId];
  if (candidate && normId(candidate.id) === fromId) {
    return candidate;
  }
  
  // 3) Final fallback: neutral placeholder
  return { id: fromId, username: `User ${fromId}` };
};

// Memoized row to minimize re-renders
const Row = React.memo(function Row({
  message,
  isSelf,
  onUserClicked,
  currentUser,
  usersById,
}) {
  const userObj = resolveUser(message, usersById);

  if (message?.kind === "info" || message?.from === "info") {
    return <InfoMessage key={message.id} message={message.text ?? message.message} />;
  }

  const common = {
    key: message.id,
    message: message.text ?? message.message,
    date: message.date,
    user: userObj,
  };

  if (isSelf) {
    return (
      <ReceiverMessage
        {...common}
        username={userObj?.username || currentUser?.username || "You"}
      />
    );
  }

  const handleClick = onUserClicked
    ? () => onUserClicked(String(userObj?.id ?? message.author_id ?? message.from))
    : undefined;

  return <SenderMessage {...common} onUserClicked={handleClick} />;
});

/**
 * MessageList v2 - Redis Streams Edition
 * Perfect attribution, stable ordering, optimized performance
 */
const MessageListV2 = ({
  messageListElement,
  messages,
  hasMore = false,
  onLoadMoreMessages,
  user: currentUser,
  onUserClicked,
  users, // expected shape: Record<userId, User>
}) => {
  const currentUserId = normId(currentUser?.id);

  // Keep props stable to avoid child rerenders
  const stableOnUserClicked = useCallback(onUserClicked || (() => {}), [onUserClicked]);

  const orderedMessages = useMemo(() => {
    if (!Array.isArray(messages)) return [];
    return sortMessages(messages);
  }, [messages]);

  return (
    <div
      ref={messageListElement}
      className="chat-messages-mobile"
      style={{
        height: "100%",
        overflowY: "auto",
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {messages === undefined ? (
        <MessagesLoading />
      ) : orderedMessages.length === 0 ? (
        <NoMessages />
      ) : (
        <div className="messages-list">
          {/* Load More - ID-based pagination */}
          {hasMore && (
            <div className="d-flex flex-row align-items-center mb-4">
              <div style={{ height: 1, backgroundColor: "#eee", flex: 1 }} />
              <div className="mx-3">
                <button
                  type="button"
                  onClick={onLoadMoreMessages}
                  className="btn rounded-button btn-secondary nav-btn"
                >
                  Load more
                </button>
              </div>
              <div style={{ height: 1, backgroundColor: "#eee", flex: 1 }} />
            </div>
          )}

          {/* Messages with perfect attribution - V2 format */}
          {orderedMessages.map((message) => {
            // Handle both V1 (from) and V2 (author_id) formats during migration
            const senderId = normId(message?.author_id || message?.from);
            const isSelf = senderId === currentUserId;
            
            console.log(`[MessageV2] ID: ${message.id} | From: ${senderId} | Current: ${currentUserId} | IsSelf: ${isSelf} | User: ${message.user?.username}`);
            
            return (
              <Row
                key={message.id} // ← stable, server-issued Redis Stream ID
                message={message}
                isSelf={isSelf}
                onUserClicked={stableOnUserClicked}
                currentUser={currentUser}
                usersById={users}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MessageListV2;

