import React from 'react';
import './AvatarWithDot.css';
import UserAvatar from "./UserAvatar";

export default function AvatarWithDot({ user, onlineIds = new Set(), size = 40 }) {
  const isOnline = onlineIds.has(user?.id);

  return (
    <div className="avatar-dot-wrapper" style={{ width: size, height: size }}>
      <UserAvatar
        src={user?.avatar || user?.profile_picture}
        alt={user?.name || 'User'}
        className="avatar-img object-cover"
        style={{ width: size, height: size }}
      />
      <span className={`status-dot ${isOnline ? 'on' : ''}`} />
    </div>
  );
}