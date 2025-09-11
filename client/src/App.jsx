// @ts-check
import React, { useEffect, useCallback, useState } from "react";
import Login from "./components/Login";
import Chat from "./components/Chat";
// import { ChatRedisEnhanced } from "./components/Chat/ChatRedisEnhanced"; // Commented out for split deployment
import { getOnlineUsers, getRooms } from "./api";
import useAppStateContext, { AppContext } from "./state";
import moment from "moment";
import { parseRoomName } from "./utils";
import { LoadingScreen } from "./components/LoadingScreen";
import Navbar from "./components/Navbar";
import { useSocket, useUser } from "./hooks";
import "./styles/mobile-responsive.css";

const App = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  
  const {
    loading,
    user,
    state,
    dispatch,
    onLogIn,
    onMessageSend,
    onLogOut,
  } = useAppHandlers();

  if (loading) {
    return <LoadingScreen />;
  }

  const showLogin = !user;
  const currentRoom = state.rooms[state.currentRoom]?.name || "Chat";

  return (
    <AppContext.Provider value={[state, dispatch]}>
      <div
        className={`full-height ${showLogin ? "bg-light" : ""}`}
        style={{
          backgroundColor: !showLogin ? "#495057" : undefined,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <Navbar 
          sidebarOpen={showLogin ? false : sidebarOpen} 
          setSidebarOpen={setSidebarOpen}
          currentRoom={showLogin ? null : currentRoom}
          user={showLogin ? null : user}
          onLogOut={showLogin ? null : onLogOut}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
        />
        
        {/* Dropdown Menu - Outside navbar to prevent layout expansion */}
        {menuOpen && !showLogin && (
          <>
            <div 
              className="hamburger-dropdown"
              style={{
                position: 'fixed',
                top: '60px', // Just below navbar
                right: '8px',
                width: '175px',
                backgroundColor: '#fff',
                boxShadow: '0 0.5rem 1rem rgba(0,0,0,0.15)',
                border: '1px solid #e9ecef',
                borderRadius: '8px',
                zIndex: 9999
              }}
            >
              <div className="dropdown-header px-3 py-2" style={{ 
                borderBottom: '1px solid #f8f9fa',
                fontSize: '12px',
                fontWeight: '600',
                color: '#6c757d'
              }}>
                {user?.username || 'Menu'}
              </div>
              
              <button 
                className="dropdown-item d-flex align-items-center"
                onClick={() => {
                  alert('Profile settings coming soon!');
                  setMenuOpen(false);
                }}
                style={{ border: 'none', background: 'none', padding: '8px 16px' }}
              >
                <svg width="16" height="16" className="mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                Profile
              </button>
              
              <button 
                className="dropdown-item d-flex align-items-center"
                onClick={() => {
                  alert('Settings coming soon!');
                  setMenuOpen(false);
                }}
                style={{ border: 'none', background: 'none', padding: '8px 16px' }}
              >
                <svg width="16" height="16" className="mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.79a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
                </svg>
                Settings
              </button>
              
              <div className="dropdown-divider" style={{ margin: '8px 0', borderTop: '1px solid #f8f9fa' }} />
              
              <button 
                className="dropdown-item d-flex align-items-center text-danger"
                onClick={() => {
                  onLogOut();
                  setMenuOpen(false);
                }}
                style={{ border: 'none', background: 'none', padding: '8px 16px' }}
              >
                <svg width="16" height="16" className="mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9"/>
                </svg>
                Log Out
              </button>
            </div>
            
            {/* Backdrop to close menu */}
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.1)',
                zIndex: 9998
              }}
              onClick={() => setMenuOpen(false)}
            />
          </>
        )}
        
        {showLogin ? (
          <Login onLogIn={onLogIn} />
        ) : (
          <>
            {/* Basic Chat (current working version) */}
            <Chat 
              user={user} 
              onMessageSend={onMessageSend} 
              onLogOut={onLogOut}
              sidebarOpen={sidebarOpen}
              setSidebarOpen={setSidebarOpen}
            />
            
            {/* Enhanced Chat with Stream UI (Redis backend) - Uncomment to test */}
            {/* <ChatRedisEnhanced user={user} onMessageSend={onMessageSend} onLogOut={onLogOut} /> */}
          </>
        )}
      </div>
    </AppContext.Provider>
  );
};

