import { useState } from "react";
import UserGrid from "./UserGrid.jsx";
import PostCardStatic from "../feed/PostCardStatic.jsx";
import UserAvatar from "../common/UserAvatar";
import "./ProfileView.css";

const TABS = [
  { id: "following", label: "Following" },
  { id: "followers", label: "Followers" },
  { id: "posts", label: "Posts" },
];
const actionClass = "profile-action glass-lens";

export default function ProfileView({
  profileUser,
  profileData,
  currentUser,
  profileError,
  isFollowing,
  isMutualFollow,
  followChanges,
  onChangeFollow,
  onRetry,
  onGoToEditProfile,
  onViewProfile,
  onChat,
  onReportUser,
}) {
  const [activeTab, setActiveTab] = useState("following");

  if (!profileUser) return <p role="status">User not found.</p>;

  const isOwnProfile = profileUser.id === currentUser.id;
  const followPending = Boolean(followChanges[profileUser.id]?.pending);

  function handleTabKey(event, index) {
    const destinations = {
      ArrowRight: (index + 1) % TABS.length,
      ArrowLeft: (index - 1 + TABS.length) % TABS.length,
      Home: 0,
      End: TABS.length - 1,
    };
    const next = destinations[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setActiveTab(TABS[next].id);
    event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[next].focus();
  }

  return (
    <section className="view-enter profile-page profile-container">
      <div className="profile-shell">
        <header className="profile-header liquid-glass glass-responsive">
          <span className="profile-portrait glass-lens">
            <UserAvatar
              src={profileUser.avatar || profileUser.profile_picture}
              alt=""
              width="112"
              height="112"
            />
          </span>
          <div className="profile-info">
            <h1>{profileUser.name}</h1>
            {profileUser.email && <p className="profile-email">{profileUser.email}</p>}
            <div className="profile-actions">
              {isOwnProfile ? (
                <button type="button" className="profile-action glass-primary" onClick={onGoToEditProfile}>
                  Edit Profile
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className={isFollowing ? actionClass : "profile-action glass-primary"}
                    onClick={() => onChangeFollow(profileUser, !isFollowing)}
                    disabled={followPending}
                    aria-busy={followPending}
                  >
                    {isFollowing ? "Unfollow" : "Follow"}
                  </button>
                  {isMutualFollow && (
                    <button type="button" className="profile-action glass-primary" onClick={() => onChat(profileUser)}>
                      Message
                    </button>
                  )}
                  <button
                    type="button"
                    className={actionClass}
                    onClick={() => onReportUser(profileUser.id, profileUser.name)}
                  >
                    Report
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        <div
          className="profile-tabs liquid-glass"
          role="tablist"
          aria-label="Profile sections"
        >
          {TABS.map(({ id, label }, index) => (
            <button
              key={id}
              type="button"
              id={"profile-tab-" + id}
              role="tab"
              aria-selected={activeTab === id}
              aria-controls="profile-tab-panel"
              tabIndex={activeTab === id ? 0 : -1}
              className="profile-tab"
              onClick={() => setActiveTab(id)}
              onKeyDown={(event) => handleTabKey(event, index)}
            >
              <span className="profile-tab-count">{profileData?.[id].length ?? "…"}</span>
              {label}
            </button>
          ))}
        </div>

        <div
          className="profile-content"
          id="profile-tab-panel"
          role="tabpanel"
          aria-labelledby={"profile-tab-" + activeTab}
          aria-busy={!profileData && !profileError}
          tabIndex={0}
        >
          {!profileData ? (
            <div className="profile-tab-status liquid-glass" role="status">
              {profileError ? (
                <>
                  <p>Couldn’t load profile details.</p>
                  <button type="button" className={actionClass} onClick={onRetry}>Retry</button>
                </>
              ) : "Loading profile details…"}
            </div>
          ) : (
            <div key={activeTab} className="profile-tab-content">
              {activeTab === "posts" ? (
                profileData.posts.length > 0 ? (
                  <div className="profile-posts">
                    {profileData.posts.map((post) => <PostCardStatic key={post.id} post={post} />)}
                  </div>
                ) : <p className="profile-tab-status liquid-glass">No posts yet.</p>
              ) : (
                <UserGrid
                  users={profileData[activeTab]}
                  emptyMessage={activeTab === "followers" ? "No followers yet." : "No accounts followed yet."}
                  currentUser={currentUser}
                  followChanges={followChanges}
                  onChangeFollow={onChangeFollow}
                  onViewProfile={onViewProfile}
                />
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
