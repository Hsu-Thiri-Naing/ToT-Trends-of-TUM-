# TrendsOfTUM-2025 (TOTv2)

TrendsOfTUM-2025 is a modern, full-stack social media web application designed to connect users through posts, real-time messaging, and interactive discussions. Built with a stunning **Glassmorphism UI**, this platform offers a premium user experience while relying on a robust tri-stack architecture.

## 🏗️ Architecture Overview

The project is split into three distinct, decoupled services:

1. **Frontend (`tot-frontend`)**: A responsive, fast, and interactive user interface built with React and Vite. It heavily utilizes Tailwind CSS to achieve its signature glassmorphism aesthetic.
2. **Backend API (`api.totumdy.com`)**: A powerful REST API built with Laravel. It handles business logic, user authentication (via Sanctum), database migrations, and media uploads.
3. **Real-time Server (`chat-server-nodejs-v2`)**: A Node.js and Socket.IO server dedicated to managing persistent WebSocket connections for real-time chat, live comments, and instantaneous reactions.

## ✨ Key Features

* **Authentication System**: Secure registration and login using Laravel Sanctum API tokens.
* **Dynamic Feed & Categories**: Filter posts seamlessly by predefined categories (News, Memes, Entertainment, Study, Announcements).
* **Rich Media Posts**: Support for uploading and sharing text, images, videos, and audio.
* **Real-time Interactions**:
  * Live updates for **Comments** on posts.
  * Instant synchronized **Reactions** (Like, Sad, Angry).
* **Follow System**: Build your network by following and unfollowing users.
* **Real-time Chat**: Private, real-time one-on-one messaging available exclusively between mutual followers.
* **Profile Management**: Update your avatar/profile picture and username.

---

## Local development with OpenCode

~~~sh
git clone https://github.com/AungPhyoeNaing/tot-project-show.git
cd tot-project-show
opencode
~~~

OpenCode ထဲမှာ **ဒီ project ကို local dev နဲ့ run ပေးပါ** လို့ရေးပါ။ Repo ရဲ့ [AGENTS.md](AGENTS.md) အတိုင်း agent က setup လုပ်ပြီး frontend, API နဲ့ chat server ကို စစ်ပေးပါမယ်။

On Windows, you can also start everything directly from the repository root:

~~~powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Start-Portfolio.ps1
~~~

First setup needs internet and WinGet if PHP or Node.js is missing. Windows may ask for installer approval. On macOS or Linux, see the prerequisites in [AGENTS.md](AGENTS.md), then run `bash scripts/start-local.sh`.

Open [the local app](http://127.0.0.1:5173). Sign in as **maya@tot.com** with **TotPortfolio1!**. Sign in as **leo@tot.com** in a private window with the same password to try live chat. The launcher prints how to stop the services.

The repo includes a populated SQLite demo snapshot. First startup copies it to `api.totumdy.com/database/portfolio.sqlite`. Local changes and uploads stay on each machine between runs.

## 🛠️ Tech Stack Details

### Frontend (`tot-frontend`)
* **Framework**: React 18
* **Build Tool**: Vite
* **Styling**: Tailwind CSS (customized for glassmorphism)
* **API Client**: Axios
* **WebSockets**: Socket.IO-Client

### Backend (`api.totumdy.com`)
* **Framework**: Laravel 10.x
* **Database**: SQLite (Configured for local development)
* **Authentication**: Laravel Sanctum
* **File Storage**: Local Storage (`storage/app/public`)

### Real-time Server (`chat-server-nodejs-v2`)
* **Environment**: Node.js
* **Framework**: Express
* **WebSockets**: Socket.IO

---

## 🐛 Troubleshooting

* **Media Not Showing**: If images or videos are returning 404 errors, ensure you ran `php artisan storage:link` inside the `api.totumdy.com` folder.
* **CORS Errors**: The backend is configured to accept requests from `http://localhost:5173` and `http://127.0.0.1:5173`. If you run the frontend on a different port, update the `allowed_origins` in `api.totumdy.com/config/cors.php`.
* **Chat/Live Updates Not Working**: Ensure the Node.js server is actively running on port 3001 and that no firewall is blocking WebSocket connections.

---
*Developed for TrendsOfTUM-2025*
