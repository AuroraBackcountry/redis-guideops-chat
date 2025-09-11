// @ts-check
import { useEffect, useRef, useState } from "react";
import { getEventSource, getMe, login, logOut } from "./api";
import axios from "axios";
import io from "socket.io-client";
import { parseRoomName } from "./utils";

/**
 * @param {import('./state').UserEntry} newUser
 */
const updateUser = (newUser, dispatch, infoMessage) => {
  dispatch({ type: "set user", payload: newUser });
  if (infoMessage !== undefined) {
    dispatch({
      type: "append message",
      payload: {
        id: "0",
        message: {
          /** Date isn't shown in the info message, so we only need a unique value */
          date: Math.random() * 10000,
          from: "info",
          message: infoMessage,
        },
      },
    });
  }
};

const onShowRoom = (room, username, dispatch) => dispatch({
  type: "add room",
  payload: {
    id: room.id,
    name: parseRoomName(room.names, username),
  },
});

const onMessage = (message, dispatch) => {
  /** Set user online */
  dispatch({
    type: "make user online",
    payload: message.from,
  });
  dispatch({
    type: "append message",
    payload: { id: message.roomId === undefined ? "0" : message.roomId, message },
  });
};

/** @returns {[SocketIOClient.Socket, boolean]} */
const useSocket = (user, dispatch) => {
  const [connected, setConnected] = useState(false);
  /** @type {React.MutableRefObject<SocketIOClient.Socket>} */
  const socketRef = useRef(null);
  const eventSourceRef = useRef(null);
  const socket = socketRef.current;

  /** First of all it's necessary to handle the socket io connection */
  useEffect(() => {
    if (user === null) {
      if (socket !== null) {
        socket.disconnect();
      }
      setConnected(false);
      if (eventSourceRef.current !== null) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    } else {

      if (eventSourceRef.current === null) {
        eventSourceRef.current = getEventSource();
        /** Handle non socket.io messages */
        eventSourceRef.current.onmessage = function (e) {
          const { type, data } = JSON.parse(e.data);
          switch (type) {
            case "user.connected": updateUser(data, dispatch, `${data.username} connected`);
              break;
            case "user.disconnected": updateUser(data, dispatch, `${data.username} left`);
              break;
            case "show.room": onShowRoom(data, user.username, dispatch);
              break;
            case 'message': onMessage(data, dispatch);
              break;
            default:
              break;
          }
        };
      }

      if (socket !== null) {
        socket.connect();
      } else {
        // Configure Socket.IO for split deployment
        const socketURL = process.env.NODE_ENV === 'production' 
          ? process.env.REACT_APP_API_URL || 'https://redis-guideops-chat-production.up.railway.app'
          : 'https://redis-guideops-chat-production.up.railway.app'; // Use live backend for local dev
        
        console.log(`[Socket.IO] Connecting to: ${socketURL || 'localhost'}`);
        socketRef.current = io(socketURL, {
          withCredentials: true,
          transports: ['websocket', 'polling']
        });
      }
      setConnected(true);
    }
  }, [user, socket, dispatch]);

  /**
   * Once we are sure the socket io object is initialized
   * Add event listeners.
   */
  useEffect(() => {
    if (connected && user) {
      socket.on("user.connected", (newUser) => updateUser(newUser, dispatch, `${newUser.username} connected`));
      socket.on("user.disconnected", (newUser) => updateUser(newUser, dispatch, `${newUser.username} left`));
      socket.on("show.room", (room) => {
        onShowRoom(room, user.username, dispatch);
      });
      socket.on("message", (message) => {
        onMessage(message, dispatch);
      });
    } else {
      /** If there was a log out, we need to clear existing listeners on an active socket connection */
      if (socket) {
        socket.off("user.connected");
        socket.off("user.disconnected");
        socket.off("user.room");
        socket.off("message");
      }
    }
  }, [connected, user, dispatch, socket]);

  return [socket, connected];
};

/** User management hook. */
const useUser = (onUserLoaded = (user) => { }, dispatch) => {
  const [loading, setLoading] = useState(true);
  /** @type {[import('./state.js').UserEntry | null, React.Dispatch<import('./state.js').UserEntry>]} */
  const [user, setUser] = useState(null);
  /** Callback used in log in form. */
  const onLogIn = (
    username = "",
    password = "",
    onError = (val = null) => { },
    onLoading = (loading = false) => { }
  ) => {
    onError(null);
    onLoading(true);
    login(username, password)
      .then((x) => {
        setUser(x);
      })
      .catch((e) => onError(e.message))
      .finally(() => onLoading(false));
  };

  /** Log out form */
  const onLogOut = async () => {
    console.log('[Logout] Logging out user');
    logOut().then(() => {
      console.log('[Logout] Server logout successful');
      setUser(null);
      // Clear localStorage on logout
      localStorage.removeItem('guideops_user');
      /** This will clear the store, to completely re-initialize an app on the next login. */
      dispatch({ type: "clear" });
      setLoading(true);
    }).catch((error) => {
      console.log('[Logout] Server logout failed, but clearing local session');
      setUser(null);
      localStorage.removeItem('guideops_user');
      dispatch({ type: "clear" });
      setLoading(true);
    });
  };

  /** Runs once when the component is mounted to check if there's user stored in session/localStorage */
  useEffect(() => {
    if (!loading) {
      return;
    }
    
    console.log('[Session] Checking for existing session...');
    
    // First try to get session from backend
    getMe().then((user) => {
      if (user) {
        console.log('[Session] Backend session valid:', user.username);
        setUser(user);
        setLoading(false);
        onUserLoaded(user);
      } else {
        console.log('[Session] No backend session, checking localStorage...');
        
        // Fallback: Check localStorage for user data
        try {
          const storedUser = localStorage.getItem('guideops_user');
          if (storedUser) {
            const userData = JSON.parse(storedUser);
            console.log('[Session] localStorage user found:', userData.username);
            
            // Verify stored user is still valid by trying a simple API call
            const BASE_URL = process.env.NODE_ENV === 'production' 
              ? process.env.REACT_APP_API_URL || 'https://redis-guideops-chat-production.up.railway.app'
              : 'https://redis-guideops-chat-production.up.railway.app';
            
            axios.get(`${BASE_URL}/users/online`)
              .then(() => {
                console.log('[Session] localStorage user still valid');
                setUser(userData);
                setLoading(false);
                onUserLoaded(userData);
              })
              .catch(() => {
                console.log('[Session] localStorage user expired, clearing...');
                localStorage.removeItem('guideops_user');
                setLoading(false);
              });
          } else {
            console.log('[Session] No stored user data');
            setLoading(false);
          }
        } catch (error) {
          console.log('[Session] Error reading localStorage:', error);
          localStorage.removeItem('guideops_user');
          setLoading(false);
        }
      }
    }).catch(error => {
      console.log('[Session] Error checking session:', error);
      setLoading(false);
    });
  }, [onUserLoaded, loading]);

  return { user, onLogIn, onLogOut, loading };
};

export {
  updateUser,
  useSocket,
  useUser
};