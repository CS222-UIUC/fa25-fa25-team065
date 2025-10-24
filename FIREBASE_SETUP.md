# Firebase Setup Guide for Splitify

## 🔥 Firebase Configuration Required

Your Splitify app is now connected to Firebase Authentication! Follow these steps to complete the setup:

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project" or "Add project"
3. Enter project name: `splitify-app` (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project"

### 2. Enable Authentication

1. In your Firebase project dashboard, click on "Authentication" in the left sidebar
2. Click "Get started"
3. Go to the "Sign-in method" tab
4. Enable "Email/Password" provider:
   - Click on "Email/Password"
   - Toggle "Enable" to ON
   - Click "Save"

### 3. Get Your Firebase Configuration

1. In your Firebase project, click the gear icon ⚙️ next to "Project Overview"
2. Select "Project settings"
3. Scroll down to "Your apps" section
4. Click the web icon `</>` to add a web app
5. Register your app with a nickname (e.g., "Splitify Web App")
6. Copy the Firebase configuration object

### 4. Update Your App Configuration

Replace the placeholder values in `src/firebase/config.ts` with your actual Firebase config:

```typescript
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "your-sender-id",
  appId: "your-app-id"
};
```

### 5. Test Your Setup

1. Start your development server: `npm start`
2. Navigate to `/register` to create a test account
3. Try logging in with the created account
4. Check the Firebase Console to see registered users

## 🚀 Features Now Available

- ✅ **User Registration**: Create new accounts with email/password
- ✅ **User Login**: Sign in with existing credentials  
- ✅ **Form Validation**: Client-side validation for all inputs
- ✅ **Error Handling**: User-friendly error messages
- ✅ **Session Management**: Automatic login state persistence
- ✅ **Security**: Firebase handles all authentication security

## 🔧 Additional Firebase Features (Optional)

### Email Verification
To require email verification before users can log in:

1. In Firebase Console → Authentication → Settings
2. Enable "Email link (passwordless sign-in)" if desired
3. Configure email templates

### Password Reset
The app already includes a "Forgot password?" link that will work once Firebase is configured.

### User Management
- View all users in Firebase Console → Authentication → Users
- Reset passwords, disable accounts, etc.

## 🛠️ Development Notes

- All authentication is handled by Firebase
- User data is stored in Firebase Auth
- No backend authentication code needed
- Ready for production deployment

## 📱 Next Steps

After Firebase setup, you can:
1. Add user profile management
2. Implement protected routes
3. Connect to your backend APIs
4. Add social login (Google, Facebook, etc.)

---

**Need Help?** Check the [Firebase Documentation](https://firebase.google.com/docs/auth/web/start) for more details.
