import React from 'react';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAllow: () => void;
  onDeny: () => void;
  error?: string;
}

export const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({
  isOpen,
  onClose,
  onAllow,
  onDeny,
  error
}) => {
  if (!isOpen) return null;

  return (
    <div className='location-permission-modal-overlay'>
      <div className='location-permission-modal'>
        <div className='location-permission-modal__header'>
          <h3>Share Your Location</h3>
          <button 
            className='location-permission-modal__close'
            onClick={onClose}
            type='button'
          >
            ×
          </button>
        </div>
        
        <div className='location-permission-modal__content'>
          {error ? (
            <div className='location-permission-modal__error'>
              <p><strong>Location Access Error</strong></p>
              <p>{error}</p>
              <p>Please check your browser settings and try again.</p>
            </div>
          ) : (
            <div className='location-permission-modal__info'>
              <div className='location-permission-modal__icon'>📍</div>
              <p>This will share your current location with the team.</p>
              <p>Your location will be visible to all members of this channel.</p>
            </div>
          )}
        </div>
        
        <div className='location-permission-modal__actions'>
          {error ? (
            <button 
              className='location-permission-modal__button location-permission-modal__button--primary'
              onClick={onClose}
              type='button'
            >
              OK
            </button>
          ) : (
            <>
              <button 
                className='location-permission-modal__button location-permission-modal__button--secondary'
                onClick={onDeny}
                type='button'
              >
                Cancel
              </button>
              <button 
                className='location-permission-modal__button location-permission-modal__button--primary'
                onClick={onAllow}
                type='button'
              >
                Share Location
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
