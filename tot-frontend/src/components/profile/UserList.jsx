import { LuMessageCircle, LuUsersRound } from "react-icons/lu";
import UserAvatar from "../common/UserAvatar";
import "./UserList.css";

export default function UserList({ users, currentUser, onViewProfile, onChat, onlineUsers, desktopOnly = false }) {
  const members = Array.isArray(users)
    ? users.filter((member) => member && member.id !== currentUser?.id)
    : [];

  return (
    <section className={`trendmates order-1 lg:order-3${desktopOnly ? " hidden lg:block" : ""}`} aria-label="Trendmates">
      <div className="user-list liquid-glass">
        <header className="trendmates-header">
          <h2>
            <LuUsersRound aria-hidden="true" />
            Trendmates
          </h2>
          <span className="trendmates-count">
            {members.length}
            <span className="sr-only"> {members.length === 1 ? "member" : "members"}</span>
          </span>
        </header>

        {members.length === 0 ? (
          <p className="trendmates-empty">No other users found.</p>
        ) : (
          <ul className="users-grid">
            {members.map((member) => {
              const online = onlineUsers?.has(member.id);
              return (
                <li className="trendmate" key={member.id}>
                  <button
                    type="button"
                    className="trendmate-profile"
                    onClick={() => onViewProfile?.(member.id, member)}
                    aria-label={`View profile of ${member.name}`}
                    aria-describedby={`trendmate-status-${member.id}`}
                  >
                    <span className="trendmate-avatar glass-lens">
                      <UserAvatar
                        src={member.avatar || member.profile_picture}
                        alt=""
                        width="42"
                        height="42"
                      />
                      <span className="trendmate-dot" data-online={Boolean(online)} />
                    </span>
                    <span className="trendmate-details">
                      <strong className="trendmate-name" title={member.name}>{member.name}</strong>
                      <span className="trendmate-status" id={`trendmate-status-${member.id}`}>
                        {online ? "Online" : "Offline"}
                      </span>
                    </span>
                  </button>

                  {onChat && (
                    <button
                      type="button"
                      className="trendmate-chat glass-lens"
                      onClick={() => onChat(member)}
                      title={`Chat with ${member.name}`}
                      aria-label={`Chat with ${member.name}`}
                    >
                      <LuMessageCircle aria-hidden="true" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
