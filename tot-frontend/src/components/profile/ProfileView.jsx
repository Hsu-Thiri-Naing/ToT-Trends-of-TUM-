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
const actionClass = "profile-action boxshadow2 boxshadow rounded-xl px-4 py-1 text-base sm:text-xl cursor-pointer disabled:cursor-wait";

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
    <div className="view-enter profile-container w-full lg:overflow-y-auto lg:no-scrollbar rounded-3xl lg:h-[calc(100vh-35px)] lg:mr-4 my-2 lg:my-4 bg-[#5978A433] font-balthazar p-4 sm:p-7">
      <div className="profile-header outline-1 outline-cyan-50/80 rounded-3xl px-4 sm:px-7 py-4 mb-6 flex flex-col sm:flex-row items-center sm:items-start gap-5 sm:gap-10 bg-white/10 shadow-lg">
        <div className="profile-avatar shrink-0">
          <UserAvatar
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl object-cover"
            src={profileUser.avatar || profileUser.profile_picture}
            alt={profileUser.name + "'s avatar"}
          />
        </div>
        <div className="profile-info w-full min-w-0 flex flex-col gap-3">
          <div>
            <h1 className="roboto-serif-300 font-bold text-3xl sm:text-5xl text-center sm:text-left break-words">
              {profileUser.name}
            </h1>
            {profileUser.email && <p className="text-sm text-center sm:text-left break-words">{profileUser.email}</p>}
          </div>
          <div className="profile-actions flex flex-wrap justify-center sm:justify-start items-center gap-2 sm:gap-3">
            {isOwnProfile ? (
              <button type="button" className={actionClass} onClick={onGoToEditProfile}>
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={actionClass + " min-w-26"}
                  onClick={() => onChangeFollow(profileUser, !isFollowing)}
                  disabled={followPending}
                  aria-busy={followPending}
                >
                  {isFollowing ? "Unfollow" : "Follow"}
                </button>
                {isMutualFollow && (
                  <button type="button" className={actionClass} onClick={() => onChat(profileUser)}>
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
      </div>

      <div
        className="profile-tabs grid grid-cols-3 text-sm sm:text-xl border-b border-cyan-50/70"
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
        className="profile-content py-5"
        id="profile-tab-panel"
        role="tabpanel"
        aria-labelledby={"profile-tab-" + activeTab}
        aria-busy={!profileData && !profileError}
        tabIndex={0}
      >
        {!profileData ? (
          <div className="profile-tab-status" role="status">
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
              <div className="posts-grid p-2 columns-1 sm:columns-2 gap-5">
                {profileData.posts.length > 0
                  ? profileData.posts.map((post) => <PostCardStatic key={post.id} post={post} />)
                  : <p className="profile-tab-status">No posts yet.</p>}
              </div>
            ) : (
              <UserGrid
                users={profileData[activeTab]}
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
  );
}
