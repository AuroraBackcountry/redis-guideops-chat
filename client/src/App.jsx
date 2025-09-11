// @ts-check
import React, { useEffect, useCallback, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import Login from "./components/Login";
import ChatPage from "./pages/ChatPage";
import ChannelsPage from "./pages/ChannelsPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import { getOnlineUsers, getRooms } from "./api";
import useAppStateContext, { AppContext } from "./state";
import moment from "moment";
import { parseRoomName } from "./utils";
import { LoadingScreen } from "./components/LoadingScreen";
import Navbar from "./components/Navbar";
import { useSocket, useUser } from "./hooks";
import "./styles/mobile-responsive.css";

// Main App Component with Router
const AppWithRouter = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

// App Content Component (inside Router context)
const AppContent = () => {
  const location = useLocation();
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
  const currentPage = location.pathname;

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
        {!showLogin && (
          <Navbar 
            currentPage={currentPage}
            user={user}
            onLogOut={onLogOut}
            menuOpen={menuOpen}
            setMenuOpen={setMenuOpen}
          />
        )}
        
        {/* Navigation Dropdown Menu */}
        {menuOpen && !showLogin && <NavigationDropdown 
          user={user} 
          onLogOut={onLogOut} 
          setMenuOpen={setMenuOpen} 
        />}
        
        {showLogin ? (
          <Login onLogIn={onLogIn} />
        ) : (
          <Routes>
            {/* Default route - redirect to general channel */}
            <Route path="/" element={<Navigate to="/chat/0" replace />} />
            
            {/* Chat routes */}
            <Route path="/chat/:roomId" element={
              <ChatPage 
                user={user} 
                onMessageSend={onMessageSend}
              />
            } />
            
            {/* Channels list */}
            <Route path="/channels" element={
              <ChannelsPage 
                user={user}
                rooms={state.rooms}
                dispatch={dispatch}
                currentRoom={state.currentRoom}
              />
            } />
            
            {/* Settings */}
            <Route path="/settings" element={
              <SettingsPage 
                user={user}
                onLogOut={onLogOut}
              />
            } />
            
            {/* Profile */}
            <Route path="/profile" element={
              <ProfilePage 
                user={user}
              />
            } />
          </Routes>
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

// Navigation Dropdown Component
const NavigationDropdown = ({ user, onLogOut, setMenuOpen }) => {
  const navigate = useNavigate();
  
  return (
    <>
      <div 
        className="hamburger-dropdown"
        style={{
          position: 'fixed',
          top: '60px',
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
            navigate('/profile');
            setMenuOpen(false);
          }}
          style={{ border: 'none', background: 'none', padding: '8px 16px', width: '100%' }}
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
            navigate('/settings');
            setMenuOpen(false);
          }}
          style={{ border: 'none', background: 'none', padding: '8px 16px', width: '100%' }}
        >
          <svg width="16" height="16" className="mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.79a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
          Settings
        </button>
        
        <button 
          className="dropdown-item d-flex align-items-center"
          onClick={() => {
            navigate('/channels');
            setMenuOpen(false);
          }}
          style={{ border: 'none', background: 'none', padding: '8px 16px', width: '100%' }}
        >
          <svg width="16" height="16" className="mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
          </svg>
          Channels
        </button>
        
        <div className="dropdown-divider" style={{ margin: '8px 0', borderTop: '1px solid #f8f9fa' }} />
        
        <button 
          className="dropdown-item d-flex align-items-center text-danger"
          onClick={() => {
            onLogOut();
            setMenuOpen(false);
          }}
          style={{ border: 'none', background: 'none', padding: '8px 16px', width: '100%' }}
        >
          <svg width="16" height="16" className="mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4m7 14l5-5-5-5m5 5H9"/>
          </svg>
          Log Out
        </button>
      </div>
      
      {/* Backdrop */}
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
  );
};

export default AppWithRouter;
