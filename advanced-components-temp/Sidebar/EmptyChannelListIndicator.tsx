

export const EmptyGroupChannelListIndicator = () => (
    <div className="team-empty-channel-list-indicator">There are no group channels. Start by creating some.</div>
);
export const EmptyDMChannelListIndicator = () => {
  return (
    <div className="team-empty-channel-list-indicator">
      <div>No direct messages yet.</div>
      <div style={{ fontSize: '0.85em', marginTop: '8px', color: 'var(--text-low-emphasis-color)' }}>
        💡 Try searching for <strong>"Elrich"</strong> to chat with our assistant!
      </div>
    </div>
  );
};