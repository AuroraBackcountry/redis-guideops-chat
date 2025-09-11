import { useCallback, useEffect, useState } from 'react';

import type { Channel, UserResponse } from 'stream-chat';
import { useChatContext } from 'stream-chat-react';
import _debounce from 'lodash.debounce';

import { channelByUser, ChannelOrUserType, isChannel } from './utils';
import { ResultsDropdown } from './ResultsDropdown';

import { SearchIcon } from '../../assets';

export const ChannelSearch = () => {
  const { client, setActiveChannel } = useChatContext();

  const [allChannels, setAllChannels] = useState<ConcatArray<ChannelOrUserType> | undefined>();
  const [teamChannels, setTeamChannels] = useState<
    | Channel[]
    | undefined
  >();
  const [directChannels, setDirectChannels] = useState<UserResponse[] | undefined>();

  const [focused, setFocused] = useState<number>();
  const [focusedId, setFocusedId] = useState('');
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        setFocused((prevFocused) => {
          if (prevFocused === undefined || allChannels === undefined) return 0;
          return prevFocused === allChannels.length - 1 ? 0 : prevFocused + 1;
        });
      } else if (event.key === 'ArrowUp') {
        setFocused((prevFocused) => {
          if (prevFocused === undefined || allChannels === undefined) return 0;
          return prevFocused === 0 ? allChannels.length - 1 : prevFocused - 1;
        });
      } else if (event.key === 'Enter') {
        event.preventDefault();

        if (allChannels !== undefined && focused !== undefined) {
          const channelToCheck = allChannels[focused];

          if (isChannel(channelToCheck)) {
            setChannel(channelToCheck);
          } else {
            channelByUser({ client, setActiveChannel, user: channelToCheck });
          }
        }

        setFocused(undefined);
        setFocusedId('');
        setQuery('');
      }
    },
    [allChannels, client, focused, setActiveChannel], // eslint-disable-line react-hooks/exhaustive-deps
  );

  useEffect(() => {
    if (query) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, query]);

  useEffect(() => {
    if (!query) {
      setTeamChannels([]);
      setDirectChannels([]);
    }
  }, [query]);

  useEffect(() => {
    if (focused && focused >= 0 && allChannels) {
      setFocusedId(allChannels[focused].id || '');
    }
  }, [allChannels, focused]);

  const setChannel = async (
    channel: Channel,
  ) => {
    setQuery('');
    
    try {
      // Check if this is an archived (disabled) channel
      const isArchived = channel.data?.disabled === true;
      
      if (isArchived) {
        // eslint-disable-next-line no-restricted-globals
        const shouldUnarchive = window.confirm(`📦 This channel is archived. Do you want to unarchive and join "${channel.data?.name || channel.id}"?`);
        
        if (shouldUnarchive && client.user?.role === 'admin') {
          console.log('📤 Unarchiving channel from search using native properties...');
          // Unarchive the channel by re-enabling it
          await channel.update({ 
            disabled: false
          }, { 
            text: `Channel unarchived by ${client.user?.name || client.userID}` 
          });
          
          // Show the channel
          await channel.show();
          console.log('✅ Channel unarchived and shown');
        } else if (!shouldUnarchive) {
          return; // User cancelled unarchiving
        } else {
          alert('Only admins can unarchive channels');
          return;
        }
      }
      
      // Check if user is already a member of the channel
      const isAlreadyMember = channel.state.members[client.userID!];
      
      if (!isAlreadyMember) {
        // Check if the channel is private before attempting to join
        const isPrivateChannel = channel.data?.private === true || 
                                 channel.data?.invite_only === true ||
                                 !channel.data?.demo; // Channels without demo property might be private
        
        if (isPrivateChannel && client.user?.role !== 'admin') {
          console.warn(`❌ Cannot join private channel: ${channel.data?.name || channel.id}`);
          alert(`This channel is private. You need an invitation to join.`);
          return;
        }
        
        // Add user to the channel if they're not already a member
        await channel.addMembers([client.userID!]);
        console.log(`✅ Joined channel: ${channel.data?.name || channel.id}`);
      }
      
      // Watch the channel and set it as active
      await channel.watch();
      setActiveChannel(channel);
    } catch (error) {
      console.error('Error joining channel:', error);
      
      // Check if it's a permissions error
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
        alert(`You don't have permission to join this channel. It may be private or require an invitation.`);
      } else {
        // Still try to set as active channel for other errors
        setActiveChannel(channel);
      }
    }
  };

  const getChannels = async (text: string) => {
    try {
      console.log('🔍 Searching for channels with text:', text);
      console.log('👤 Current user ID:', client.userID);
      console.log('🔑 User role:', client.user?.role);
      
      // Try different query approaches based on user role
      let channelResponse;
      
      if (client.user?.role === 'admin') {
        // Admins can search all channels (including archived)
        console.log('🎯 NEW CODE RUNNING - Admin search including archived channels');
        console.log('🔍 Admin search - querying all channels including archived');
        
        // Query active channels first - simplified query like the working example
        console.log('🔍 Querying active channels...');
        const activeChannelsPromise = client.queryChannels(
          {
            type: 'team',
            name: { $autocomplete: text },
          },
          {},
          { limit: 5 },
        );
        
        // Query archived channels separately with simpler logic
        console.log('🔍 Querying archived channels...');
        // For archived channels, query disabled channels using Stream native properties
        const archivedChannelsPromise = client.queryChannels(
          {
            type: 'team',
            disabled: true,
            name: { $autocomplete: text }
          },
          {},
          { limit: 2 }
        ).then(disabledChannels => {
          console.log(`📦 Found ${disabledChannels.length} disabled (archived) channels matching "${text}"`);
          disabledChannels.forEach(ch => {
            console.log(`  - ${ch.id} (${ch.data?.name || 'No name'}) disabled: ${ch.data?.disabled}`);
          });
          return disabledChannels;
        }).catch(error => {
          console.error('❌ Error querying disabled channels for search:', error);
          return [];
        });
        
        const [activeChannels, archivedChannels] = await Promise.all([
          activeChannelsPromise,
          archivedChannelsPromise
        ]);
        
        console.log('📊 Search results:');
        console.log(`  Active channels: ${activeChannels.length}`);
        console.log(`  Archived channels: ${archivedChannels.length}`);
        
        // Combine results - archived channels will be identified by their status property
        const combinedChannels = [
          ...activeChannels,
          ...archivedChannels
        ];
        
        console.log(`  Total combined: ${combinedChannels.length}`);
        combinedChannels.forEach(ch => {
          const isDisabled = ch.data?.disabled ? 'disabled' : 'active';
          console.log(`    - ${ch.id} (${ch.data?.name || 'No name'}) [${isDisabled}]`);
        });
        
        channelResponse = Promise.resolve(combinedChannels);
      } else {
        // Regular users - first try demo/public channels
        console.log('🔍 User search - trying demo channels first');
        try {
          channelResponse = client.queryChannels(
            {
              type: 'team',
              name: { $autocomplete: text },
              demo: { $exists: true }, // Try demo channels first
            },
            {},
            { limit: 5 },
          );
        } catch (demoError) {
          console.log('Demo channel search failed, trying user channels:', demoError);
          // Fallback to user's own channels
          channelResponse = client.queryChannels(
            {
              type: 'team',
              name: { $autocomplete: text },
              members: { $in: [client.userID!] },
            },
            {},
            { limit: 5 },
          );
        }
      }
      
      console.log('📡 Channel query sent, waiting for response...');

      const userResponse = client.queryUsers(
        { 
          name: { $autocomplete: text }
          // Remove the $ne filter as it's not supported for id field
        },
        { id: 1 },
        { limit: 5 },
      );

      const [channels, { users }] = await Promise.all([channelResponse, userResponse]);
      console.log('✅ Search results - Channels found:', channels.length);
      console.log('📋 Channels:', channels.map(c => ({ id: c.id, name: c.data?.name })));
      console.log('✅ Search results - Users found:', users.length);
      
      const otherUsers = users.filter((user) => user.id !== client.userID);
      
      // Always include Aurora AI Assistant in search results if query matches
      const botUser = users.find(user => user.id === 'aurora-ai-assistant');
      const shouldIncludeBot = botUser && (
        text.toLowerCase().includes('aurora') ||
        text.toLowerCase().includes('ai') ||
        text.toLowerCase().includes('assistant') ||
        text.toLowerCase().includes('bot')
      );

      const finalUsers = shouldIncludeBot && !otherUsers.find(u => u.id === 'aurora-ai-assistant') 
        ? [botUser, ...otherUsers] 
        : otherUsers;

      if (channels.length) setTeamChannels(channels);
      if (finalUsers.length) setDirectChannels(finalUsers);
      setAllChannels([...channels, ...finalUsers]);
    } catch (error) {
      console.error('❌ Channel search error:', error);
      console.error('Error details:', error);
      setQuery('');
    }

    setLoading(false);
  };

  const getChannelsDebounce = _debounce(getChannels, 100, {
    trailing: true,
  });

  const onSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();

    setLoading(true);
    setFocused(undefined);
    setQuery(event.target.value);
    if (!event.target.value) return;

    getChannelsDebounce(event.target.value);
  };

  return (
    <div className='channel-search__container'>
      <div className='channel-search__input__wrapper'>
        <div className='channel-search__input__icon'>
          <SearchIcon />
        </div>
        <input
          onChange={onSearch}
          placeholder='Search'
          type='text'
          value={query}
        />
      </div>
      {query && (
        <ResultsDropdown
          teamChannels={teamChannels}
          directChannels={directChannels}
          focusedId={focusedId}
          loading={loading}
          setChannel={setChannel}
          setQuery={setQuery}
        />
      )}
    </div>
  );
};
