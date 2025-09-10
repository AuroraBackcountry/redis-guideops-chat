import React from 'react';
import {
  defaultPinPermissions,
  MessageInput,
  MessageList,
  PinEnabledUserRoles,
  Thread,
  Window,
} from 'stream-chat-react';

import {PinnedMessageList} from '../PinnedMessageList/PinnedMessageList';
import {TeamChannelHeader} from '../TeamChannelHeader/TeamChannelHeader';
import {ThreadMessageInput} from "../TeamMessageInput/TeamMessageInput";

export const ChannelInner = () => {
  // todo: migrate to channel capabilities once migration guide is available
  const teamPermissions: PinEnabledUserRoles = { ...defaultPinPermissions.team, user: true };
  const messagingPermissions: PinEnabledUserRoles = {
    ...defaultPinPermissions.messaging,
    user: true,
  };

  const pinnedPermissions = {
    ...defaultPinPermissions,
    team: teamPermissions,
    messaging: messagingPermissions,
  };

  // Enable message actions including delete
  const messageActions = ['delete', 'edit', 'flag', 'mute', 'pin', 'react', 'reply'];

  return (
      <>
        <Window>
          <TeamChannelHeader />
          <MessageList 
            disableQuotedMessages={true} 
            pinPermissions={pinnedPermissions}
            messageActions={messageActions}
          />
          <MessageInput minRows={1} maxRows={8} />
        </Window>
        <Thread additionalMessageInputProps={{ maxRows: 8, minRows: 1, Input: ThreadMessageInput }} />
        <PinnedMessageList />
    </>
  );
};
