// src/App.jsx (Updated with online status state and listeners)
import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import io from "socket.io-client"; // <-- Import Socket.IO Client
import apiClient from "./api/apiClient";
import Header from "./components/layout/Header.jsx";
import Login from "./components/auth/Login.jsx";
import Register from "./components/auth/Register.jsx";
import Feed from "./components/feed/Feed.jsx";
import UserList from "./components/profile/UserList.jsx"; // Make sure this is the updated UserList
import ProfileView from "./components/profile/ProfileView.jsx";
import Chat from "./components/chat/Chat.jsx";
import EditProfile from "./components/profile/EditProfile.jsx"; // Import the new component
import PasswordResetRequest from "./components/auth/PasswordResetRequest.jsx"; // Import the new component
import ReportUser from "./components/auth/ReportUser.jsx"; // Import the new component
// --- IMPORT THE NEW FUNCTION ---
import { logout, updateProfile } from "./api/authService"; // Import updateProfile
// --- END IMPORT ---
import { deletePost } from "./api/postService";
import CATEGORIES from "./config/categories.js";
import useProfileDetails from "./hooks/useProfileDetails";
import { readScrollPosition, restoreScrollPosition } from "./utils/scrollPosition";
import "./App.css";

const FEED_CACHE_MS = 30_000;

function updateMembership(members, member, include) {
    const exists = members.some((item) => item.id === member.id);
    if (exists === include) return members;
    return include ? [member, ...members] : members.filter((item) => item.id !== member.id);
}

