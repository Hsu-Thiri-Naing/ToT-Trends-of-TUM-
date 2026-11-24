// src/components/feed/Post.jsx
import React, { useState, useEffect } from "react";
import "./Feed.css";

import {
  toggleReaction,
  addComment,
  getComments,
  sharePost,
} from "../../api/postService";
import { formatMediaUrl } from "../../utils/mediaUrl";
import UserAvatar from "../common/UserAvatar";
import "./Post.css";

// --- ReactionButton Component ---
const ReactionButton = ({
  type,
  count,
  isActive,
  onClick,
  disabled,
  ariaLabel,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  let img = "";
  let imghover = "";
  let imgactive = "";
  switch (type.toLowerCase()) {
    case "like":
      img = "/assets/images/happy.png";
      imghover = "/assets/images/happycolor.png";
      imgactive = "/assets/images/happycolor.png"; // active same as hover
      break;
    case "sad":
      img = "/assets/images/sad.png";
      imghover = "/assets/images/sadcolor.png";
      imgactive = "/assets/images/sadcolor.png";
      break;
    case "angry":
      img = "/assets/images/angry.png";
      imghover = "/assets/images/angrycolor.png";
      imgactive = "/assets/images/angrycolor.png";
      break;
    default:
      img = "";
      imghover = "";
      imgactive = "";
  }
  return (
    <div className="feed-reaction">
      <button
        className={`react jello-vertical hover:scale-125 ${type.toLowerCase()} ${
          isActive ? "active" : ""
        }`}
        onClick={() => onClick(type.toLowerCase())}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-pressed={isActive}
        style={{
          width: "30px",
          height: "30px",
          backgroundImage: `url(${
            isHovered ? imghover : isActive ? imgactive : img
          })`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      ></button>
      {count}
    </div>
  );
};
// --- End ReactionButton ---

const CATEGORY_NAMES = {
  news: "News",
  memes: "Memes",
  entertainment: "Entertainment",
  study: "Study",
  announcement: "Announcement",
};

const formatTimeAgo = (timestamp) => {
  const now = new Date();
  const postTime = new Date(timestamp);
  const diffInSeconds = Math.floor((now - postTime) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    day: 86400,
    hour: 3600,
    minute: 60,
  };

  for (const [unit, seconds] of Object.entries(intervals)) {
    const value = Math.floor(diffInSeconds / seconds);
    if (value >= 1) {
      return `${value} ${unit}${value > 1 ? "s" : ""} ago`;
    }
  }

  return "Just now";
};

// Accept the socket prop
const Post = ({
  post,
  currentUser,
  onDeletePost,
  socket,
  onViewProfile,
  onViewOriginalPost,
  onPostShared,
}) => {
  // <-- Added onViewOriginalPost prop
  // --- State initialization ---
  const [counts, setCounts] = useState({
    reactions: post.reactions_count || 0,
    comments: post.comments_count || 0,
    shares: post.shares_count || 0,
  });

  const [reactions, setReactions] = useState({
    like: post.likes_count || 0,
    sad: post.sads_count || 0,
    angry: post.angries_count || 0,
  });

  const [userReaction, setUserReaction] = useState(post.user_reaction || null);

  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isCommentsVisible, setIsCommentsVisible] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCommentActive, setIsCommentActive] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const isPostAuthor = currentUser && post.user_id === currentUser.id;

  useEffect(() => {
    setReactions({
      like: post.likes_count || 0,
      sad: post.sads_count || 0,
      angry: post.angries_count || 0,
    });

    setCounts({
      reactions: post.reactions_count || 0,
      comments: post.comments_count || 0,
      shares: post.shares_count || 0,
    });

    // setUserReaction(post.user_reaction || null);
  }, [
    post.likes_count,
    post.sads_count,
    post.angries_count,
    post.reactions_count,
    post.comments_count,
    post.shares_count,
    post.user_reaction,
  ]);

  useEffect(() => {
    if (socket && isCommentsVisible && !isLoadingComments) {
      const handleNewComment = (newCommentData) => {
        if (newCommentData.post_id === post.id) {
          console.log(
            "Real-time comment received in Post component:",
            newCommentData,
          );

          setComments((prevComments) => [...prevComments, newCommentData]);
        }
      };

      // Attach the listener
      socket.on("commentAdded", handleNewComment);

      return () => {
        socket.off("commentAdded", handleNewComment);
      };
    }
  }, [socket, isCommentsVisible, isLoadingComments, post.id]);

  const handleReactionClick = async (type) => {
    if (actionLoading) return;
    setActionLoading(true);
    setError(null);
    try {
      const response = await toggleReaction(post.id, type);
      console.log("Reaction API Response:", response.data);

      // --- Emit event to Node.js server for real-time update ---
      // Do this *after* the successful API call
      if (socket) {
        // Check if socket is available
        socket.emit("postReactionUpdated", { postId: post.id });
        console.log(`Emitted 'postReactionUpdated' for post ${post.id}`);
      }
      // --- End emit event ---

      // Update local state based on the API response (as before)
      if (response.data.message === "Reaction removed") {
        setReactions({
          like: response.data.counts.likes_count,
          sad: response.data.counts.sads_count,
          angry: response.data.counts.angries_count,
        });
        setUserReaction(null);
      } else if (response.data.reaction) {
        setReactions({
          like: response.data.counts.likes_count,
          sad: response.data.counts.sads_count,
          angry: response.data.counts.angries_count,
        });
        setUserReaction(type);
      }
      setError(null);
    } catch (err) {
      if (err.response && err.response.status === 429) {
        setError("Too many requests. Please wait and try again.");
        console.error("Rate limit exceeded for reaction toggle.");
      } else {
        console.error("Reaction error:", err);
        setError("Failed to update reaction. Please try again.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const toggleComments = async () => {
    setIsCommentActive(!isCommentActive);
    if (isCommentsVisible) {
      setIsCommentsVisible(false);
    } else {
      if (comments.length === 0) {
        setIsLoadingComments(true);
        setError(null);
        try {
          const response = await getComments(post.id);
          setComments(response.data);
        } catch (err) {
          console.error("Comments fetch error:", err);
          setError("Failed to load comments.");
        } finally {
          setIsLoadingComments(false);
        }
      }
      setIsCommentsVisible(true);
    }
  };

  const getBackgroundImage = () => {
    if (isHovered) {
      return "url('/assets/images/chats.png')";
    }
    return isCommentActive
      ? "url('/assets/images/chats.png')" // Active state
      : "url('/assets/images/comment.png')"; // Default
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || actionLoading) return;

    setActionLoading(true);
    setError(null);
    try {
      const response = await addComment(post.id, newComment);
      // Clear the input field immediately
      setNewComment("");

      // --- Emit event to Node.js server for real-time update ---
      // Send the postId and the newly created comment data
      if (socket && response.data) {
        // Check if socket is available and response has data
        socket.emit("postCommentAdded", {
          postId: post.id,
          comment: response.data,
        });
        console.log(
          `Emitted 'postCommentAdded' for post ${post.id}`,
          response.data,
        );
      }
      // --- End emit event ---

      // Note: The local comment list and count are now updated by the
      // real-time listeners in useEffect and App.jsx, so we don't need to do it here.
      // setComments(prev => [...prev, response.data]); // Removed
      // setCounts(prev => ({ ...prev, comments: prev.comments + 1 })); // Removed
    } catch (err) {
      console.error("Add comment error:", err);
      setError("Failed to add comment.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleShare = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    setError(null);
    try {
      // Determine the ID of the *original* post to share.
      // If the current post is a share wrapper (has 'shared_post'), get the ID of the original post inside it.
      // Otherwise, the current post *is* the original, so use its ID.
      const originalPostIdToShare = post.shared_post
        ? post.shared_post.id
        : post.id;

      console.log(
        `Attempting to share original post with ID: ${originalPostIdToShare} (from displayed post ID: ${post.id})`,
      );

      const response = await sharePost(originalPostIdToShare); // Share the original post

      onPostShared?.(response.data);

      // Update the share count for the *currently displayed* post in the UI.
      // This provides visual feedback for the action taken on the post visible to the user.
      // The backend should handle incrementing the original post's share count internally,
      // potentially via triggers or application logic linked to the originalPostIdToShare.
      setCounts((prev) => ({ ...prev, shares: prev.shares + 1 }));

      // Optional: Emit a real-time update event for the *currently displayed* post's share count
      // if your application updates it via websockets.
      // if (socket) {
      //   socket.emit('postShared', { postId: post.id }); // Or maybe originalPostIdToShare if backend handles it
      // }

      alert("Original post shared!");
    } catch (err) {
      console.error("Share error:", err);
      if (err.response && err.response.status === 429) {
        setError("Too many requests. Please wait and try again.");
      } else {
        setError("Failed to share post.");
      }
    } finally {
      setActionLoading(false);
    }
  };
  const handleDelete = () => {
    if (onDeletePost) {
      onDeletePost(post.id);
    }
  };

  const handleViewOriginalPost = () => {
    if (onViewOriginalPost) {
      onViewOriginalPost(post.shared_post.id); // ✅ Use the shared post's ID
    }
  };

  // --- Render Return ---
  return (
    <article className="post-card liquid-glass">
      {error && (
        <div className="post-error" role="alert">
          {error}
        </div>
      )}

      <header className="post-header feed-post-header">
        <button
          type="button"
          className="feed-post-author"
          onClick={() => onViewProfile?.(post.user_id, post.user)}
        >
          <UserAvatar
            src={post.user?.avatar || post.user?.profile_picture}
            alt=""
            width="40"
            height="40"
            className="glass-lens rounded-xl object-cover"
          />
          <span>
            <strong>{post.user?.name || "Unknown user"}</strong>
            <small className="post-time">{formatTimeAgo(post.created_at)}</small>
          </span>
        </button>

        <div className="feed-post-meta">
          {post.category && (
            <span className="cat-badge glass-lens px-2 py-0.5 rounded-full">
              {CATEGORY_NAMES[post.category] || post.category}
            </span>
          )}
          {isPostAuthor && (
            <button type="button" onClick={handleDelete} className="feed-post-delete glass-lens" aria-label="Delete post">
              &times;
            </button>
          )}
        </div>
      </header>

      {post.shared_post_id && (
        <p className="feed-shared-label">
          {post.shared_post?.user?.name ? (
            <>
              Shared{" "}
              <button type="button" onClick={() => onViewProfile?.(post.shared_post.user_id, post.shared_post.user)}>
                {post.shared_post.user.name}
              </button>
              ’s post
            </>
          ) : "Shared a post"}
        </p>
      )}

      <div className="post-body feed-post-body">
        {/* Current post body (only if exists and is not a share) */}
        {post.body && !post.shared_post_id && (
          <p className="feed-post-text">{post.body}</p>
        )}

        {/* Current post media */}
        {post.media_url && (
          <div className="post-media ">
            {post.media_type === "image" && (
              <img
                loading="lazy"
                decoding="async"
                src={formatMediaUrl(post.media_url)} /* max-h-60 */
                alt="Post media"
                className="w-full rounded-lg object-contain max-h-60"
              />
            )}

            {post.media_type === "video" && (
              <video
                controls
                src={formatMediaUrl(post.media_url)}
                className="w-full rounded-lg"
                preload="metadata"
              >
                <span className="error-message text-xl text-red-500 cherry-bomb">
                  {" "}
                  Your browser does not support the video tag.
                </span>
              </video>
            )}

            {post.media_type === "audio" && (
              <div
                style={{
                  padding: "8px",
                  backgroundColor: "#f5f5f5",
                  borderRadius: "8px",
                }}
              >
                <audio controls src={formatMediaUrl(post.media_url)} style={{ width: "100%" }}>
                  <span className="error-message text-xl text-red-500 cherry-bomb">
                    {" "}
                    Your browser does not support the audio tag.
                  </span>
                </audio>
              </div>
            )}
          </div>
        )}

        {/* Shared post content (only if this is a shared post) */}
        {post.shared_post && (
          <div className="shared-post-container">
            <div className="shared-post-header mb-2">
              <div
                onClick={() =>
                  onViewProfile && onViewProfile(post.shared_post.user_id, post.shared_post.user)
                }
                style={{
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <UserAvatar
                  src={
                    post.shared_post.user?.avatar || post.shared_post.user?.profile_picture
                  }
                  alt={`${post.shared_post.user?.name || "User"} avatar`}
                  className="shared-post-author-avatar w-8 h-8 rounded-xl mr-2 object-cover" // Different class for sizing if needed
                />
                <strong className="chicle-regular">
                  {post.shared_post.user?.name}
                </strong>
              </div>
            </div>

            <div className="shared-post-content">
              {post.shared_post.body && <p>{post.shared_post.body}</p>}

              {/* Shared post media */}
              {post.shared_post.media_url && (
                <div
                  className="post-media"
                  style={{
                    marginTop: "12px",
                    marginBottom: "12px",
                  }}
                >
                  {post.shared_post.media_type === "image" && (
                    <img
                      loading="lazy"
                      decoding="async"
                      src={formatMediaUrl(post.shared_post.media_url)}
                      alt="Shared post media"
                      style={{
                        maxWidth: "100%",
                        maxHeight: "400px",
                        borderRadius: "8px",
                        objectFit: "contain",
                      }}
                    />
                  )}

                  {post.shared_post.media_type === "video" && (
                    <video
                      controls
                      src={formatMediaUrl(post.shared_post.media_url)}
                      style={{
                        maxWidth: "100%",
                        maxHeight: "400px",
                        borderRadius: "8px",
                      }}
                      preload="metadata"
                    >
                      <span className="error-message text-xl text-red-500 cherry-bomb">
                        {" "}
                        Your browser does not support the video tag.
                      </span>
                    </video>
                  )}

                  {post.shared_post.media_type === "audio" && (
                    <div
                      style={{
                        padding: "8px",
                        backgroundColor: "#f5f5f5",
                        borderRadius: "8px",
                      }}
                    >
                      <audio
                        controls
                        src={formatMediaUrl(post.shared_post.media_url)}
                        style={{ width: "100%" }}
                      >
                        <span className="error-message text-xl text-red-500 cherry-bomb">
                          {" "}
                          Your browser does not support the audio tag.
                        </span>
                      </audio>
                    </div>
                  )}
                </div>
              )}

              {/* View Original Post Button */}
              <div className="view-original-post-section mb-3">
                <button
                  className="text-sm text-blue-400 cursor-pointer"
                  onClick={handleViewOriginalPost}
                  aria-label="View original post"
                >
                  <i>View Original Post</i>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="">
        <div className="post-footer feed-post-footer">
          <div className="post-reactions flex gap-2 sm:gap-3">
            <ReactionButton
              type="Like"
              count={reactions.like}
              isActive={userReaction === "like"}
              onClick={handleReactionClick}
              disabled={actionLoading}
              ariaLabel="Like this post"
            />
            <ReactionButton
              type="Sad"
              count={reactions.sad}
              isActive={userReaction === "sad"}
              onClick={handleReactionClick}
              disabled={actionLoading}
              ariaLabel="Sad reaction"
            />
            <ReactionButton
              type="Angry"
              count={reactions.angry}
              isActive={userReaction === "angry"}
              onClick={handleReactionClick}
              disabled={actionLoading}
              ariaLabel="Angry reaction"
            />
          </div>

          <div className="post-actions flex gap-1 sm:gap-2 items-center ">
            <button
              onClick={toggleComments}
              disabled={actionLoading}
              aria-label={isCommentsVisible ? "Hide comments" : "Show comments"}
              aria-expanded={isCommentsVisible}
              style={{
                width: "30px",
                height: "30px",
                backgroundImage: getBackgroundImage(),
                backgroundSize: "cover",
                backgroundPosition: "center",
                cursor: "pointer",
              }}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
            ></button>
            {counts.comments}
            <button
              onClick={handleShare}
              disabled={actionLoading}
              aria-label="Share post"
              style={{
                width: "28px",
                height: "28px",
                backgroundImage: `url('/assets/images/share.png')`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                cursor: "pointer",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.backgroundImage = `url('/assets/images/shares.png')`)
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.backgroundImage = `url('/assets/images/share.png')`)
              }
            ></button>
            {counts.shares}
          </div>
        </div>

        {isCommentsVisible && (
          <div className="post-comments-section">
            {isLoadingComments && (
              <p className="comment-status" role="status">Loading comments...</p>
            )}
            {comments.length > 0 ? (
              <ul className="comments-list">
                {comments.map((comment) => (
                  <li key={comment.id} className="comment-item flex items-start gap-2.5">
                    <UserAvatar
                      src={comment.user?.avatar || comment.user?.profile_picture}
                      alt=""
                      className="comment-author-avatar w-8 h-8 shrink-0 rounded-xl object-cover"
                    />
                    <div className="comment-copy">
                      <strong className="chicle-regular">{comment.user?.name}</strong>
                      <p>{comment.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              !isLoadingComments && <p className="comment-status">No comments yet.</p>
            )}
            <form onSubmit={handleAddComment} className="add-comment-form">
              <input
                className="comment-input"
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                aria-label="Add a comment"
                disabled={actionLoading}
              />
              <button
                className="comment-send"
                type="submit"
                aria-label="Send comment"
                disabled={actionLoading || !newComment.trim()}
              />
            </form>
          </div>
        )}
      </div>

      {actionLoading && <div className="action-loading"></div>}
    </article>
  );
  // --- End Render Return ---
};

export default Post;
