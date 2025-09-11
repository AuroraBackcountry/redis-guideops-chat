import clsx from 'clsx';
import React, {ElementRef, useMemo, useRef, useState} from 'react';
import {
  Avatar,
  DialogAnchor,
  EditMessageForm,
  isOnlyEmojis,
  MESSAGE_ACTIONS,
  MessageActions,
  MessageDeleted,
  MessageInput,
  MessageRepliesCountButton,
  MessageStatus,
  MessageTimestamp,
  ReactionIcon,
  ReactionSelector,
  ReactionsList,
  renderText as defaultRenderText,
  showMessageActionsBox,
  ThreadIcon,
  useDialog,
  useDialogIsOpen,
  useTranslationContext,
} from 'stream-chat-react';

import {PinIndicator} from './PinIndicator';
import {UserInfoModal} from '../UserInfoModal/UserInfoModal';
import {useWorkspaceController} from '../../context/WorkspaceController';
import {CustomAttachment} from '../CustomAttachment';
import {ErrorIcon} from "./icons";

// Import our Redis hooks instead of Stream Chat
import { useRedisMessage } from '../../hooks/useRedisChat';

interface TeamMessageRedisProps {
  message: any;
  channel?: any;
  user?: any;
}

export const TeamMessageRedis: React.FC<TeamMessageRedisProps> = ({ message, channel, user }) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  // Use our Redis message hook instead of Stream Chat's
  const {
    isMyMessage,
    getMessageActions,
    handleAction,
    handleRetry,
    groupStyles,
    editing,
    clearEditingState,
    initialMessage,
    threadList,
    onMentionsClickMessage,
    onMentionsHoverMessage,
    onUserClick,
    onUserHover,
    handleOpenThread,
    renderText = defaultRenderText
  } = useRedisMessage(message);

  // Custom user click handler for our user info modal
  const handleCustomUserClick = (userId: string) => {
    setSelectedUserId(userId);
  };

  const closeUserModal = () => {
    setSelectedUserId(null);
  };

  const { t, userLanguage } = useTranslationContext('MessageTeam');

  const messageActions = getMessageActions();
  const showActionsBox = showMessageActionsBox(messageActions);

  const shouldShowReplies = messageActions.indexOf(MESSAGE_ACTIONS.reply) > -1 && !threadList;
  const canReact = messageActions.indexOf(MESSAGE_ACTIONS.react) > -1;

  // Handle message text with simple fallback for Redis messages
  const messageTextToRender = message.text || '';
  const messageMentionedUsersItem = message.mentioned_users || [];

  const messageText = useMemo(() => renderText(messageTextToRender, messageMentionedUsersItem), [
    messageMentionedUsersItem,
    messageTextToRender,
    renderText,
  ]);

  const { closePinnedMessageListOpen } = useWorkspaceController();
  const handleOpenThreadCustom = (event: React.BaseSyntheticEvent) => {
    closePinnedMessageListOpen();
    handleOpenThread(event);
  };

  const firstGroupStyle = groupStyles ? groupStyles[0] : 'single';

  const buttonRef = useRef<ElementRef<'button'>>(null);
  const reactionSelectorDialogId = `reaction-selector--${message.id}`;
  const reactionSelectorDialog = useDialog({ id: reactionSelectorDialogId });
  const reactionSelectorDialogIsOpen = useDialogIsOpen(reactionSelectorDialogId);
  const messageActionsDialogIsOpen = useDialogIsOpen(`message-actions--${message.id}`);

  // Handle deleted messages
  if (message.deleted_at) {
    return <MessageDeleted message={message} />;
  }

  // Handle editing mode
  if (editing) {
    return (
      <div
        className={`str-chat__message-team str-chat__message-team--${firstGroupStyle} str-chat__message-team--editing`}
        data-testid='message-team-edit'
      >
        {(firstGroupStyle === 'top' || firstGroupStyle === 'single') && (
          <div className='str-chat__message-team-meta'>
            <Avatar
              image={message.user?.avatar_url}
              name={message.user?.first_name || message.user?.username || message.user?.id}
              onClick={onUserClick}
              onMouseOver={onUserHover}
            />
          </div>
        )}
        <MessageInput
          clearEditingState={clearEditingState}
          Input={EditMessageForm}
        />
      </div>
    );
  }

  const rootClass = clsx(
    'str-chat__message',
    'str-chat__message-team',
    `str-chat__message-team--${firstGroupStyle}`,
    {
      'pinned-message': message.pinned,
      [`str-chat__message-team--${message.status}`]: message.status,
      [`str-chat__message-team--${message.message_type}`]: message.message_type,
      'str-chat__message--has-attachment': !!message.attachments?.length,
      'threadList': threadList,
    },
  );

  return (
    <div className={message.pinned ? 'pinned-message' : 'unpinned-message'}>
      {message.pinned && <PinIndicator message={message}/>}
      <div
        className={rootClass}
        data-testid='message-team'
      >
        <div className='avatar-host'>
          {firstGroupStyle === 'top' || firstGroupStyle === 'single' || initialMessage ? (
            <Avatar
              image={message.user?.avatar_url}
              name={message.user?.first_name || message.user?.username || message.user?.id}
              onClick={onUserClick}
              onMouseOver={onUserHover}
            />
          ) : (
            <div data-testid='team-meta-spacer' style={{marginRight: 0, width: 34}}/>
          )}
        </div>
        <div className='str-chat__message-team-group'>
          {(firstGroupStyle === 'top' || firstGroupStyle === 'single' || initialMessage) && (
            <div className='str-chat__message-team-meta'>
              <div
                className='str-chat__message-team-author'
                data-testid='message-team-author'
                onClick={() => handleCustomUserClick(message.user?.id || '')}
                style={{ cursor: 'pointer' }}
                title='Click to view user info'
              >
                <strong>
                  {message.user?.first_name && message.user?.last_name 
                    ? `${message.user.first_name} ${message.user.last_name}`
                    : message.user?.username || message.user?.id
                  }
                </strong>
                {message.message_type === 'error' && (
                  <div className='str-chat__message-team-error-header'>
                    Only visible to you
                  </div>
                )}
              </div>
              <MessageTimestamp />
            </div>
          )}
          <div
            className={`str-chat__message-team-content str-chat__message-team-content--${firstGroupStyle} str-chat__message-team-content--${
              message.text === '' ? 'image' : 'text'
            }`}
            data-testid='message-team-content'
          >
            {!initialMessage &&
              message.status !== 'sending' &&
              message.status !== 'failed' &&
              message.message_type !== 'system' &&
              message.message_type !== 'ephemeral' &&
              message.message_type !== 'error' && (
                <div
                  className={clsx(`str-chat__message-team-actions`, {'str-chat__message-team-actions--active': reactionSelectorDialogIsOpen || messageActionsDialogIsOpen})}
                  data-testid='message-team-actions'
                >
                  {canReact && (
                    <>
                      <DialogAnchor
                        id={reactionSelectorDialogId}
                        placement='top-end'
                        referenceElement={buttonRef.current}
                        trapFocus
                      >
                        <ReactionSelector />
                      </DialogAnchor>
                      <button
                        aria-expanded={reactionSelectorDialogIsOpen}
                        aria-label="Open Reaction Selector"
                        className='str-chat__message-reactions-button'
                        data-testid='message-reaction-action'
                        onClick={() => reactionSelectorDialog?.toggle()}
                        ref={buttonRef}
                      >
                        <ReactionIcon className='str-chat__message-action-icon' />
                      </button>
                    </>
                    )}
                  {shouldShowReplies && (
                    <span
                      data-testid='message-team-thread-icon'
                      onClick={handleOpenThreadCustom}
                      title='Start a thread'
                    >
                      <ThreadIcon/>
                    </span>
                  )}
                  {showActionsBox && (
                    <MessageActions inline/>
                  )}
                </div>
              )}
            {message.text && (<div
                className={clsx('str-chat__message-team-text', {'str-chat__message-team-text--is-emoji': isOnlyEmojis(message.text)})}
                data-testid='message-team-message'
                onClick={onMentionsClickMessage}
                onMouseOver={onMentionsHoverMessage}
              >
                {messageText}
              </div>
            )}
            {!message.text && message.attachments?.length ? (
              <CustomAttachment actionHandler={handleAction} attachments={message.attachments}/>
            ) : null}
            {message.reactions && Object.keys(message.reactions).length > 0 && message.text !== '' && canReact && (
              <ReactionsList/>
            )}
            {message.status === 'failed' && (
              <button
                className='str-chat__message-team-failed'
                data-testid='message-team-failed'
                onClick={message.error?.status !== 403 ? () => handleRetry(message) : undefined}
              >
                <ErrorIcon/>
                {message.error?.status !== 403
                  ? 'Message Failed · Click to try again'
                  : 'Message Failed · Unauthorized'}
              </button>
            )}
          </div>
          <MessageStatus messageType='team'/>
          {message.text && message.attachments?.length ? (
            <CustomAttachment actionHandler={handleAction} attachments={message.attachments}/>
          ) : null}
          {message.reactions &&
            Object.keys(message.reactions).length > 0 &&
            message.text === '' &&
            canReact && <ReactionsList/>}
          {!threadList && (
            <MessageRepliesCountButton
              onClick={handleOpenThreadCustom}
              reply_count={message.reply_count}
            />
          )}
        </div>
      </div>
      
      {selectedUserId && (
        <UserInfoModal userId={selectedUserId} onClose={closeUserModal} />
      )}
    </div>
  );
};
