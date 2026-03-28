# PART Website
Client-side website files for the our official website:
https://parttelescopes.web.app/

## Overview
This project is a static website (HTML/CSS/JS) with Firebase-backed features:

1. Public pages (`Home`, `News`, `Instructions`, `About`)
2. Live news feed from Firestore
3. Admin authentication with Firebase Auth (email/password)
4. Admin-only news publishing UI

No build step is required. Files are served directly from `public/`.

*NOTE: This website is intended to be hosted as a **Firebase app**. We have not tested it on any other hosting option. If you choose a non-Firebase provider to host this application, you may encounter difficulties or bugs not documented in this manual*.

## Table of Contents

1. Requirements
2. Quick Start
3. Project Structure
4. Configuration
5. Firebase Setup
6. Features and Page Behavior
7. Deployment Notes
8. Security Notes
9. Troubleshooting
10. Contributing
11. Credits and License

## Requirements

1. Python 3 (or any static file server)
2. Firebase project with:
	 - Firestore Database
	 - Firebase Authentication (Email/Password enabled)

## Quick Start

1. Open terminal in this repository root.
2. Run:

```bash
python3 -m http.server 8080 --directory public
```

3. Open:

```txt
http://localhost:8080
```

4. Configure runtime values in `public/config/env-config.js`.
5. Refresh the page.

If you choose to run it as a static site:

1. Change the src of the script in all files from `<script type="module" src="scripts/main.js"></script>` to `<script src="scripts/vanilla.js"></script>`.
2. You can directly double-click `public/index.html` to run it statically.
3. Note: static runtimes DO NOT support cloud-based features such as News and Admin.

## Project Structure

```txt
websitefiles/
	README.md
	.gitignore
	public/
		index.html
		news.html
		instructions.html
		about.html
		admin.html
		styles/
			style.css
		scripts/
			main.js
		config/
			env-config.js
			env-config.example.js
		(media assets currently stored in public root)
```

### Structure notes

1. HTML pages load:
	 - `styles/style.css`
	 - `config/env-config.js`
	 - `scripts/main.js`
2. `scripts/main.js` imports from `../main.js` (module wrapper).
3. `styles/style.css` imports from `../style.css` (stylesheet wrapper).
4. `config/env-config.js` is ignored in Git for local/site-specific values.

## Configuration

### Runtime config file

Use `public/config/env-config.js` for runtime values:

```js
window.PART_RUNTIME_CONFIG = {
	PART_FIREBASE_API_KEY: "",
	PART_FIREBASE_AUTH_DOMAIN: "",
	PART_FIREBASE_PROJECT_ID: "",
	PART_FIREBASE_STORAGE_BUCKET: "",
	PART_FIREBASE_MESSAGING_SENDER_ID: "",
	PART_FIREBASE_APP_ID: "",
	PART_FIREBASE_MEASUREMENT_ID: "",
	PART_ADMIN_EMAILS: "admin1@example.com,admin2@example.com"
};
```

### Setup steps

1. Copy values from Firebase Project Settings to `env-config.js`.
2. Set `PART_ADMIN_EMAILS` as comma-separated emails.
3. Keep `env-config.example.js` as a template with blank values.

## Firebase Setup

### 1. Authentication

Enable provider:

1. Open Firebase Console
2. Authentication
3. Sign-in method
4. Enable `Email/Password`

### 2. Firestore collection

Create collection `news` with fields:

1. `title` (string)
2. `body` (string)
3. `link` (string, optional)
4. `authorEmail` (string)
5. `createdAt` (timestamp)

### 3. Firestore rules example

Update emails to your admin list:

```txt
rules_version = '2';
service cloud.firestore {
	match /databases/{database}/documents {
		match /news/{doc} {
			allow read: if true;
			allow create: if request.auth != null
				&& request.auth.token.email in [
					'admin1@example.com',
					'admin2@example.com'
				];
			allow update, delete: if false;
		}
	}
}
```

## Features and Page Behavior

### Home

1. Hero section and project summary
2. Latest news preview from Firestore
3. Partner/support section

### News

1. Live Firestore feed
2. Sorted by `createdAt` descending
3. Optional external link per post

### Instructions

1. Scroll-down step-by-step flow
2. IntersectionObserver reveal transitions
3. Reduced-motion support via `prefers-reduced-motion`

### Admin

1. Login form using Firebase Auth
2. Access restricted by email list in runtime config
3. Publish form writes to Firestore `news`

## Deployment Notes

1. Host as static files (Firebase Hosting, Netlify, GitHub Pages, etc.)
2. Ensure `public/config/env-config.js` is provided in deployed environment
3. If deploying to Firebase Hosting, include `public/config/env-config.js` in hosted files
4. Confirm Auth domain and Firestore rules match deployment project

## Security Notes

1. This is a client-side app. Firebase web config is public by design.
2. Protect write access with Firebase Auth + Firestore rules.
3. Do not rely on front-end checks alone for admin security.
4. Keep rules and admin email list aligned.

## Troubleshooting

### "Firebase is not configured yet"

1. Check `public/config/env-config.js` exists and has values.
2. Confirm HTML loads `config/env-config.js` before `scripts/main.js`.
3. Hard refresh browser (or clear cache).

### News not appearing

1. Verify Firestore `news` collection exists.
2. Check Firestore read rule allows public read.
3. Ensure `createdAt` values are valid timestamps.

### Admin cannot publish

1. Confirm user email is in `PART_ADMIN_EMAILS`.
2. Confirm Email/Password auth is enabled.
3. Confirm Firestore `create` rule allows that email.

### 404 for config files

1. Serve from `public/` root.
2. Use `config/env-config.js` (not dotfiles like `.env` in browser runtime).

## Contributing

1. Keep HTML references consistent with the folder structure.
2. Update `env-config.example.js` when adding new runtime keys.
3. Document any behavior changes in this README.
4. Validate functionality on desktop and mobile.

## Credits and License

### Acknowledgements

1. Kevin Fang as the main developer
2. Yanfu Fan as the co-developer and the PART Contributors
3. Firebase for no-cost static hosting and backend services
4. Science Mentors ACT and Narrabundah College

Licensed under the MIT License. Refer to `LICENSE` for full terms.
