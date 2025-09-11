import clsx from 'clsx';
import {useMemo, useState} from 'react';
import {
  AttachmentPreviewList,
  SendButton,
  TextareaComposer,
  useAttachmentManagerState,
  useComponentContext,
  useMessageComposer,
  useMessageComposerHasSendableData,
  useStateStore,
} from 'stream-chat-react';
import {useDropzone} from 'react-dropzone';

import {GiphyBadge} from './GiphyBadge';
import {MessageInputControlButton} from './MessageInputControls';
import {EmojiPicker} from './EmojiPicker';
import {useMessageInputCompositionControls} from './hooks/useMessageInputCompositionControls';
import type {CustomDataManagerState, MessageComposerConfig} from "stream-chat";
import {SendButtonIcon} from "./SendButtonIcon";
import {useGeolocation} from '../../hooks/useGeolocation';
import {LocationPermissionModal} from '../LocationPermissionModal';

// Import our Redis hooks
import { useRedisChannel, useRedisMessageInput } from '../../hooks/useRedisChat';

const attachmentManagerConfigStateSelector = (state: MessageComposerConfig) => ({
  acceptedFiles: state.attachments.acceptedFiles,
  multipleUploads: state.attachments.maxNumberOfFilesPerMessage > 1,
});

const customComposerDataSelector = (state: CustomDataManagerState) => ({
  activeFormatting: state.custom.activeFormatting,
  isComposingGiphyText: state.custom.command === 'giphy',
});

interface TeamMessageInputRedisProps {
  channelId: string;
  user?: any;
}

