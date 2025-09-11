// @ts-check
import React, { useMemo } from "react";
import { MESSAGES_TO_LOAD } from "../../../../api";
import InfoMessage from "./components/InfoMessage";
import MessagesLoading from "./components/MessagesLoading";
import NoMessages from "./components/NoMessages";
import ReceiverMessage from "./components/ReceiverMessage";
import SenderMessage from "./components/SenderMessage";

/** Utils */
const normId = (v) => (v == null ? null : String(v));
const toEpochMs = (d) => {
  if (d instanceof Date) return d.getTime();
  const n = Number(d);
  if (!Number.isNaN(n)) return n; // already epoch
  const t = Date.parse(String(d ?? ""));
  return Number.isNaN(t) ? 0 : t;
};

/** small deterministic hash for content (avoid random for stable keys) */
const strHash = (s) => {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
  // force positive 32-bit
  return (h >>> 0).toString(36);
};

/** Pick a stable key */
const messageKey = (m, senderId) =>
  m.id ??
  m.clientId ??
  `${senderId}:${toEpochMs(m.date)}:${strHash(String(m.message || ""))}`;

/** REDIS AS SOURCE OF TRUTH: User resolution prioritizing Redis data */
const resolveUser = (users, candidateId, embedded, currentUser) => {
  console.log(`[UserResolve] Looking up ID: ${candidateId}, Available users:`, Object.keys(users || {}));
  
  // 1. Trust embedded data from Redis Streams (most accurate, includes historical snapshot)
  if (embedded && String(embedded.id) === String(candidateId)) {
    console.log(`[UserResolve] Using embedded Redis data for ${candidateId}: ${embedded.username}`);
    return embedded;
  }

  // 2. Try users state lookup (real-time data from Redis)
  const stateUser = users[candidateId] || users[String(candidateId)] || users[parseInt(candidateId)];
  if (stateUser && String(stateUser.id) === String(candidateId)) {
    console.log(`[UserResolve] Using state user for ${candidateId}: ${stateUser.username}`);
    return stateUser;
  }

  // 3. Fallback - Redis should be source of truth, no hardcoded overrides
  console.log(`[UserResolve] Using fallback for ${candidateId}`);
  return { id: candidateId, username: `User ${candidateId}` };
};

const sortMessages = (items) => {
  // Stable sort by (serverCreatedAt??date epoch, then id/key) ascending
  return [...items].sort((a, b) => {
    const ta = toEpochMs(a.serverCreatedAt ?? a.date);
    const tb = toEpochMs(b.serverCreatedAt ?? b.date);
    if (ta !== tb) return ta - tb;
    // tie-breaker on deterministic key to keep order stable
    const ka = String(a.id ?? a.clientId ?? a.message ?? "");
    const kb = String(b.id ?? b.clientId ?? b.message ?? "");
    return ka.localeCompare(kb);
  });
};

const MessageList = ({
  messageListElement,
  messages,
  room,
  onLoadMoreMessages,
  user,
  onUserClicked,
  users,
}) => {
  const currentUserId = normId(user?.id) ?? "";

  const hasMore = Boolean(
    // Prefer explicit hasMore if your backend provides it
    room?.hasMore ??
      // Fallback: if we've loaded at least a full page, allow loading more
      (room && typeof room.offset === "number" && room.offset >= MESSAGES_TO_LOAD)
  );

  const orderedMessages = useMemo(() => {
    if (!Array.isArray(messages)) return messages;
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
      ) : messages.length === 0 ? (
        <NoMessages />
      ) : (
        <div className="messages-list">
          {/* Load More */}
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

          {/* Messages */}
          {orderedMessages.map((message) => {
            if (message?.from === "info") {
              const infoKey = `info:${toEpochMs(message?.date)}:${strHash(String(message?.message || ""))}`;
              return <InfoMessage key={infoKey} message={message.message} />;
            }

            const senderId = normId(message?.from) ?? "";
            const key = messageKey(message, senderId);

            // SIMPLIFIED: Direct user assignment without complex lookups
            const isSelf = senderId === currentUserId;
            
            let displayUser;
            if (isSelf) {
              // For current user messages, always use the logged-in user data
              console.log(`[DEBUG] isSelf=true, user prop:`, user, `users state:`, users);
              displayUser = user; // Direct assignment, no lookup confusion
            } else {
              // For other user messages, resolve their data
              displayUser = resolveUser(users, senderId, message?.user);
            }

            console.log(`[Message] From: ${senderId}, Current: ${currentUserId}, Sender: ${displayUser?.username}, IsSelf: ${isSelf}`);

            const bubbleProps = {
              key,
              message: message.message,
              date: message.date,
              user: displayUser,
            };

            if (isSelf) {
              // Current user's message (right side)
              return (
                <ReceiverMessage
                  {...bubbleProps}
                  username={(bubbleProps.user && bubbleProps.user.username) || user?.username || "You"}
                />
              );
            }

            // Other user's message (left side)
            return (
              <SenderMessage
                {...bubbleProps}
                onUserClicked={() => onUserClicked && onUserClicked(senderId)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
export default MessageList;
