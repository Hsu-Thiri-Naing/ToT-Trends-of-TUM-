<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Pagination\LengthAwarePaginator;

class FollowController extends Controller
{
    /**
     * Follow a user.
     */
    public function follow(User $user)
    {
        // Prevent users from following themselves
        if (auth()->id() == $user->id) {
            return response()->json(['message' => 'You cannot follow yourself'], 400);
        }

        // Check if already following
        if (auth()->user()->isFollowing($user)) {
            return response()->json(['message' => 'You are already following this user'], 400);
        }

        auth()->user()->follow($user);

        return response()->json([
            'message' => 'Successfully followed user',
            'is_mutual_follow' => $user->isFollowing(auth()->user()),
        ]);
    }

    /**
     * Unfollow a user.
     */
    public function unfollow(User $user)
    {
        // Prevent users from unfollowing themselves
        if (auth()->id() == $user->id) {
            return response()->json(['message' => 'You cannot unfollow yourself'], 400);
        }

        // Check if not following
        if (!auth()->user()->isFollowing($user)) {
            return response()->json(['message' => 'You are not following this user'], 400);
        }

        auth()->user()->unfollow($user);

        return response()->json([
            'message' => 'Successfully unfollowed user',
            'is_mutual_follow' => false,
        ]);
    }

    /**
     * Get the followers of a user.
     */
    public function followers(User $user)
    {
        return response()->json($this->addFollowStatus($user->followers()->paginate(20)));
    }

    /**
     * Get the users that a user is following.
     */
    public function following(User $user)
    {
        return response()->json($this->addFollowStatus($user->following()->paginate(20)));
    }

    private function addFollowStatus(LengthAwarePaginator $page): LengthAwarePaginator
    {
        $members = $page->getCollection();
        $followingIds = auth()->user()->following()
            ->whereIn('users.id', $members->modelKeys())
            ->pluck('users.id')
            ->flip();

        $members->each(function (User $member) use ($followingIds) {
            $member->is_following = $followingIds->has($member->id);
        });

        return $page;
    }
}
