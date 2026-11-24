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
            <h3 className="py-2 px-3 border-2 rounded-2xl border-teamcolor w-fit cherry-bomb my-6">
              Original Post
            </h3>
            <button
              onClick={() => setSelectedPostId(null)}
              className="back-button boxshadow rounded-2xl py-2 px-3 my-6  cursor-pointer "
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
      <div ref={feedPanel} className="feed lg:overflow-y-auto no-scrollbar lg:h-[calc(100vh-35px)] outline-cyan-50 outline-1 rounded-3xl  w-full mx-auto my-4 bg-gray-400/10 font-balthazar lg:overflow-hidden">
        <div className="border-b border-b-cyan-50 py-2 px-4 sm:px-8">
          <header>
            <h3 className="text-center text-xl sm:text-2xl text-blue-500 font-black mt-3 sm:mt-4">
              Hello, <span className="text-blue-900">{user?.name}</span>! Ready
              to explore?
            </h3>
          </header>
          <CreatePostForm
            onCreatePost={onCreatePost}
            categories={categories}
            currentUser={user}
          />
        </div>

        {/* Category filter UI on the Feed */}
        <div className="flex flex-wrap justify-center gap-2 sm:gap-4 py-4 sm:py-6 px-2 border-b border-white/20 relative z-10">
          {categories?.map((cat) => (
            <button
              key={cat.id}
              onClick={() => toggleCat(cat.id)}
              aria-pressed={selectedCats.includes(cat.id)}
              className={`boxshadow px-2 py-1 sm:px-5 sm:py-2 rounded-full text-xs sm:text-sm font-semibold transition-colors duration-150 backdrop-blur-md shadow-lg ${
                selectedCats.includes(cat.id)
                  ? "text-blue-800 bg-white/65"
                  : "bg-white/40 text-gray-800 border-white/50 hover:bg-white/60"
              }`}
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
            <p className="error-message text-red-400 cherry-bomb mt-10 text-xl">
              No posts match the selected categories.
            </p>
          )}
        </div>
      </div>
    </section>
  );
};

export default Feed;
