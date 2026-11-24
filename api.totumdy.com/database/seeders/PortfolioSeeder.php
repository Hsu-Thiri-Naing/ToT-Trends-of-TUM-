<?php

namespace Database\Seeders;

use App\Models\Message;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class PortfolioSeeder extends Seeder
{
    public function run(): void
    {
        $connection = DB::connection();
        if (!app()->environment('local') || $connection->getDriverName() !== 'sqlite'
            || basename($connection->getDatabaseName()) !== 'portfolio.sqlite') {
            throw new \RuntimeException('Use the local portfolio SQLite database.');
        }

        DB::transaction(function () {
            $accounts = [
                ['maya', 'Maya Chen', 'pf1.jpg'],
                ['leo', 'Leo Park', 'pf2.jpeg'],
                ['nora', 'Nora Lin', 'pf.jpeg'],
                ['sam', 'Sam Reyes', 'pf4.jpeg'],
            ];
            $users = [];
            foreach ($accounts as [$handle, $name, $legacyAvatar]) {
                $user = User::firstOrCreate(['email' => "$handle@tot.com"], [
                    'name' => $name,
                    'recovery_email' => "$handle@example.test",
                    'password' => Hash::make('TotPortfolio1!'),
                ]);
                if ($user->avatar === "/assets/images/$legacyAvatar") {
                    $user->update(['avatar' => null]);
                }
                $users[$handle] = $user;
            }

            foreach ($users as $user) {
                $peers = collect($users)->where('id', '!=', $user->id)->pluck('id');
                $user->following()->syncWithoutDetaching($peers);
            }

            $posts = [
                ['nora', 'memes', 'The campus printers know exactly when an assignment is due.'],
                ['sam', 'news', 'The student maker club has opened signups for next week. Bring a project idea or come help build one.'],
                ['leo', 'study', 'Study group on Thursday at 4 in the library. I can bring the practice questions.'],
                ['nora', 'entertainment', 'Outdoor movie night on the quad this Friday. Bring a blanket and vote for the first film.'],
                ['maya', 'announcement', 'Welcome to Trends of TUM! Share campus news, find a study group, and meet your Trendmates.'],
            ];
            foreach ($posts as $index => [$handle, $category, $body]) {
                $post = $users[$handle]->posts()->firstOrCreate(
                    ['body' => $body, 'category' => $category],
                    $category === 'announcement' ? ['media_url' => '/tot.jpg', 'media_type' => 'image'] : []
                );
                if ($post->wasRecentlyCreated) {
                    $post->created_at = now()->subHours(12 - $index * 2);
                    $post->save();
                }
                if ($category === 'study') {
                    $post->comments()->firstOrCreate([
                        'user_id' => $users['maya']->id,
                        'body' => 'I can bring the week four notes.',
                    ]);
                    $post->reactions()->firstOrCreate(['user_id' => $users['nora']->id], ['type' => 'like']);
                    $post->reactions()->firstOrCreate(['user_id' => $users['sam']->id], ['type' => 'like']);
                }
            }

            $messages = [
                ['leo', 'maya', 'Hey Maya! Are you joining the library study group?'],
                ['maya', 'leo', 'Yes! I can bring the week four notes.'],
                ['leo', 'maya', 'Great, I will save us a table. See you at 4!'],
            ];
            foreach ($messages as $index => [$sender, $recipient, $content]) {
                $message = Message::firstOrCreate([
                    'sender_id' => $users[$sender]->id,
                    'recipient_id' => $users[$recipient]->id,
                    'content' => $content,
                ]);
                if ($message->wasRecentlyCreated) {
                    $message->created_at = now()->subMinutes(30 - $index * 5);
                    $message->save();
                }
            }
        });
    }
}
