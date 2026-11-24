# Running this project in OpenCode

When asked to set up or run the project locally, work from the repository root. Start the services, check them, and give the user the frontend URL, demo credentials and stop command. Keep the services running after the checks.

## Windows

Run this command from the root. Allow several minutes on the first install.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\Start-Portfolio.ps1
```

The launcher checks ports, uses WinGet for missing PHP and Node, loads PHP extensions, installs locked Composer and npm packages, copies the bundled demo database on first use, migrates the working copy and starts Laravel, Socket.IO and the Vite development server. If a package installer prompts for elevation, let the user respond. If WinGet is unavailable, install Microsoft App Installer or provision PHP 8.2+, Node 22.12+ and npm with the available system package manager, then rerun. Composer can be installed by the launcher. Internet is needed on first setup.

If ports are occupied, inspect the listening processes and their working project before starting another instance. Leave unrelated services alone. Service logs are in `api.totumdy.com/storage/logs/portfolio-*.log`. If the first HTTP checks fail, inspect the logs, fix the reported failure and retry.

## macOS or Linux

Install any missing prerequisites with the host package manager, then use Bash to run `bash scripts/start-local.sh` from the root. Required tools are PHP 8.2+ with PDO SQLite, curl, fileinfo, mbstring, XML and GD, Composer 2, and Node 22.12+ with npm. The launcher runs in the foreground. Use a background terminal for it and retain the PID or terminal so the user can stop it.

## Verify the result

Check that the frontend at http://127.0.0.1:5173 responds, the protected API at http://127.0.0.1:8000/api/posts returns 401 with an Accept application/json header, and the Socket.IO polling endpoint at http://127.0.0.1:3001/socket.io/?EIO=4&transport=polling returns a handshake beginning with 0. Sign in as **maya@tot.com** or **leo@tot.com** using **TotPortfolio1!**. For two-account chat, open the second login in a private window.

The tracked starter is `api.totumdy.com/database/portfolio-demo.sqlite`. Keep it as a template. All runtime writes go to the ignored sibling `portfolio.sqlite`. Keep that file, the local app key and uploads across restarts. Use ordinary migrations for schema changes. Avoid destructive resets or reseeding during startup.