export const TeamMessageInputRedis: React.FC<TeamMessageInputRedisProps> = ({ channelId, user }) => {
  const { TypingIndicator } = useComponentContext();
  
  // Use our Redis hooks instead of Stream Chat
  const { channel } = useRedisChannel(channelId);
  const { handleSubmit, isUploading } = useRedisMessageInput(channelId);
  
  const {
    formatter,
    placeholder,
  } = useMessageInputCompositionControls();
  const messageComposer = useMessageComposer();
  const { acceptedFiles, multipleUploads } = useStateStore(
    messageComposer.configState,
    attachmentManagerConfigStateSelector,
  );
  const { activeFormatting, isComposingGiphyText } = useStateStore(messageComposer.customDataManager.state, customComposerDataSelector)
  const {isUploadEnabled } =  useAttachmentManagerState();
  const hasSendableData = useMessageComposerHasSendableData();
  const { getCurrentLocation, isLoading: isLocationLoading, error: locationError } = useGeolocation();
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Enhanced submit handler for Redis backend with AI detection
  const handleCustomSubmit = async (message: any) => {
    console.log('🔍 Redis custom submit handler called with:', message);
    console.log('🔍 Channel members:', channel?.state?.members);
    console.log('🔍 Channel ID:', channelId);
    
    // Check if this is a DM channel with AI Assistant
    const channelMembers = Object.keys(channel?.state?.members || {});
    const isAiChannel = channelMembers.includes('aurora-ai-assistant') && channelMembers.length === 2;
    
    console.log('🔍 Is AI channel?', isAiChannel);
    
    if (isAiChannel && message.text) {
      console.log('🤖 Intercepting message to AI Assistant:', message.text);
      
      // Send user message to Redis first (so it appears immediately)
      await handleSubmit(message);
      
      // Then handle AI streaming response via FastAPI
      try {
        console.log('🌊 Starting FastAPI streaming response...');
        
        // Start streaming response from FastAPI
        const response = await fetch('http://127.0.0.1:3002/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: message.text,
            user_id: user?.id || 'unknown',
            user_name: user?.first_name && user?.last_name 
              ? `${user.first_name} ${user.last_name}`
              : user?.username || 'Unknown User',
            user_email: user?.email || 'unknown@example.com'
          }),
        });
        
        if (response.ok && response.body) {
          console.log('✅ FastAPI streaming connected');
          
          // Process Server-Sent Events
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let aiMessageId = null;
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() || '';
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.substring(6));
                    
                    if (data.type === 'message_update' && data.text) {
                      if (!aiMessageId) {
                        // Send first AI message to Redis
                        const aiResponse = await fetch(`/api/channels/${channelId}/messages`, {
                          method: 'POST',
                          headers: { 
                            'Content-Type': 'application/json',
                            'credentials': 'include'
                          },
                          body: JSON.stringify({
                            text: data.text,
                            message_type: 'ai_response',
                            user_id: 'aurora-ai-assistant'
                          })
                        });
                        const aiResult = await aiResponse.json();
                        aiMessageId = aiResult.id;
                        console.log('📤 Sent first AI streaming message');
                      } else {
                        // Update existing AI message
                        try {
                          await fetch(`/api/messages/${aiMessageId}`, {
                            method: 'PUT',
                            headers: { 
                              'Content-Type': 'application/json',
                              'credentials': 'include'
                            },
                            body: JSON.stringify({
                              text: data.text,
                              channel_id: channelId
                            })
                          });
                          console.log('📝 Updated AI message:', data.word_count, 'words');
                        } catch (updateError) {
                          console.log('⚠️ Update failed, continuing...');
                        }
                      }
                    } else if (data.type === 'message_complete') {
                      console.log('✅ AI streaming complete');
                      // Final update with complete message
                      if (aiMessageId) {
                        try {
                          await fetch(`/api/messages/${aiMessageId}`, {
                            method: 'PUT',
                            headers: { 
                              'Content-Type': 'application/json',
                              'credentials': 'include'
                            },
                            body: JSON.stringify({
                              text: data.text,
                              channel_id: channelId
                            })
                          });
                        } catch (finalError) {
                          console.log('⚠️ Final update failed, message is complete anyway');
                        }
                      }
                      break;
                    }
                  } catch (parseError) {
                    console.log('⚠️ SSE parse error:', parseError);
                  }
                }
              }
            }
          } finally {
            // Cleanup if needed
          }
          
          console.log('🎉 FastAPI AI streaming completed');
        } else {
          console.error('❌ FastAPI streaming failed');
          // Send error message as AI
          await fetch(`/api/channels/${channelId}/messages`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'credentials': 'include'
            },
            body: JSON.stringify({
              text: 'Sorry, I\'m having trouble processing your message right now.',
              message_type: 'ai_response',
              user_id: 'aurora-ai-assistant'
            })
          });
        }
      } catch (error) {
        console.error('❌ FastAPI streaming error:', error);
        // Send error message as AI
        await fetch(`/api/channels/${channelId}/messages`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'credentials': 'include'
          },
          body: JSON.stringify({
            text: 'I\'m currently offline. Please try again later.',
            message_type: 'ai_response',
            user_id: 'aurora-ai-assistant'
          })
        });
      }
      
      return; // Don't send through normal Redis flow again
    }
    
    // For non-AI channels, use normal Redis submit
    return handleSubmit(message);
  };

  const handleLocationButtonClick = () => {
    setShowLocationModal(true);
  };

  const handleLocationShare = async () => {
    setShowLocationModal(false);
    try {
      const location = await getCurrentLocation();
      
      // Create a location attachment
      const locationAttachment = {
        type: 'location',
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        timestamp: location.timestamp,
        title: 'Location',
        title_link: `https://maps.google.com/?q=${location.latitude},${location.longitude}`,
        text: `${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`,
        fallback: `Location: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
      };

      // Send message with location attachment directly to Redis
      await fetch(`/api/channels/${channelId}/messages`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'credentials': 'include'
        },
        body: JSON.stringify({
          text: '📍 Shared location',
          attachments: [locationAttachment]
        })
      });
    } catch (error) {
      console.error('Failed to get location:', error);
    }
  };

  const handleLocationCancel = () => {
    setShowLocationModal(false);
  };

  const accept = useMemo(
    () =>
      acceptedFiles.reduce<Record<string, Array<string>>>((mediaTypeMap, mediaType) => {
        mediaTypeMap[mediaType] ??= [];
        return mediaTypeMap;
      }, {}),
    [acceptedFiles],
  );

  const { getRootProps, isDragActive, isDragReject } = useDropzone({
    accept,
    disabled: !isUploadEnabled,
    multiple: multipleUploads,
    noClick: true,
    onDrop: messageComposer.attachmentManager.uploadFiles,
  });
  
  return (
    <div {...getRootProps({ className: clsx(`team-message-input__wrapper`) })}>
      {isDragActive && (
        <div
          className={clsx('str-chat__dropzone-container', {
            'str-chat__dropzone-container--not-accepted': isDragReject,
          })}
        >
          {!isDragReject && <p>Drag your files here</p>}
          {isDragReject && <p>Some of the files will not be accepted</p>}
        </div>
      )}
      <div className='team-message-input__input'>
        <div className='team-message-input__top'>
          <AttachmentPreviewList />
          <div className='team-message-input__form'>
            {isComposingGiphyText && <GiphyBadge />}
            <TextareaComposer placeholder={placeholder} />

            <SendButton disabled={!hasSendableData || isUploading} sendMessage={handleCustomSubmit} />
          </div>
        </div>
        <div className='team-message-input__bottom'>
          <EmojiPicker />
          <MessageInputControlButton
            type='attachment'
            onClick={() => {
              const input = document.createElement('input');
              input.type = 'file';
              input.multiple = multipleUploads;
              // Restrict to web-compatible formats for better preview support
              input.accept = 'image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml,application/pdf,text/*,audio/*,video/*';
              input.onchange = (e) => {
                const files = Array.from((e.target as HTMLInputElement).files || []);
                if (files.length) {
                  messageComposer.attachmentManager.uploadFiles(files);
                }
              };
              input.click();
            }}
          />
          <MessageInputControlButton
            type='bold'
            active={activeFormatting === 'bold'}
            onClick={formatter.bold}
          />
          <MessageInputControlButton
            type='italics'
            active={activeFormatting === 'italics'}
            onClick={formatter.italics}
          />
          <MessageInputControlButton
            type='strikethrough'
            active={activeFormatting === 'strikethrough'}
            onClick={formatter['strikethrough']}
          />
          <MessageInputControlButton
            type='code'
            active={activeFormatting === 'code'}
            onClick={formatter.code}
          />
          <MessageInputControlButton
            type='location'
            active={isLocationLoading}
            onClick={handleLocationButtonClick}
          />
        </div>
      </div>
      {TypingIndicator && <TypingIndicator />}
      <LocationPermissionModal
        isOpen={showLocationModal}
        onClose={handleLocationCancel}
        onAllow={handleLocationShare}
        onDeny={handleLocationCancel}
        error={locationError?.message}
      />
    </div>
  );
};

export const ThreadMessageInputRedis = ({ channelId, user }: TeamMessageInputRedisProps) => {
  const { handleSubmit, isUploading } = useRedisMessageInput(channelId);
  const messageComposer = useMessageComposer();
  const hasSendableData = useMessageComposerHasSendableData();
  const { isComposingGiphyText } = useStateStore(messageComposer.customDataManager.state, customComposerDataSelector)
  
  return (
    <div className='thread-message-input__wrapper'>
      <div className='thread-message-input__input'>
        {isComposingGiphyText && <GiphyBadge/>}
        <TextareaComposer placeholder='Reply'/>
        <EmojiPicker/>

        <button
          className='thread-message-input__send-button'
          disabled={!hasSendableData || isUploading}
          onClick={handleSubmit}
        >
          <SendButtonIcon/>
        </button>
      </div>
    </div>
  );
};
