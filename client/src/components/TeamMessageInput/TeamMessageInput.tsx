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
  useMessageInputContext,
  useStateStore,
  useChatContext,
} from 'stream-chat-react';
import {useDropzone} from 'react-dropzone';

import {GiphyBadge} from './GiphyBadge';
import {MessageInputControlButton} from './MessageInputControls';
import {EmojiPicker} from './EmojiPicker';
import {useMessageInputCompositionControls} from './hooks/useMessageInputCompositionControls';
import type {CustomDataManagerState, MessageComposerConfig} from "stream-chat";
import {SendButtonIcon} from "./SendButtonIcon";
import {useGeolocation} from '../../hooks/useGeolocation';
import {useChannelStateContext, useChatContext} from 'stream-chat-react';
import {LocationPermissionModal} from '../LocationPermissionModal';

const attachmentManagerConfigStateSelector = (state: MessageComposerConfig) => ({
  acceptedFiles: state.attachments.acceptedFiles,
  multipleUploads: state.attachments.maxNumberOfFilesPerMessage > 1,
});

const customComposerDataSelector = (state: CustomDataManagerState) => ({
  activeFormatting: state.custom.activeFormatting,
  isComposingGiphyText: state.custom.command === 'giphy',
});

export const TeamMessageInput = () => {
  const { TypingIndicator } = useComponentContext();
  const { client } = useChatContext();
  const { handleSubmit } = useMessageInputContext();
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
  const { channel } = useChannelStateContext();
  const [showLocationModal, setShowLocationModal] = useState(false);

  // Custom submit handler to intercept messages to Elrich
  const handleCustomSubmit = async (message: any) => {
    console.log('🔍 Custom submit handler called with:', message);
    console.log('🔍 Channel members:', Object.keys(channel.state.members || {}));
    console.log('🔍 Channel ID:', channel.id);
    
    // Check if this is a DM channel with Elrich
    const channelMembers = Object.keys(channel.state.members || {});
    const isElrichChannel = channelMembers.includes('aurora-ai-assistant') && channelMembers.length === 2;
    
    console.log('🔍 Is Elrich channel?', isElrichChannel);
    
    if (isElrichChannel && message.text) {
      console.log('🤖 Intercepting message to Elrich:', message.text);
      
      // Send user message to chat first (so it appears immediately)
      await handleSubmit(message);
      
      // Then handle Elrich's streaming response via FastAPI
      try {
        console.log('🌊 Starting FastAPI streaming response...');
        
        // Show Elrich typing immediately
        await channel.keystroke({ user_id: 'aurora-ai-assistant' });
        
        // Start streaming response from FastAPI
        const response = await fetch('http://localhost:3002/chat', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: message.text,
            user_id: client.userID,
            user_name: client.user?.name || 'Unknown User',
            user_email: client.user?.email || 'unknown@example.com'
          }),
        });
        
        if (response.ok && response.body) {
          console.log('✅ FastAPI streaming connected');
          
          // Process Server-Sent Events
          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let elrichMessage = null;
          
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
                      if (!elrichMessage) {
                        // Stop typing and send first message
                        await channel.stopTyping({ user_id: 'aurora-ai-assistant' });
                        elrichMessage = await channel.sendMessage({
                          text: data.text,
                          user_id: 'aurora-ai-assistant'
                        });
                        console.log('📤 Sent first streaming message');
                      } else {
                        // Update existing message using client
                        try {
                          await client.updateMessage({
                            ...elrichMessage.message,
                            text: data.text
                          });
                          console.log('📝 Updated message:', data.word_count, 'words');
                        } catch (updateError) {
                          console.log('⚠️ Update failed, continuing...');
                        }
                      }
                    } else if (data.type === 'message_complete') {
                      console.log('✅ Streaming complete');
                      // Final update with complete message
                      if (elrichMessage) {
                        try {
                          await client.updateMessage({
                            ...elrichMessage.message,
                            text: data.text
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
            await channel.stopTyping({ user_id: 'aurora-ai-assistant' });
          }
          
          console.log('🎉 FastAPI streaming completed');
        } else {
          console.error('❌ FastAPI streaming failed');
          await channel.stopTyping({ user_id: 'aurora-ai-assistant' });
          await channel.sendMessage({
            text: 'Sorry, I\'m having trouble processing your message right now.',
            user_id: 'aurora-ai-assistant'
          });
        }
      } catch (error) {
        console.error('❌ FastAPI streaming error:', error);
        await channel.stopTyping({ user_id: 'aurora-ai-assistant' });
        await channel.sendMessage({
          text: 'I\'m currently offline. Please try again later.',
          user_id: 'aurora-ai-assistant'
        });
      }
      
      return; // Don't send through normal Stream flow again
    }
    
    // For non-Elrich channels, use normal submit
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

      // Send message with location attachment directly
      await channel.sendMessage({
        text: '📍 Shared location',
        attachments: [locationAttachment]
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

            <SendButton disabled={!hasSendableData} sendMessage={handleCustomSubmit} />
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

export const ThreadMessageInput = () => {
  const { handleSubmit } = useMessageInputContext();
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
          disabled={!hasSendableData}
          onClick={handleSubmit}
        >
          <SendButtonIcon/>
        </button>
      </div>
    </div>
  );
};