import React, { useCallback } from 'react';
import { ChannelList, useChatContext } from 'stream-chat-react';

import {
    EmptyDMChannelListIndicator,
    EmptyGroupChannelListIndicator
} from "./EmptyChannelListIndicator";
import { ChannelSearch } from '../ChannelSearch/ChannelSearch';
import { TeamChannelList } from '../TeamChannelList/TeamChannelList';
import { ChannelPreview } from '../ChannelPreview/ChannelPreview';
import { UserProfileMenu } from '../UserProfileMenu';
import { useWorkspaceController } from '../../context/WorkspaceController';

import { CompanyLogo } from './icons';

import type { Channel, ChannelFilters } from 'stream-chat';
import { ChannelSort } from 'stream-chat';



const TeamChannelsList = () => {
  const { client } = useChatContext();
  
  // Simplified filters - show channels user has access to
  const filters: ChannelFilters = {
    type: 'team',
    members: { $in: [client.userID!] } // Only show channels user is a member of
  };

  return (
    <ChannelList
      channelRenderFilterFn={customChannelTeamFilter}
      filters={filters}
      options={options}
      sort={sort}
      EmptyStateIndicator={EmptyGroupChannelListIndicator}
      List={(listProps) => (
        <TeamChannelList
          {...listProps}
          type='team'
        />
      )}
      Preview={(previewProps) => (
        <ChannelPreview
          {...previewProps}
          type='team'
        />
      )}
    />
  );
};

const MessagingChannelsList = () => {
  const { client } = useChatContext();
  
  // Dynamic filters for messaging channels
  const filters: ChannelFilters = {
    type: 'messaging',
    $or: [
      { demo: 'team' }, // Demo channels  
      { members: { $in: [client.userID!] } } // Channels user is member of
    ]
  };

  return (
    <ChannelList
      channelRenderFilterFn={customChannelMessagingFilter}
      filters={filters}
      options={options}
      sort={sort}
      setActiveChannelOnMount={false}
      EmptyStateIndicator={EmptyDMChannelListIndicator}
      List={(listProps) => (
        <TeamChannelList
          {...listProps}
          type='messaging'
        />
      )}
      Preview={(previewProps) => (
        <ChannelPreview
          {...previewProps}
          type='messaging'
        />
      )}
    />
  );
};

const options = { state: true, watch: true, presence: true, limit: 3 };
const sort: ChannelSort = { last_message_at: -1, updated_at: -1 };

const FakeCompanySelectionBar = () => (
  <div className='sidebar__company-selection-bar'>
    <div className='sidebar__company-badge'>
        <CompanyLogo />
    </div>
  </div>
);

const customChannelTeamFilter = (channels: Channel[]) => {
  return channels.filter((channel) => channel.type === 'team');
};

const customChannelMessagingFilter = (channels: Channel[]) => {
  return channels.filter((channel) => channel.type === 'messaging');
};


const PublicControls = () => {
  const { displayWorkspace } = useWorkspaceController();
  
  return (
    <div className='admin-controls'>
      <div className='admin-controls__header'>
        <span className='admin-controls__title'>📢 Create Public</span>
      </div>
      <div className='admin-controls__buttons'>
        <button 
          className='admin-controls__button'
          onClick={() => displayWorkspace('Admin-Channel-Create__team')}
          title='Create public team channel'
        >
          ➕ Create Channel
        </button>
        <button 
          className='admin-controls__button'
          onClick={() => displayWorkspace('Admin-Channel-Create__messaging')}
          title='Create message group'
        >
          💬 New DM Group
        </button>
      </div>
    </div>
  );
};

const AdminControls = () => {
  const { displayWorkspace } = useWorkspaceController();
  const { client } = useChatContext();
  
  // Check if user has admin role
  const isAdmin = client.user?.role === 'admin' || client.user?.role === 'channel_moderator';
  
  // Don't show admin controls if user is not an admin
  if (!isAdmin) {
    return null;
  }
  
  return (
    <div className='admin-controls'>
      <div className='admin-controls__header'>
        <span className='admin-controls__title'>🔒 Admin Only</span>
      </div>
      <div className='admin-controls__buttons'>
        <button 
          className='admin-controls__button private-channel'
          onClick={() => displayWorkspace('Admin-Channel-Create__team')}
          title='Create private team channel (Admin Only)'
        >
          🔒 Create Private Channel
        </button>
        <button 
          className='admin-controls__button'
          onClick={() => displayWorkspace('Admin-Channel-Create__messaging')}
          title='Create private message group (Admin Only)'
        >
          🔐 Private DM Group
        </button>
      </div>
    </div>
  );
};

