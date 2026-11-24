// src/components/Feed.jsx (Updated - no more category filtering UI)
import React, { useState, useLayoutEffect, useRef } from "react";
import CreatePostForm from "./CreatePostForm.jsx";
import Post from "./Post.jsx";
import { readScrollPosition, restoreScrollPosition } from "../../utils/scrollPosition";
import "./Feed.css";

const Feed = ({
  user,
  posts,
  onCreatePost,
  onDeletePost,
  onPostShared,
  socket,
  onViewProfile,
  categories,
  selectedCats, // Receive filtered posts from parent
  toggleCat,
}) => {
  const [selectedPostId, setSelectedPostId] = useState(null);
  const selectedPost = posts.find((post) => post.id === selectedPostId);
  const feedPanel = useRef(null);
  const feedScroll = useRef(null);

  useLayoutEffect(() => {
    if (!feedScroll.current) return;
    restoreScrollPosition(selectedPostId ? null : feedScroll.current, feedPanel.current);
  }, [selectedPostId]);

  // Filter posts based on selected categories passed from parent
  const filtered =
    selectedCats.length === 0
      ? posts
      : posts.filter((p) => selectedCats.includes(p.category));

  const handleViewOriginalPost = (postId) => {
    if (!selectedPostId) {
      feedScroll.current = readScrollPosition(feedPanel.current);
    }
    setSelectedPostId(postId);
  };

  if (selectedPostId) {
    return (
      <div className="view-enter no-scrollbar lg:h-[calc(100vh-35px)] lg:overflow-y-auto px-4 order-2 lg:flex-8 min-w-0">
        <div className="single-post-view lg:mr-3">
          <div className="flex flex-wrap justify-between items-center gap-2 px-2 sm:px-0">
            <h3 className="text-xl font-bold my-5">
              Original Post
            </h3>
            <button
              onClick={() => setSelectedPostId(null)}
              className="back-button glass-lens rounded-full py-2 px-4 my-5 text-sm font-semibold"
            >
              ← Back to Feed
            </button>
          </div>

          {selectedPost ? (
            <Post
              key={selectedPost.id}
              post={selectedPost}
              currentUser={user}
              onDeletePost={onDeletePost}
              onPostShared={onPostShared}
              onViewProfile={onViewProfile}
              onViewOriginalPost={handleViewOriginalPost}
              socket={socket}
            />
          ) : <p>This post is no longer available.</p>}
        </div>
      </div>
    );
  }

  return (
    <section className="view-enter order-2 lg:flex-8 lg:max-h-screen min-w-0">
      <div ref={feedPanel} className="feed lg:overflow-y-auto no-scrollbar lg:h-[calc(100vh-35px)] liquid-glass rounded-3xl mx-2 my-1 lg:mx-0 lg:my-4">
        <div className="feed-intro">
          <header className="feed-welcome glass-lens glass-responsive">
            <h1 className="feed-greeting">
              <span className="feed-greeting-line">Welcome back{user?.name ? "," : ""}</span>
              {user?.name && <>{" "}<span className="feed-greeting-name">{user.name}</span></>}
            </h1>
          </header>
          <CreatePostForm
            onCreatePost={onCreatePost}
            categories={categories}
            currentUser={user}
          />
        </div>

        {/* Category filter UI on the Feed */}
        <div className="feed-filters" role="group" aria-label="Filter posts by category">
          {categories?.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => toggleCat(cat.id)}
              aria-pressed={selectedCats.includes(cat.id)}
              className="feed-filter glass-lens"
            >
              {cat.name}
            </button>
          ))}
        </div>
        <div className="posts-grid p-3 sm:p-4 columns-1 sm:columns-2 gap-4">
          {filtered.length ? (
            filtered.map((post) => (
              <Post
                key={post.id}
                post={post}
                currentUser={user}
                onDeletePost={onDeletePost}
                onPostShared={onPostShared}
                onViewProfile={onViewProfile}
                onViewOriginalPost={handleViewOriginalPost}
                socket={socket}
              />
            ))
          ) : (
            <p className="feed-empty">
              No posts match the selected categories.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default Feed;