export default function App() {
    const [user, setUser] = useState(null);
    const [posts, setPosts] = useState([]);
    const categories = CATEGORIES;
    const [token, setToken] = useState(() => localStorage.getItem("token"));
    const [usersList, setUsersList] = useState([]); // This holds the full user list from API
    // --- NEW STATE: For online users ---
    const [onlineUsers, setOnlineUsers] = useState(new Set());
    // --- END NEW STATE ---
    // Initialize loading to true
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [authView, setAuthView] = useState("login");
    const [currentView, setCurrentView] = useState("feed");
    const [profileUser, setProfileUser] = useState(null);
    const [chatWithUser, setChatWithUser] = useState(null);

    const [followChanges, setFollowChanges] = useState({});
    const followRequests = useRef(new Map());
    const navigation = useRef(0);
    const feedScroll = useRef(null);
    const feedLoadedAt = useRef(0);

    // --- NEW STATE: For new views ---
    const [extraView, setExtraView] = useState(null); // Can be 'passwordResetRequest', 'reportUser', etc.
    const [reportingUserId, setReportingUserId] = useState(null); // Store user ID to report if initiated from profile
    const [reportingUserName, setReportingUserName] = useState(null);
    // --- END NEW STATE ---

    // --- State for Socket.IO connection ---
    const [socket, setSocket] = useState(null);
    // --- End Socket.IO state ---

    // --- NEW STATE: For category filtering ---
    const [selectedCats, setSelectedCats] = useState([]);
    // --- END NEW STATE ---

    const userId = user?.id;
    const profileId = profileUser?.id;
    const { profile, profileError, retryProfile, clearProfiles } = useProfileDetails(
        userId,
        profileId,
        currentView === "profile" && !extraView,
    );

    const profileChange = followChanges[profileId];
    const displayedProfileUser = profileId === userId
        ? user
        : usersList.find((item) => item.id === profileId) ?? profileUser;
    const isFollowingProfile = profileChange?.following ?? displayedProfileUser?.is_following ?? false;
    const canMessageProfile = isFollowingProfile && (profileChange?.mutual ?? profile?.isMutualFollow ?? false);
    const profileData = profile && {
        ...profile,
        followers: profileChange && user
            ? updateMembership(profile.followers, user, profileChange.following)
            : profile.followers,
        following: profileId === userId
            ? Object.values(followChanges).reduce(
                (members, change) => updateMembership(members, change.user, change.following),
                profile.following,
            )
            : profile.following,
    };

    function goToView(nextView) {
        navigation.current += 1;
        if (currentView === "feed" && nextView !== "feed") {
            feedScroll.current = readScrollPosition(document.querySelector(".feed"));
        }
        setCurrentView(nextView);
    }

    useLayoutEffect(() => {
        const feed = currentView === "feed" && !extraView;
        restoreScrollPosition(
            feed ? feedScroll.current : null,
            feed ? document.querySelector(".feed") : null,
        );
    }, [currentView, profileId, extraView, userId]);

    const toggleCat = (id) =>
        setSelectedCats((prev) =>
            prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
        );

    // --- NEW HANDLERS: For navigating to new views ---
    const handleSwitchToPasswordResetRequest = () => {
        setExtraView("passwordResetRequest");
    };

    const handleSwitchToReportUser = (userId = null, userName = null) => {
        // Accept optional user ID
        setReportingUserId(userId); // Store the user ID to report
        setReportingUserName(userName);
        navigation.current += 1;
        setExtraView("reportUser");
    };

    const handleBackToFeedFromReportUser = () => {
        setExtraView(null); // Go back to the feed view
        goToView("feed");
        setReportingUserId(null); // Clear the reported user ID
        setReportingUserName(null);
    };
    // --- END NEW HANDLERS ---

    // --- Handler Functions ---
    const handleAuthSuccess = (token, user) => {
        localStorage.setItem("token", token);
        setUser(user);
        setError(null);
        setAuthView("login");
        setExtraView(null); // Clear any extra views on successful login
        setLoading(true);
        setToken(token);
    };

    const handleLogout = async () => {
        try {
            await logout();
        } finally {
            // --- Disconnect Socket.IO on logout ---
            if (socket) {
                socket.disconnect();
                setSocket(null);
                console.log("Socket.IO disconnected on logout");
            }
            // --- End Socket.IO disconnect ---
            localStorage.removeItem("token");
            setToken(null);
            setUser(null);
            setPosts([]);
            setUsersList([]);
            // --- Clear online users on logout ---
            setOnlineUsers(new Set());
            // --- End clear ---
            setCurrentView("feed");
            setExtraView(null); // Clear extra views
            setChatWithUser(null);
            setProfileUser(null);
            clearProfiles();
            for (const controller of followRequests.current.values()) controller.abort();
            followRequests.current.clear();
            setFollowChanges({});
            navigation.current += 1;
            feedLoadedAt.current = 0;
            feedScroll.current = null;
            setError(null);
            // Reset category filters on logout
            setSelectedCats([]);
        }
    };

    const handleCreatePost = async (postData) => {
        try {
            const response = await apiClient.post("/posts", postData);
            setPosts((prev) => [response.data, ...prev]);
            clearProfiles();
        } catch (err) {
            console.error("Create post error:", err);
            throw err;
        }
    };

    const handleDeletePost = async (postId) => {
        if (!window.confirm("Are you sure you want to delete this post?")) {
            return;
        }

        try {
            await deletePost(postId);
            setPosts((prevPosts) =>
                prevPosts.filter((post) => post.id !== postId)
            );
            clearProfiles();
        } catch (err) {
            console.error("Error deleting post:", err);
            setError("Failed to delete post.");
        }
    };

    const handleSharedPost = (sharedPost) => {
        setPosts((previous) => [
            sharedPost,
            ...previous.map((post) => post.id === sharedPost.shared_post?.id
                ? { ...post, shares_count: (post.shares_count ?? 0) + 1 }
                : post),
        ]);
        clearProfiles();
    };

    const initiateChat = async (userToChatWith) => {
        const request = ++navigation.current;
        try {
            const { data } = await apiClient.get(
                "/users/" + userId + "/is-mutual-follow/" + userToChatWith.id
            );
            if (request !== navigation.current) return;
            if (!data.is_mutual_follow) {
                setError("You can chat once you follow each other.");
                return;
            }
            setError(null);
            setChatWithUser(userToChatWith);
            goToView("chat");
        } catch {
            if (request === navigation.current) {
                setError("Could not check whether chat is available. Try again.");
            }
        }
    };

    const viewProfile = (id, knownUser) => {
        if (!id) return;
        const identity = id === userId ? user : usersList.find((item) => item.id === id) ?? knownUser;
        setProfileUser(identity ?? { id, name: "User" });
        setError(null);
        goToView("profile");
    };

    const changeFollow = async (target, following) => {
        if (followRequests.current.has(target.id)) return;

        const controller = new AbortController();
        followRequests.current.set(target.id, controller);
        const previous = followChanges[target.id];
        setError(null);
        setFollowChanges((changes) => ({
            ...changes,
            [target.id]: { user: target, following, pending: true, mutual: false },
        }));

        try {
            const { data } = await apiClient.post("/" + (following ? "follow/" : "unfollow/") + target.id, null, {
                signal: controller.signal,
            });
            if (controller.signal.aborted) return;
            setFollowChanges((changes) => ({
                ...changes,
                [target.id]: { user: target, following, pending: false, mutual: data.is_mutual_follow },
            }));
        } catch {
            if (controller.signal.aborted) return;
            setFollowChanges((changes) => {
                const restored = { ...changes };
                if (previous) restored[target.id] = previous;
                else delete restored[target.id];
                return restored;
            });
            setError(following ? "Failed to follow user. Try again." : "Failed to unfollow user. Try again.");
        } finally {
            if (followRequests.current.get(target.id) === controller) {
                followRequests.current.delete(target.id);
            }
        }
    };

    // --- NEW HANDLER: Navigate to Edit Profile view ---
    const handleGoToEditProfile = () => {
        if (user) {
            goToView("editProfile");
        }
    };

    // --- NEW HANDLER: Update user profile via API (Updated to use authService) ---
    const handleUpdateProfile = async ({ username, profilePicture }) => {
        if (!user) {
            throw new Error("User not authenticated.");
        }

        // Prepare data object to pass to the service function
        const profileUpdateData = { username, profilePicture };

        // Check if there's anything to update *before* making the call
        if (
            (profileUpdateData.username === undefined ||
                profileUpdateData.username === user.name) &&
            !(profileUpdateData.profilePicture instanceof File)
        ) {
            console.log("No changes made to profile data.");
            return; // Exit early if no changes
        }

        try {
            // Call the new function in authService
            const response = await updateProfile(profileUpdateData);

            console.log("API Response:", response.data); // Log the full response

            // Update the local user state with the response data
            // Assumes the backend returns the updated user object, potentially under a 'user' key
            const updatedUserData = response.data.user || response.data; // Fallback
            setUser(updatedUserData);

            clearProfiles();

            console.log("Profile updated successfully via API!");
            // Optionally, you could show a success message to the user here
        } catch (err) {
            console.error("Full Error Object:", err); // Log the full error object
            console.error("Error updating profile via API:");

            let errorMessage =
                "Failed to update profile. Please try again later.";

            if (err.response) {
                // Server responded with error status
                console.error("- Status:", err.response.status);
                console.error("- Headers:", err.response.headers);
                console.error("- Data:", err.response.data);

                if (err.response.data && err.response.data.message) {
                    errorMessage = err.response.data.message;
                } else if (
                    err.response.data &&
                    typeof err.response.data === "object"
                ) {
                    // Handle validation errors (e.g., { name: ['The name field is required.'] })
                    errorMessage =
                        Object.values(err.response.data).flat().join(", ") ||
                        errorMessage;
                }
            } else if (err.request) {
                // Request made but no response received (network error)
                console.error("- Request (no response):", err.request);
                errorMessage =
                    "Network error. Please check your connection and try again.";
            } else {
                // Something else happened in setting up the request
                console.error("- Message:", err.message);
            }

            // Throw the constructed error message so the EditProfile component can catch it
            throw new Error(errorMessage);
        }
    };
    // --- END NEW HANDLERS ---

    // --- Modified useEffect Hook: Auth check, data fetch, and Socket.IO setup ---
    useEffect(() => {
        let isMounted = true; // Flag to prevent state updates if component unmounts
        let newSocketInstance = null; // Keep track of the socket instance locally for cleanup

        const initializeApp = async () => {
            // Always start loading when the effect runs (unless no token)
            if (!token) {
                if (isMounted) {
                    setLoading(false); // Explicitly set loading false if no token initially
                }
                return; // Exit early if no token
            }

            try {
                // setLoading(true); // No need to set it again here, already true initially
                console.log("Fetching user with token..."); // Debug log

                // 1. Authenticate and fetch user data
                const userResponse = await apiClient.get("/user");
                console.log("User fetched:", userResponse.data); // Debug log
                if (!isMounted) return; // Stop if component unmounted

                setUser(userResponse.data);

                const isTotDomain =
                    window.location.hostname === "totumdy.com" ||
                    window.location.hostname?.endsWith(".totumdy.com");
                const socketUrl =
                    import.meta.env.VITE_SOCKET_URL ||
                    (isTotDomain
                        ? `${window.location.protocol || "https:"}//chat.totumdy.com`
                        : `http://${window.location.hostname || "localhost"}:3001`);

                newSocketInstance = io(socketUrl, {
                    auth: {
                        token: token, // Pass Sanctum token for authentication
                    },
                });

                // Update state with the new socket instance
                setSocket(newSocketInstance);

                // --- Define named listener functions for explicit cleanup ---
                const handleConnect = () => {
                    setError((previous) =>
                        previous === "Real-time updates unavailable." ? null : previous
                    );
                };

                // --- NEW LISTENERS: For online/offline status ---
                const handleOnlineList = (userIds) => {
                    console.log(
                        "[Socket] Initial online list received:",
                        userIds
                    );
                    if (isMounted) {
                        setOnlineUsers(new Set(userIds));
                    }
                };

                const handleUserOnline = ({ userId }) => {
                    console.log("[Socket] User came online:", userId);
                    if (isMounted) {
                        setOnlineUsers((prev) => new Set(prev).add(userId));
                    }
                };

                const handleUserOffline = ({ userId }) => {
                    console.log("[Socket] User went offline:", userId);
                    if (isMounted) {
                        setOnlineUsers((prev) => {
                            const newSet = new Set(prev);
                            newSet.delete(userId);
                            return newSet;
                        });
                    }
                };
                // --- END NEW LISTENERS ---

                const handleReactionUpdated = (data) => {
                    console.log(
                        "[Socket] Real-time reaction update received:",
                        data
                    );
                    // Update the posts state with the new reaction counts and user reaction
                    setPosts((prevPosts) =>
                        prevPosts.map((post) => {
                            if (post.id === data.post_id) {
                                return {
                                    ...post,
                                    likes_count: data.likes_count,
                                    sads_count: data.sads_count,
                                    angries_count: data.angries_count,
                                    reactions_count: data.reactions_count,
                                    ...(Object.prototype.hasOwnProperty.call(data, "user_reaction")
                                        ? { user_reaction: data.user_reaction }
                                        : {}),
                                };
                            }
                            return post;
                        })
                    );
                };

                const handleCommentAdded = (newComment) => {
                    console.log(
                        "[Socket] Real-time comment added (Global Listener):",
                        newComment
                    );
                    // Update the comment count for the relevant post
                    setPosts((prevPosts) =>
                        prevPosts.map((post) => {
                            if (post.id === newComment.post_id) {
                                // --- FIX: Ensure count is treated as a number ---
                                const currentCount =
                                    Number(post.comments_count) || 0;
                                const newCount = currentCount + 1;
                                console.log(
                                    `[Socket] Incrementing comment count for post ${post.id}. Old: ${currentCount}, New: ${newCount}`
                                );
                                return {
                                    ...post,
                                    comments_count: newCount, // Store the incremented number
                                };
                            }
                            return post;
                        })
                    );
                };

                const handleUserJoined = (newUser) => {
                    console.log("[Socket] New user joined:", newUser);
                    // Add to usersList if not already present
                    setUsersList((prev) => {
                        // Avoid duplicates
                        if (prev.some((u) => u.id === newUser.id)) return prev;
                        return [...prev, newUser];
                    });
                };

                const handleConnectError = (err) => {
                    console.error("[Socket] Connection Error:", err.message);
                    if (isMounted) {
                        setError("Real-time updates unavailable.");
                    }
                };

                const handleDisconnect = (reason) => {
                    console.log(
                        "[Socket] Disconnected from Socket.IO server:",
                        reason
                    );
                };

                // --- Attach the listeners to the new socket instance ---
                newSocketInstance.on("connect", handleConnect);
                // --- NEW LISTENERS: Add the online status listeners ---
                newSocketInstance.on("onlineList", handleOnlineList);
                newSocketInstance.on("userOnline", handleUserOnline);
                newSocketInstance.on("userOffline", handleUserOffline);
                // --- END NEW LISTENERS ---
                newSocketInstance.on("reactionUpdated", handleReactionUpdated);
                newSocketInstance.on("commentAdded", handleCommentAdded);
                newSocketInstance.on("userJoined", handleUserJoined);
                newSocketInstance.on("connect_error", handleConnectError);
                newSocketInstance.on("disconnect", handleDisconnect);

                console.log(
                    "[App.jsx] Socket.IO connection established and listeners attached."
                );

            } catch (error) {
                console.error("App initialization error:", error);
                if (!isMounted) return;
                setError("Could not connect to the API. Refresh to try again.");
            } finally {
                if (isMounted) {
                    setLoading(false); // Set loading to false after everything is done or failed
                    console.log(
                        "App initialization complete, loading set to false."
                    );
                }
            }
        };

        initializeApp();

        // --- Cleanup function for useEffect ---
        return () => {
            isMounted = false; // Set flag on unmount
            console.log("[App.jsx useEffect Cleanup] Running...");

            newSocketInstance?.removeAllListeners();
            newSocketInstance?.disconnect();
        };
    }, [token]);

    useEffect(() => {
        if (!userId || currentView !== "feed" || Date.now() - feedLoadedAt.current < FEED_CACHE_MS) return;
        const controller = new AbortController();
        async function fetchFeed() {
            try {
                const [postsRes, usersRes] = await Promise.all([
                    apiClient.get("/posts", { signal: controller.signal }),
                    apiClient.get("/users", { signal: controller.signal }),
                ]);
                if (controller.signal.aborted) return;
                feedLoadedAt.current = Date.now();
                setPosts(postsRes.data);
                setUsersList(Array.isArray(usersRes.data) ? usersRes.data : []);
            } catch (err) {
                if (controller.signal.aborted) return;
                setError("Failed to load data. Please refresh.");
                console.error("Data fetch error:", err);
            }
        }
        fetchFeed();
        return () => controller.abort();
    }, [userId, currentView]);

    // --- RENDERING LOGIC ---
    if (loading) {
        // This loading check happens *after* the effect has run its course initially
        console.log("App.jsx: Rendering loading screen.");
        return (
            <div className="centered-container min-h-screen">
                <Header
                    user={user}
                    currentView={currentView}
                    currentProfileId={profileId}
                    onGoToFeed={() => goToView("feed")}
                    onGoToMyProfile={() => user && viewProfile(user.id)} // Ensure user exists
                    onGoToChat={() => goToView("chat")}
                    onLogout={handleLogout}
                    // Pass category state and functions
                    categories={categories}
                    selectedCats={selectedCats}
                    toggleCat={toggleCat}
                />
                <main className="centered-main">
                    <article aria-busy="true"></article>
                    <p className="loader"></p>
                </main>
            </div>
        );
    }

    return (
        <div className="centered-container min-h-screen lg:h-screen lg:overflow-hidden">
            <main className="centered-main flex flex-col lg:flex-row gap-2 pb-[72px] lg:pb-0">
                {error && (
                    <div className="error-message text-red-500 cherry-bomb absolute text-sm sm:text-xl left-4 right-4 sm:left-120 sm:right-auto z-99 top-5 text-center">
                        {error}
                    </div>
                )}

                <Header
                    user={user}
                    currentView={currentView}
                    currentProfileId={profileId}
                    onGoToFeed={() => goToView("feed")}
                    onGoToMyProfile={() => user && viewProfile(user.id)} // Ensure user exists
                    onGoToChat={() => goToView("chat")}
                    onLogout={handleLogout}
                    // Pass category state and functions
                    categories={categories}
                    selectedCats={selectedCats}
                    toggleCat={toggleCat}
                />

                {/* --- NEW RENDERING LOGIC: Check for extraView first --- */}
                {extraView === "passwordResetRequest" && (
                    <PasswordResetRequest
                        onBackToLogin={() => {
                            setAuthView("login");
                            setExtraView(null);
                        }}
                    />
                )}

                {extraView === "reportUser" && (
                    <ReportUser
                        onBackToHome={handleBackToFeedFromReportUser} // Or handleBackFromReportUser if you want to go back to where report was initiated
                        reportedUserId={reportingUserId}
                        reportedUserName={reportingUserName}
                    />
                )}

                {/* --- MAIN RENDERING LOGIC: If no extra view, show main views --- */}
                {!extraView && user ? (
                    currentView === "feed" ? (
                        <>
                            {/* Pass the socket instance to Feed and the new handler */}
                            <Feed
                                user={user}
                                posts={posts}
                                categories={categories}
                                onCreatePost={handleCreatePost} // This was likely the missing function
                                onDeletePost={handleDeletePost}
                                onPostShared={handleSharedPost}
                                socket={socket}
                                onViewProfile={viewProfile}
                                onReportUser={handleSwitchToReportUser} // Pass the handler to Feed component if needed for post reports
                                // Pass selected categories to Feed for filtering
                                selectedCats={selectedCats}
                                toggleCat={toggleCat}
                            />
                            {/* Pass the onlineUsers state to UserList */}
                            <UserList
                                users={usersList}
                                currentUser={user}
                                onViewProfile={viewProfile}
                                onChat={initiateChat}
                                onReportUser={handleSwitchToReportUser} // Pass the handler to UserList component
                                // --- PASS THE NEW STATE ---
                                onlineUsers={onlineUsers}
                                // --- END PASS ---
                            />
                        </>
                    ) : currentView === "profile" ? (
                        <ProfileView
                            key={profileId}
                            profileUser={displayedProfileUser}
                            profileData={profileData}
                            onGoToEditProfile={handleGoToEditProfile}
                            currentUser={user}
                            profileError={profileError}
                            onRetry={retryProfile}
                            isFollowing={isFollowingProfile}
                            isMutualFollow={canMessageProfile}
                            followChanges={followChanges}
                            onChangeFollow={changeFollow}
                            onViewProfile={viewProfile}
                            onChat={initiateChat}
                            onReportUser={handleSwitchToReportUser} // Pass the handler to ProfileView component
                        />
                    ) : currentView === "editProfile" ? ( // Render EditProfile component
                        <EditProfile
                            user={user}
                            onUpdateProfile={handleUpdateProfile}
                            onGoToMyProfile={() => viewProfile(user.id)}
                        />
                    ) : currentView === "chat" ? (
                        chatWithUser && chatWithUser.id ? (
                            <>
                                <Chat
                                    key={chatWithUser.id}
                                    currentUserId={user.id}
                                    otherUserId={chatWithUser?.id}
                                    otherUserName={chatWithUser?.name}
                                    otherUserAvatar={chatWithUser.avatar || chatWithUser.profile_picture}
                                    onViewProfile={viewProfile}
                                    isOtherUserOnline={onlineUsers?.has(
                                        chatWithUser.id
                                    )}
                                    socket={socket}
                                    onBackToUserList={() => setChatWithUser(null)}
                                />
                                <div className="hidden lg:block lg:flex-1 lg:h-[calc(100vh-35px)] lg:min-w-52">
                                    <UserList
                                        users={usersList}
                                        currentUser={user}
                                        onViewProfile={viewProfile}
                                        onChat={initiateChat}
                                        onReportUser={handleSwitchToReportUser}
                                        onlineUsers={onlineUsers}
                                    />
                                </div>
                            </>
                        ) : (
                            <>
                                <section className="view-enter order-2 lg:flex-8 lg:h-[calc(100vh-35px)] min-w-0 my-2 lg:my-4 flex flex-col items-center justify-center w-full">
                                    <div className="w-full min-h-[calc(100vh-120px)] sm:min-h-0 sm:w-fit mx-auto my-auto rounded-2xl text-teamcolor bg-[#5978A433]/30 bg-blur-2xl cherry-bomb text-xl overflow-hidden p-10 flex flex-col items-center justify-center">
                                        <h3>You have no recent chats.</h3>
                                        <p className="mb-3">
                                            Connect with trendmates to have some fun!
                                        </p>
                                        <button
                                            onClick={() => goToView("feed")}
                                            className="py-2 px-6 boxshadow2 rounded-xl cursor-pointer"
                                        >
                                            Back
                                        </button>
                                    </div>
                                </section>
                                <UserList
                                    users={usersList}
                                    currentUser={user}
                                    onViewProfile={viewProfile}
                                    onChat={initiateChat}
                                    onReportUser={handleSwitchToReportUser}
                                    onlineUsers={onlineUsers}
                                />
                            </>
                        )
                    ) : null
                ) : (
                    !extraView &&
                    (authView === "login" ? (
                        <Login
                            onLogin={handleAuthSuccess}
                            onSwitchToRegister={() => setAuthView("register")}
                            onSwitchToPasswordResetRequest={
                                handleSwitchToPasswordResetRequest
                            } // Pass the handler
                        />
                    ) : (
                        <Register
                            onRegister={handleAuthSuccess}
                            onSwitchToLogin={() => setAuthView("login")}
                        />
                    ))
                )}
            </main>

        </div>
    );
}
