import { useEffect, useState } from "react";
import apiClient from "../api/apiClient";

const PROFILE_CACHE_MS = 30_000;

function collection(data) {
  return Array.isArray(data) ? data : data.data ?? [];
}

export default function useProfileDetails(viewerId, profileId, enabled) {
  const [profiles, setProfiles] = useState({});
  const [loadError, setLoadError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const cached = profiles[profileId];
  const isFresh = cached && Date.now() - cached.loadedAt < PROFILE_CACHE_MS;

  useEffect(() => {
    if (!enabled || !viewerId || !profileId || isFresh) return;

    const controller = new AbortController();
    const options = { signal: controller.signal };
    setLoadError(null);

    async function loadProfile() {
      try {
        const mutualFollow = profileId === viewerId
          ? null
          : apiClient.get("/users/" + profileId + "/is-mutual-follow/" + viewerId, options)
            .catch(() => null);
        const [followers, following, posts, mutual] = await Promise.all([
          apiClient.get("/followers/" + profileId, options),
          apiClient.get("/following/" + profileId, options),
          apiClient.get("/users/" + profileId + "/posts", options),
          mutualFollow,
        ]);

        if (controller.signal.aborted) return;
        setProfiles((previous) => ({
          ...previous,
          [profileId]: {
            followers: collection(followers.data),
            following: collection(following.data),
            posts: collection(posts.data),
            isMutualFollow: mutual?.data.is_mutual_follow ?? false,
            loadedAt: Date.now(),
          },
        }));
      } catch {
        if (!controller.signal.aborted) setLoadError(profileId);
      }
    }
    loadProfile();

    return () => controller.abort();
  }, [viewerId, profileId, enabled, isFresh, attempt]);

  return {
    profile: cached,
    profileError: loadError === profileId,
    retryProfile: () => setAttempt((previous) => previous + 1),
    clearProfiles: () => {
      setProfiles({});
      setLoadError(null);
    },
  };
}
