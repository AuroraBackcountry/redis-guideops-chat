// @ts-check

import { getUsers } from "./api";

/**
 * @param {string[]} names
 * @param {string} username
 */
export const parseRoomName = (names, username) => {
  for (let name of names) {
    if (typeof name !== 'string') {
      name = name[0];
    }
    if (name !== username) {
      return name;
    }
  }
  return names[0];
};

/** Get an avatar for a room or a user */
export const getAvatarByUserAndRoomId = (roomId = "1") => {
  const TOTAL_IMAGES = 13;
  const seed1 = 654;
  const seed2 = 531;

  const uidParsed = +roomId.split(":").pop();
  let roomIdParsed = +roomId.split(":").reverse().pop();
  if (roomIdParsed < 0) {
    roomIdParsed += 3555;
  }

  const theId = (uidParsed * seed1 + roomIdParsed * seed2) % TOTAL_IMAGES;

  return `${process.env.PUBLIC_URL}/avatars/${theId}.jpg`;
};

const jdenticon = require("jdenticon");

const avatars = {};
export const getAvatar = (username) => {
  let av = avatars[username];
  if (av === undefined) {
    av =
      "data:image/svg+xml;base64," + window.btoa(jdenticon.toSvg(username, 50));
    avatars[username] = av;
  }
  return av;
};

// Persistent user cache using localStorage
const USER_CACHE_KEY = 'guideops_user_cache';

const getUserCache = () => {
  try {
    const cached = localStorage.getItem(USER_CACHE_KEY);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
};

const setUserCache = (users) => {
  try {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(users));
  } catch {
    // Ignore localStorage errors
  }
};

export const populateUsersFromLoadedMessages = async (users, dispatch, messages) => {
  // Get cached user data first
  const cachedUsers = getUserCache();
  
  const userIds = {};
  messages.forEach((message) => {
    userIds[message.from] = 1;
  });

  const ids = Object.keys(userIds).filter(
    (id) => users[id] === undefined && !cachedUsers[id]
  );

  // First, use cached data if available
  const cachedUsersToAdd = {};
  Object.keys(userIds).forEach(id => {
    if (users[id] === undefined && cachedUsers[id]) {
      cachedUsersToAdd[id] = cachedUsers[id];
    }
  });

  if (Object.keys(cachedUsersToAdd).length > 0) {
    dispatch({
      type: "append users",
      payload: cachedUsersToAdd,
    });
  }

  // Then fetch any remaining missing users
  if (ids.length !== 0) {
    const newUsers = await getUsers(ids);
    
    // Update cache with new users
    const allUsers = { ...cachedUsers, ...newUsers };
    setUserCache(allUsers);
    
    dispatch({
      type: "append users",
      payload: newUsers,
    });
  }
};