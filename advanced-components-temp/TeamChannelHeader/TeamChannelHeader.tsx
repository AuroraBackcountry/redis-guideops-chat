import { MouseEventHandler, useCallback, useState } from 'react';
import { Avatar, useChannelActionContext, useChannelStateContext, useChatContext } from 'stream-chat-react';

import { PinIcon } from '../../assets';
import { AddMemberButton } from '../AddMemberButton';
import { AddMemberModal } from '../AddMemberModal';
import { AllUsersModal } from '../AllUsersModal';
import { ArchivedChannelsList } from '../ArchivedChannelsList';

import { ChannelInfoIcon } from './ChannelInfoIcon';
import { AdminInfoPanel } from '../AdminInfoPanel/AdminInfoPanel';
import { ChannelInfoModal } from '../ChannelInfoModal/ChannelInfoModal';
import { useWorkspaceController } from '../../context/WorkspaceController';



export const TeamChannelHeader = () => {
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showChannelInfo, setShowChannelInfo] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showAllUsersModal, setShowAllUsersModal] = useState(false);
  const [showArchivedChannels, setShowArchivedChannels] = useState(false);
  
  const { displayWorkspace } = useWorkspaceController();
  const { client } = useChatContext();
  const { channel, watcher_count } = useChannelStateContext();
  const { closeThread } = useChannelActionContext();
  const { togglePinnedMessageListOpen } = useWorkspaceController();

  // Check if channel is private
  const isPrivate = channel?.data?.private || channel?.data?.invite_only;
  
  const channelIcon = isPrivate ? '🔒' : '#';
  const teamHeader = `${channelIcon} ${channel?.data?.name || channel?.data?.id || 'random'}`;


  const openChannelInfo = useCallback(() => {
    setShowChannelInfo(true);
  }, []);

  const openAdminPanel = useCallback(() => {
    setShowAdminPanel(true);
  }, []);

  const isAdmin = client.user?.role === 'admin' || client.user?.role === 'channel_moderator';

  const onPinIconClick: MouseEventHandler = useCallback((event) => {
    closeThread?.(event);
    togglePinnedMessageListOpen();
  }, [closeThread, togglePinnedMessageListOpen])

  const getMessagingHeader = () => {
    const members = Object.values(channel.state.members).filter(
      ({ user }) => user?.id !== client.userID,
    );
    const additionalMembers = members.length - 3;

    if (!members.length) {
      return (
        <div className='workspace-header__block'>
          <Avatar />
          <p className='team-channel-header__name user'>Johnny Blaze</p>
        </div>
      );
    }

    return (
      <div className='workspace-header__block'>
        {members.map(({ user }, i) => {
          if (i > 2) return null;
          return (
            <div key={i} className='workspace-header__block-item'>
              <Avatar image={user?.image} name={user?.name || user?.id} />
              <p className='team-channel-header__name user'>
                {user?.name || user?.id || 'Johnny Blaze'}
              </p>
            </div>
          );
        })}
        {additionalMembers > 0 && (
          <p className='team-channel-header__name user'>{`and ${additionalMembers} more`}</p>
        )}
      </div>
    );
  };

  const getWatcherText = (watchers?: number) => {
    if (!watchers) return 'No users online';
    if (watchers === 1) return '1 user online';
    return `${watchers} users online`;
  };

  return (
    <div className='team-channel-header__container'>
      {channel.type === 'messaging' ? (
        <div className='workspace-header__block'>
          {getMessagingHeader()}
          <button onClick={openChannelInfo} title='Channel Information'>
            <ChannelInfoIcon />
          </button>
        </div>
      ) : (
        <div className='workspace-header__block'>
          <div className='team-channel-header__name workspace-header__title'>{teamHeader}</div>
          <button onClick={openChannelInfo} title='Channel Information' className='channel-info-btn'>
            <ChannelInfoIcon />
          </button>
          <AddMemberButton 
            variant="text" 
            size="small" 
            onClick={() => setShowAddMemberModal(true)}
            className="team-channel-header__add-member"
          />
        </div>
      )}
      <div className='workspace-header__block'>
        <div className='workspace-header__subtitle'>{getWatcherText(watcher_count)}</div>
        <button
          className='workspace-header__subtitle'
          onClick={onPinIconClick}
        >
          <PinIcon />
          Pins
        </button>
        <button
          className='workspace-header__subtitle users-button'
          onClick={() => setShowAllUsersModal(true)}
          title='View All Users'
        >
          👥 Users
        </button>
        {isAdmin && (
          <>
            <button
              className='workspace-header__subtitle archived-button'
              onClick={() => {
                console.log('🎯 CLICKED ARCHIVED BUTTON - Testing if new code is running');
                setShowArchivedChannels(true);
              }}
              title='View Archived Channels'
            >
              📦 Archived
            </button>
            <button
              className='workspace-header__subtitle admin-button'
              onClick={openAdminPanel}
              title='Admin Panel - Settings, Policies, User Management'
            >
              ⚙️ Settings
            </button>
          </>
        )}
      </div>

      {showAdminPanel && isAdmin && (
        <AdminInfoPanel onClose={() => setShowAdminPanel(false)} />
      )}
      
      {showChannelInfo && (
        <ChannelInfoModal onClose={() => setShowChannelInfo(false)} />
      )}
      
      {showAddMemberModal && (
        <AddMemberModal 
          isOpen={showAddMemberModal}
          onClose={() => setShowAddMemberModal(false)} 
        />
      )}
      
      {showAllUsersModal && (
        <AllUsersModal 
          isOpen={showAllUsersModal}
          onClose={() => setShowAllUsersModal(false)} 
        />
      )}
      
      {showArchivedChannels && isAdmin && (
        <div className="archived-channels-overlay" onClick={() => setShowArchivedChannels(false)}>
          <div onClick={(e) => e.stopPropagation()}>
            <ArchivedChannelsList onClose={() => setShowArchivedChannels(false)} />
          </div>
        </div>
      )}
    </div>
  );
};