const ChatWithAIButton = () => {
  const { client, setActiveChannel } = useChatContext();
  
  const startChatWithBot = useCallback(async () => {
    try {
      console.log('🤖 Starting chat with Elrich...');
      
      // First try to find existing channel with the bot
      const channels = await client.queryChannels({
        type: 'messaging',
        members: { $eq: [client.userID!, 'aurora-ai-assistant'] }
      });

      if (channels.length > 0) {
        // Channel exists, just set it as active
        console.log('✅ Found existing channel with bot');
        setActiveChannel(channels[0]);
        return;
      }

      // No existing channel, create one via our backend endpoint
      const response = await fetch('http://localhost:3001/chat-with-bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: client.userID }),
      });

      if (response.ok) {
        console.log('✅ Created new chat with Elrich');
        // Refresh channels to show the new DM
        const newChannels = await client.queryChannels({
          type: 'messaging',
          members: { $eq: [client.userID!, 'aurora-ai-assistant'] }
        });
        
        if (newChannels.length > 0) {
          setActiveChannel(newChannels[0]);
        }
      } else {
        console.error('❌ Failed to create chat with Elrich');
      }
    } catch (error) {
      console.error('❌ Error starting chat with bot:', error);
    }
  }, [client, setActiveChannel]);

  // Test FastAPI streaming directly
  const testFastAPIStreaming = useCallback(async () => {
    try {
      console.log('🧪 Testing FastAPI streaming...');
      
      // Get or create Elrich channel
      const channels = await client.queryChannels({
        type: 'messaging',
        members: { $eq: [client.userID!, 'aurora-ai-assistant'] }
      });
      
      if (channels.length === 0) {
        console.log('❌ No Elrich channel found, create one first');
        return;
      }
      
      const channel = channels[0];
      
      // Show typing
      await channel.keystroke({ user_id: 'aurora-ai-assistant' });
      
      // Call FastAPI
      const response = await fetch('http://localhost:3002/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: 'Test streaming from chat interface',
          user_id: client.userID,
          user_name: client.user?.name || 'Test User',
          user_email: client.user?.email || 'test@example.com'
        }),
      });
      
      if (response.ok && response.body) {
        console.log('✅ FastAPI connected, processing stream...');
        
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
                      await channel.stopTyping({ user_id: 'aurora-ai-assistant' });
                      elrichMessage = await channel.sendMessage({
                        text: data.text,
                        user_id: 'aurora-ai-assistant'
                      });
                      console.log('📤 First message sent');
                    } else {
                      try {
                        await client.updateMessage({
                          ...elrichMessage.message,
                          text: data.text
                        });
                        console.log('📝 Message updated:', data.word_count, 'words');
                      } catch (updateError) {
                        console.log('⚠️ Update failed');
                      }
                    }
                  }
                } catch (parseError) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } finally {
          await channel.stopTyping({ user_id: 'aurora-ai-assistant' });
        }
        
        console.log('🎉 FastAPI streaming test completed');
      }
    } catch (error) {
      console.error('❌ FastAPI test error:', error);
    }
  }, [client]);

  return (
    <div className='chat-with-ai-button'>
      <button 
        className='admin-controls__button'
        onClick={startChatWithBot}
        title='Start a conversation with Elrich'
        style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          color: 'white',
          width: '100%',
          marginBottom: '4px'
        }}
      >
        Chat with Elrich
      </button>
      
      <button 
        className='admin-controls__button'
        onClick={testFastAPIStreaming}
        title='Test FastAPI streaming response'
        style={{
          background: 'linear-gradient(135deg, #42a5f5 0%, #1e88e5 100%)',
          border: 'none',
          color: 'white',
          width: '100%',
          marginBottom: '8px',
          fontSize: '0.85em'
        }}
      >
        🧪 Test Streaming
      </button>
    </div>
  );
};

interface SidebarProps {
  onLogout?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLogout }) => {
  return (
    <div className='sidebar'>
      <FakeCompanySelectionBar />
      <div className='channel-list-bar'>
        <div className='channel-list-bar__header'>
          <p className='channel-list-bar__header__text'>GuideOps</p>
        </div>
        <ChannelSearch />
        <ChatWithAIButton />
        <TeamChannelsList/>
        <MessagingChannelsList/>
        {onLogout && <UserProfileMenu onLogout={onLogout} />}
      </div>
    </div>
  );
};
