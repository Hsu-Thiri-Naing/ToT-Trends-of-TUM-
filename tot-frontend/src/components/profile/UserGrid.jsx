import UserAvatar from "../common/UserAvatar";

export default function UserGrid({
  users,
  currentUser,
  followChanges,
  onChangeFollow,
  onViewProfile,
  emptyMessage,
}) {
  if (users.length === 0) {
    return <p className="profile-tab-status liquid-glass">{emptyMessage}</p>;
  }

  return (
    <ul className="user-grid">
      {users.map((user) => {
        const change = followChanges[user.id];
        const isFollowing = change?.following ?? user.is_following ?? false;
        const name = user.name || "Unknown user";

        return (
          <li key={user.id} className="profile-member liquid-glass">
            <button
              type="button"
              className="profile-member-link"
              aria-label={`View profile of ${name}`}
              onClick={() => onViewProfile(user.id, user)}
            >
              <span className="profile-member-avatar glass-lens">
                <UserAvatar src={user.avatar || user.profile_picture} alt="" width="64" height="64" />
              </span>
              <strong title={name}>{name}</strong>
            </button>
            {user.email && <p className="profile-member-email" title={user.email}>{user.email}</p>}
            {user.id !== currentUser?.id && (
              <button
                type="button"
                className="profile-action glass-lens"
                onClick={() => onChangeFollow(user, !isFollowing)}
                disabled={Boolean(change?.pending)}
                aria-busy={Boolean(change?.pending)}
              >
                {isFollowing ? "Unfollow" : "Follow"}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
