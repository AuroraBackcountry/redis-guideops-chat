import { AdminPanelHeader } from './AdminPanelHeader';
import { AdminPanelFooter } from './AdminPanelFooter';
import { ChannelNameInputField } from './ChannelNameInputField';
import { UserList } from './UserList';
import { PrivacyToggle } from './PrivacyToggle';

import { useAdminPanelFormState } from './context/AdminPanelFormContext';
import { useWorkspaceController } from '../../context/WorkspaceController';

export const CreateChannel = () => {
  const { closeAdminPanel } = useWorkspaceController();
  const {createChannelType, name, isPrivate, handleInputChange, handlePrivacyToggle, handleSubmit, errors} = useAdminPanelFormState();

  return (
    <div className='admin-panel__form'>
      <AdminPanelHeader onClose={closeAdminPanel}
                        title={createChannelType === 'team'
                          ? 'Create a New Channel'
                          : 'Send a Direct Message'}
      />
      {createChannelType === 'team' && (
        <>
          <ChannelNameInputField
            error={errors.name}
            name={name}
            onChange={handleInputChange}
            placeholder='channel-name (no spaces)' 
          />
          <PrivacyToggle 
            isPrivate={isPrivate || false}
            onChange={handlePrivacyToggle}
          />
        </>
      )}
      <UserList/>
      <AdminPanelFooter
        onButtonClick={handleSubmit}
        buttonText={createChannelType === 'team'
          ? `Create ${isPrivate ? 'Private' : 'Public'} Channel`
          : 'Create Message Group'}
      />
    </div>
  );
};
