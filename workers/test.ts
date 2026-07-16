// change-password.js
const admin = require('firebase-admin');

// Initialize Firebase Admin with service account

var serviceAccount = require("/home/trex/Downloads/red-panda-learns-lms-dev-firebase-adminsdk-fbsvc-f99b72acd6.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// HARDCODE YOUR EMAIL HERE
const TARGET_EMAIL = 'crimsonsyrus000@gmail.com'; // Change this to your email

// HARDCODE YOUR NEW PASSWORD HERE
const NEW_PASSWORD = `123456`; // Change this to your password

async function changeUserPassword(email, newPassword) {
  try {
    // Get user by email
    const userRecord = await admin.auth().getUserByEmail(email);
    console.log(`👤 Found user: ${userRecord.email} (UID: ${userRecord.uid})`);
    
    // Update password
    await admin.auth().updateUser(userRecord.uid, {
      password: newPassword
    });
    
    console.log(`✅ Successfully updated password for: ${email}`);
    return { success: true, message: `Password updated for ${email}` };
  } catch (error) {
    console.error('❌ Error:', error.message);
    return { success: false, error: error.message };
  }
}

// Run with hardcoded values
changeUserPassword(TARGET_EMAIL, NEW_PASSWORD);