const useAppHandlers = () => {
  const [state, dispatch] = useAppStateContext();
  const onUserLoaded = useCallback(
    (user) => {
      if (user !== null) {
        if (!state.users[user.id]) {
          dispatch({ type: "set user", payload: { ...user, online: true } });
        }
      }
    },
    [dispatch, state.users]
  );

  const { user, onLogIn, onLogOut, loading } = useUser(onUserLoaded, dispatch);
  const [socket, connected] = useSocket(user, dispatch);

  /** Socket joins specific rooms once they are added */
  useEffect(() => {
    if (user === null) {
      /** We are logged out */
      /** But it's necessary to pre-populate the main room, so the user won't wait for messages once he's logged in */
      return;
    }
    if (connected) {
      /**
       * The socket needs to be joined to the newly added rooms
       * on an active connection.
       */
      const newRooms = [];
      Object.keys(state.rooms).forEach((roomId) => {
        const room = state.rooms[roomId];
        if (room.connected) {
          return;
        }
        newRooms.push({ ...room, connected: true });
        socket.emit("room.join", room.id);
      });
      if (newRooms.length !== 0) {
        dispatch({ type: "set rooms", payload: newRooms });
      }
    } else {
      /**
       * It's necessary to set disconnected flags on rooms
       * once the client is not connected
       */
      const newRooms = [];
      Object.keys(state.rooms).forEach((roomId) => {
        const room = state.rooms[roomId];
        if (!room.connected) {
          return;
        }
        newRooms.push({ ...room, connected: false });
      });
      /** Only update the state if it's only necessary */
      if (newRooms.length !== 0) {
        dispatch({ type: "set rooms", payload: newRooms });
      }
    }
  }, [user, connected, dispatch, socket, state.rooms, state.users]);

  /** Populate default rooms when user is not null */
  useEffect(() => {
    /** @ts-ignore */
    if (Object.values(state.rooms).length === 0 && user !== null) {
      /** Load cached user data first, then fetch fresh data */
      // Load cached users immediately (no API delay)
      const cachedUsers = JSON.parse(localStorage.getItem('guideops_user_cache') || '{}');
      if (Object.keys(cachedUsers).length > 0) {
        dispatch({
          type: "append users",
          payload: cachedUsers,
        });
      }
      
      /** Then fetch online users and update cache */
      getOnlineUsers().then((users) => {
        dispatch({
          type: "append users",
          payload: users,
        });
        
        // Update cache with fresh data
        const updatedCache = { ...cachedUsers, ...users };
        localStorage.setItem('guideops_user_cache', JSON.stringify(updatedCache));
      });
      /** Then get rooms. */
      getRooms(user.id).then((rooms) => {
        const payload = [];
        rooms.forEach(({ id, names }) => {
          payload.push({ id, name: parseRoomName(names, user.username) });
        });
        /** Here we also can populate the state with default chat rooms */
        dispatch({
          type: "set rooms",
          payload,
        });
        dispatch({ type: "set current room", payload: "0" });
      });
    }
  }, [dispatch, state.rooms, user]);

  const onMessageSend = useCallback(
    (message, roomId) => {
      if (typeof message !== "string" || message.trim().length === 0) {
        return;
      }
      if (!socket) {
        /** Normally there shouldn't be such case. */
        console.error("Couldn't send message");
      }
      socket.emit("message", {
        roomId: roomId,
        message,
        from: user.id,
        date: moment(new Date()).unix(),
      });
    },
    [user, socket]
  );

  return {
    loading,
    user,
    state,
    dispatch,
    onLogIn,
    onMessageSend,
    onLogOut,
  };
};

export default App;
