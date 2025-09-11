import { useCallback, useState } from 'react';
import { useWorkspaceController } from '../../context/WorkspaceController';
import { AdminPanelForm, FormValues } from './context/AdminPanelFormContext';
import { CreateChannel } from './CreateChannel';
import { EditChannel } from './EditChannel';
import { UserManagement } from './UserManagement';
import { useChatContext } from 'stream-chat-react';

type AdminTab = 'channel' | 'users' | 'settings';

export const AdminPanel = () => {
  const { client, channel } = useChatContext();
  const { displayWorkspace, activeWorkspace } = useWorkspaceController();
  const [activeTab, setActiveTab] = useState<AdminTab>('channel');
  const onSubmit = useCallback(() => displayWorkspace('Chat'), [displayWorkspace]);

  let defaultFormValues: FormValues = {name: '', members: []};
  let Form: React.ComponentType | null = null;

  if (activeWorkspace.match('Channel-Create')) {
    defaultFormValues = { members: client.userID ? [client.userID] : [], name: '', };
    Form = CreateChannel;
  } else if (activeWorkspace.match('Channel-Edit')) {
    defaultFormValues= { members: [], name: channel?.data?.name || (channel?.data?.id as string), };
    Form = EditChannel;
  }

  const renderTabContent = () => {
    if (Form) {
      return <Form />;
    }

    switch (activeTab) {
      case 'channel':
        return <EditChannel />;
      case 'users':
        return <UserManagement />;
      case 'settings':
        return (
          <div className='admin-settings'>
            <h3>⚙️ Channel Settings</h3>
            <div className='admin-settings__info'>
              <p><strong>Channel ID:</strong> {channel?.id}</p>
              <p><strong>Channel Type:</strong> {channel?.type}</p>
              <p><strong>Created:</strong> {channel?.data?.created_at ? new Date(channel.data.created_at).toLocaleDateString() : 'Unknown'}</p>
              <p><strong>Members:</strong> {Object.keys(channel?.state.members || {}).length}</p>
            </div>
          </div>
        );
      default:
        return <EditChannel />;
    }
  };

  return (
    <AdminPanelForm workspace={activeWorkspace} onSubmit={onSubmit} defaultValues={defaultFormValues}>
      <div className='channel__container'>
        {!Form && (
          <div className='admin-panel__tabs'>
            <button 
              className={`admin-panel__tab ${activeTab === 'channel' ? 'active' : ''}`}
              onClick={() => setActiveTab('channel')}
            >
              🏷️ Channel
            </button>
            <button 
              className={`admin-panel__tab ${activeTab === 'users' ? 'active' : ''}`}
              onClick={() => setActiveTab('users')}
            >
              👥 Users
            </button>
            <button 
              className={`admin-panel__tab ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              ⚙️ Settings
            </button>
          </div>
        )}
        {renderTabContent()}
      </div>
    </AdminPanelForm>
  );
};