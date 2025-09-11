import 'stream-chat';


export type MessageInputFormattingType =  'bold' | 'italics' | 'code' | 'strikethrough';
export type MessageInputControlType = 'emoji' | 'attachment' | 'location' | MessageInputFormattingType;

declare module 'stream-chat' {
  interface CustomChannelData {
    name?: string;
    demo?: string;
    private?: boolean;
    invite_only?: boolean;
    created_by_admin?: boolean;
    // Removed custom archive properties - using Stream native disabled/hidden instead
  }

  interface CustomMessageComposerData {
    command: 'giphy' | null;
    activeFormatting: MessageInputFormattingType | null;
  }

  interface AttachmentData {
    // Location attachment data
    latitude?: number;
    longitude?: number;
    address?: string;
    accuracy?: number;
    timestamp?: number;
  }

  interface Attachment extends AttachmentData {
    // This extends the base Attachment type with our location fields
  }
}