import React, { useState, useCallback } from 'react';
import { UserInfoModal } from '../UserInfoModal/UserInfoModal';

interface UserClickHandlerProps {
  children: React.ReactNode;
}

export const UserClickHandler: React.FC<UserClickHandlerProps> = ({ children }) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const handleUserClick = useCallback((userId: string) => {
    setSelectedUserId(userId);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedUserId(null);
  }, []);

  // Create a context that child components can use
  return (
    <div className='user-click-handler'>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            onUserClick: handleUserClick,
          });
        }
        return child;
      })}
      
      {selectedUserId && (
        <UserInfoModal userId={selectedUserId} onClose={closeModal} />
      )}
    </div>
  );
};
