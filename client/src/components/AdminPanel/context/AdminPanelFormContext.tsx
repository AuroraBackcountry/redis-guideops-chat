import {
  ChangeEventHandler,
  createContext,
  MouseEventHandler,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { Workspace } from '../../../context/WorkspaceController';
import { useChatContext } from 'stream-chat-react';

type UpsertChannelParams = { name: string, members: string[] };

type ChannelType = 'team' | 'messaging';

type UpsertAction = 'create' | 'update';

export type FormValues = {
  name: string;
  members: string[];
  isPrivate?: boolean;
};

export type FormErrors = {
  name: string | null;
  members: string | null;
};

type AdminPanelFormContext = FormValues & {
  handleInputChange: ChangeEventHandler<HTMLInputElement>;
  handleMemberSelect: ChangeEventHandler<HTMLInputElement>;
  handlePrivacyToggle: (isPrivate: boolean) => void;
  handleSubmit: MouseEventHandler<HTMLButtonElement>;
  createChannelType?: ChannelType;
  errors: FormErrors;
};


const Context = createContext<AdminPanelFormContext>({
  handleInputChange: () => null,
  handleMemberSelect: () => null,
  handlePrivacyToggle: () => null,
  handleSubmit: () => null,
  members: [],
  name: '',
  isPrivate: false,
  errors: { name: null, members: null },
});


type AdminPanelFormProps = {
  workspace: Workspace;
  onSubmit: () => void;
  defaultValues: FormValues;
}

const getChannelTypeFromWorkspaceName = (workspace: Workspace): ChannelType | undefined => (
  workspace.match(/.*__(team|messaging)/)?.[1] as ChannelType | undefined
);

const getUpsertAction = (workspace: Workspace): UpsertAction | undefined => {
  if (workspace.match('Channel-Create')) return 'create';
  if (workspace.match('Channel-Edit')) return 'update';
};

export const AdminPanelForm = ({ children, defaultValues, workspace, onSubmit }: PropsWithChildren<AdminPanelFormProps>) => {
  const { client, channel, setActiveChannel } = useChatContext();
  const [name, setChannelName] = useState<string>(defaultValues.name);
  const [members, setMembers] = useState<string[]>(defaultValues.members);
  const [isPrivate, setIsPrivate] = useState<boolean>(defaultValues.isPrivate || false);
  const [errors, setErrors] = useState<FormErrors>({ name: null, members: null });

  const createChannelType = getChannelTypeFromWorkspaceName(workspace);
  const action = getUpsertAction(workspace);

  const createChannel = useCallback(async ({ name, members }: UpsertChannelParams) => {
    if (!createChannelType || members.length < 1) return;
    
    // Generate unique channel ID (just timestamp and random string)
    const channelId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const channelData: any = {
      name, // This is the editable display name
      members,
      demo: 'team',
    };

    // Add privacy settings based on toggle
    if (isPrivate) {
      channelData.private = true;
      channelData.invite_only = true;
      channelData.created_by_admin = true;
    }

    const newChannel = await client.channel(createChannelType, channelId, channelData);

    // Create the channel first
    await newChannel.watch();

    // Make the creator a channel moderator (channel owner) via backend
    if (client.userID) {
      try {
        // Try backend assignment first (more reliable)
        const response = await fetch('http://localhost:3001/assign-channel-moderator', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            channelId: newChannel.id,
            channelType: newChannel.type,
            userId: client.userID,
          }),
        });
        
        if (response.ok) {
          console.log(`✅ ${client.userID} is now channel moderator/owner of ${name}`);
        } else {
          // Fallback to client-side assignment
          await newChannel.addModerators([client.userID]);
          console.log(`✅ ${client.userID} assigned as moderator (client-side)`);
        }
      } catch (error) {
        console.log('Note: Could not assign moderator role, but channel was created successfully');
      }
    }

    setActiveChannel(newChannel);
  }, [createChannelType, setActiveChannel, client, isPrivate]);

  const updateChannel = useCallback(async ({ name, members }: UpsertChannelParams) => {
    if (name !== (channel?.data?.name || channel?.data?.id)) {
      await channel?.update(
        { name },
        { text: `Channel name changed to ${name}` },
      );
    }

    if (members?.length) {
      await channel?.addMembers(members);
    }
  }, [channel]);

  const validateForm = useCallback(({action, createChannelType, values}:{values: FormValues, createChannelType?: ChannelType, action?: UpsertAction}): FormErrors | null => {
    let errors:FormErrors = { name: null, members: null };

    if (action === 'create') {
      errors = {
        name: !values.name && createChannelType === 'team' ? 'Channel name is required' : null,
        members: values.members.length < 1  ? 'At least one member is required' : null,
      };
    }

    if (action === 'update' && values.name === defaultValues.name && values.members.length === 0) {
      errors = {
        name: 'Name not changed (change name or add members)',
        members: 'No new members added (change name or add members)',
      };
    }

    return Object.values(errors).some(v => !!v) ?  errors : null;
  }, [defaultValues.name]);

  const handleSubmit: MouseEventHandler<HTMLButtonElement> = useCallback(async (event) => {
    event.preventDefault();
    const errors = validateForm({values: {name, members, isPrivate}, action, createChannelType});

    if (errors) {
      setErrors(errors);
      return;
    }

    try {
      if (action === 'create') await createChannel({ name, members });
      if (action === 'update') await updateChannel({ name, members });
      onSubmit();
    } catch (err) {
      console.error(err);
    }
  }, [action, createChannelType, name, members, isPrivate, createChannel, updateChannel, onSubmit, validateForm]);

  const handlePrivacyToggle = useCallback((newIsPrivate: boolean) => {
    setIsPrivate(newIsPrivate);
  }, []);

  const handleInputChange: ChangeEventHandler<HTMLInputElement> = useCallback((event) => {
    event.preventDefault();
    setChannelName(event.target.value);
  }, []);

  const handleMemberSelect: ChangeEventHandler<HTMLInputElement> = useCallback((event) => {
    setMembers((prevMembers) => {
      const { value } = event.target;
      if (event.target.checked) {
        return prevMembers.length ? [...prevMembers, value] : [value];
      }
      return prevMembers?.filter((prevUser) => prevUser !== value);
    });
  }, []);

  useEffect(() => {
    setChannelName(defaultValues.name);
    setMembers(defaultValues.members);
    setIsPrivate(defaultValues.isPrivate || false);
  }, [defaultValues, createChannelType]);

  return (
    <Context.Provider value={{
      createChannelType,
      errors,
      name,
      members,
      isPrivate,
      handleInputChange,
      handleMemberSelect,
      handlePrivacyToggle,
      handleSubmit,
    }}>
      {children}
    </Context.Provider>
  );
};

export const useAdminPanelFormState = () => useContext(Context);