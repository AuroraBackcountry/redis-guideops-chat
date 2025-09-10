import { Avatar, ChannelPreviewUIComponentProps, useChatContext } from 'stream-chat-react';
import { UnreadIndicator } from './UnreadIndicator';

type DirectMessagingChannelPreviewProps = Pick<ChannelPreviewUIComponentProps, 'channel'>;

export const DirectMessagingChannelPreview = ({channel}: DirectMessagingChannelPreviewProps) => {
  const { client } = useChatContext();

  // Add safety checks for channel and members
  if (!channel || !channel.state || !channel.state.members) {
    return (
      <div className='channel-preview__item single' title="Loading...">
        <Avatar />
        <p>Loading...</p>
      </div>
    );
  }

  const members = Object.values(channel.state.members).filter(
    (member) => member?.user?.id !== client.userID,
  );
  const defaultName = 'Unknown User';
  let displayText;

  if (!members.length || members.length === 1) {
    const member = members[0];
    displayText = member?.user?.name || member?.user?.id || defaultName;
    return (
      <div className='channel-preview__item single direct-message' title={displayText}>
        <Avatar
          image={member?.user?.image}
          name={member?.user?.name || member?.user?.id}
        />
        <p>{displayText}</p>
        <UnreadIndicator channel={channel} />
      </div>
    );
  }

  displayText = [
      (members[0]?.user?.name || members[0]?.user?.id || defaultName),
      (members[1]?.user?.name || members[1]?.user?.id || defaultName)
  ].join(' ');
  return (
    <div className='channel-preview__item multi direct-message' title={displayText}>
        <span>
          <Avatar
            image={members[0]?.user?.image}
            name={members[0]?.user?.name || members[0]?.user?.id}
          />
        </span>
      <Avatar
        image={members[1]?.user?.image}
        name={members[1]?.user?.name || members[1]?.user?.id}
      />
      <p>{displayText}</p>
      <UnreadIndicator channel={channel} />
    </div>
  );
};