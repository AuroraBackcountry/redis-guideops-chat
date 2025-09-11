import React from 'react';
import { Attachment as DefaultAttachment } from 'stream-chat-react';
import type { AttachmentProps } from 'stream-chat-react';
import type { Attachment } from 'stream-chat';
import { LocationAttachment } from '../LocationAttachment';

// Type guard to check if attachment is a location attachment
const isLocationAttachment = (attachment: any): attachment is Attachment & {
  latitude: number;
  longitude: number;
} => {
  return typeof attachment.latitude === 'number' && 
         typeof attachment.longitude === 'number';
};

export const CustomAttachment: React.FC<AttachmentProps> = (props) => {
  const { attachments } = props;
  
  // Check if this is a location attachment
  if (attachments && attachments.length > 0) {
    const attachment = attachments[0];
    if (isLocationAttachment(attachment)) {
      return <LocationAttachment attachment={attachment} />;
    }
  }
  
  // Fall back to default attachment rendering for all other types
  return <DefaultAttachment {...props} />;
};
