import { ChannelPreviewUIComponentProps } from 'stream-chat-react';
import { UnreadIndicator } from './UnreadIndicator';

interface TeamChannelPreviewProps {
  name: string;
  channel?: ChannelPreviewUIComponentProps['channel'];
}

export const TeamChannelPreview = ({name, channel}: TeamChannelPreviewProps) => {
  // Check if channel is private based on Stream SDK properties
  const isPrivate = channel?.data?.private || channel?.data?.invite_only;
  
  const icon = isPrivate ? '🔒' : '#';
  
  return (
    <div className='channel-preview__item team-channel' title={`${isPrivate ? 'Private' : 'Public'} channel: ${name}`}>
      <p>{`${icon} ${name}`}</p>
      <UnreadIndicator channel={channel} />
    </div>
  );
};