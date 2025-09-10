import React from 'react';
import { PlusIcon } from '../../assets';

interface AddMemberButtonProps {
  onClick: () => void;
  className?: string;
  size?: 'small' | 'medium';
  variant?: 'icon' | 'button' | 'text';
}

export const AddMemberButton: React.FC<AddMemberButtonProps> = ({
  onClick,
  className = '',
  size = 'small',
  variant = 'button'
}) => {
  const baseClass = 'add-member-btn';
  const sizeClass = size === 'small' ? 'add-member-btn--small' : 'add-member-btn--medium';
  const variantClass = `add-member-btn--${variant}`;
  
  if (variant === 'icon') {
    return (
      <button 
        className={`${baseClass} ${variantClass} ${sizeClass} ${className}`}
        onClick={onClick}
        title="Add channel member"
        aria-label="Add channel member"
      >
        <PlusIcon size={size === 'small' ? 14 : 16} color="currentColor" />
      </button>
    );
  }
  
  if (variant === 'text') {
    return (
      <button 
        className={`${baseClass} ${variantClass} ${sizeClass} ${className}`}
        onClick={onClick}
      >
        <PlusIcon size={size === 'small' ? 12 : 14} color="currentColor" />
        <span>Add Member</span>
      </button>
    );
  }
  
  // Default 'button' variant
  return (
    <button 
      className={`${baseClass} ${variantClass} ${sizeClass} ${className}`}
      onClick={onClick}
    >
      ➕ Add
    </button>
  );
};

