# Official PART Website files
The client files for the [official PART website](https://parttelescopes.web.app/).

## Run locally
Serve the public folder from a local web server (recommended for ES modules and Firebase):

1. Open terminal in this folder.
2. Run `python3 -m http.server 8080 --directory public`
3. Open `http://localhost:8080`

## Firebase News + Admin setup
The site now includes:

1. `Latest News` section backed by Cloud Firestore collection `news`
2. `Admin Console` login using Firebase Authentication (email/password)
3. Admin-only news publishing

### 1. Configure Firebase client keys
Edit `public/main.js` and fill `firebaseConfig` with values from Firebase project settings.

### 2. Set admin emails
In `public/main.js`, add allowed admin addresses to `adminEmails`.

### 3. Create Firestore collection
Create collection `news` with documents using fields:

1. `title` (string)
2. `body` (string)
3. `link` (string, optional)
4. `authorEmail` (string)
5. `createdAt` (timestamp)

### 4. Firestore rules (example)
Use rules similar to:

```txt
rules_version = '2';
service cloud.firestore {
	match /databases/{database}/documents {
		match /news/{doc} {
			allow read: if true;
			allow create: if request.auth != null
				&& request.auth.token.email in ['admin@example.com'];
			allow update, delete: if false;
		}
	}
}
```

### 5. Enable auth provider
Enable Email/Password under Firebase Authentication -> Sign-in method.

## Acknowledgements to
1. Kevin Fang as the main developer
2. Firebase for their no-cost static hosting
3. Google fonts

*Licensed under the MIT License. Refer to LICENSE for the full t&cs.*
