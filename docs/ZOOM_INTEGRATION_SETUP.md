# Zoom Meeting Integration Setup

This guide explains how to set up Zoom meeting integration for lessons in the RedPanda Learns platform.

## Overview

The Zoom integration allows instructors to create live video lessons using Zoom meetings. Students can join these meetings directly from the lesson interface with role-based access (host for admins/instructors, attendee for students).

## Architecture

### Backend Components

- **Signature Generation**: `functions/src/handlers/zoom/generateZoomSignature.ts`
  - Generates secure Zoom SDK signatures
  - Validates user authentication and role
  - Returns signature, SDK key, and role

### Frontend Components

- **ZoomMeeting Component**: `src/components/lesson/ZoomMeeting.tsx`
  - Handles Zoom SDK integration
  - Manages meeting lifecycle
  - Provides join/leave controls

- **useZoomMeeting Hook**: `src/hooks/useZoomMeeting.ts`
  - Manages Zoom meeting state
  - Handles signature requests
  - Provides meeting controls

- **Zoom Signature Service**: `src/services/zoom/zoomSignatureService.ts`
  - API client for signature requests

## Setup Steps

### 1. Install Dependencies

```bash
npm install @zoom/meetingsdk
```

### 2. Configure Environment Variables

Add these secrets to your Firebase Functions environment:

```bash
# Zoom SDK Secret (for signature generation)
ZOOM_SDK_SECRET=your_zoom_sdk_secret_here

# Zoom SDK Key (public key for frontend)
ZOOM_SDK_KEY=your_zoom_sdk_key_here
```

### 3. Get Zoom Credentials

1. **Create Zoom App**:
   - Go to [Zoom Marketplace](https://marketplace.zoom.us/)
   - Create a new SDK app
   - Choose "Meeting SDK" type

2. **Configure App**:
   - Set redirect URLs
   - Enable required scopes
   - Get SDK Key and SDK Secret

3. **Store Secrets**:
   - Add `ZOOM_SDK_SECRET` to Firebase Functions secrets
   - Add `ZOOM_SDK_KEY` to your environment variables

### 4. Update Firebase Functions

The signature generation handler is already created. Make sure it's exported in `functions/src/index.ts`:

```typescript
import { generateZoomSignature } from "./handlers/zoom/generateZoomSignature";

export {
  // ... other exports
  generateZoomSignature,
};
```

### 5. Deploy Functions

```bash
cd functions
npm run deploy
```

## Usage

### Creating Zoom Lessons

1. **Create Meeting**: Use the existing `createZoomMeeting` endpoint to create Zoom meetings
2. **Store in Lesson**: Save the Zoom meeting details in the lesson's `zoom` field:

```typescript
const lessonData = {
  title: "Live Q&A Session",
  type: LESSON_TYPE.ZOOM_MEETING,
  zoom: {
    meetingId: "123456789",
    passcode: "pass123",
    encryptedPasscode: "encrypted_pass",
    startTime: Timestamp.now(),
    duration: 60,
    hostUserId: "instructor@school.com",
  },
};
```

### Student Experience

1. **View Lesson**: Students see the Zoom meeting interface
2. **Join Meeting**: Click "Join Meeting" to enter
3. **Role Assignment**: Automatically joined as attendee (role 0)
4. **Complete Lesson**: Can mark as complete after participating

### Instructor Experience

1. **Host Privileges**: Instructors join as host (role 1)
2. **Meeting Controls**: Full Zoom host controls available
3. **Management**: Can manage participants, recordings, etc.

## Security Features

### Backend Security

- ✅ **Authentication Required**: All signature requests require valid JWT
- ✅ **Role Validation**: User role determines host/attendee privileges
- ✅ **Signature Generation**: Secure HMAC-SHA256 signatures
- ✅ **No Secret Exposure**: SDK secrets never sent to frontend

### Frontend Security

- ✅ **Signature Request**: Frontend requests signatures from backend
- ✅ **No Direct API Access**: Cannot create meetings or access Zoom APIs
- ✅ **Role Enforcement**: Cannot override assigned role

## Troubleshooting

### Common Issues

1. **"SDK not loaded"**:
   - Check network connection
   - Verify Zoom CDN is accessible
   - Try refreshing the page

2. **"Failed to get signature"**:
   - Check user authentication
   - Verify backend is deployed
   - Check Firebase Functions logs

3. **"Invalid meeting"**:
   - Verify meeting ID exists
   - Check if meeting has expired
   - Confirm passcode is correct

4. **"Permission denied"**:
   - Check user role assignment
   - Verify Zoom app permissions
   - Confirm meeting allows participants

### Debug Mode

Enable debug logging in the ZoomMeeting component:

```typescript
// In ZoomMeeting.tsx, set enableLogger: true
ZoomMtg.init({
  // ... other options
  enableLogger: true,
  loggerLevel: "debug",
});
```

## API Reference

### Signature Request

```typescript
POST /generateZoomSignature
Authorization: Bearer <idToken>
Content-Type: application/json

{
  "meetingId": "123456789"
}
```

**Response**:

```json
{
  "success": true,
  "data": {
    "signature": "eyJhbGciOiJIUzI1NiIs...",
    "sdkKey": "your_sdk_key",
    "role": 0
  }
}
```

### Zoom Meeting Data Structure

```typescript
interface ZoomInfo {
  meetingId: string; // Zoom meeting number
  hostUserId?: string; // Host email/user ID
  passcode?: string; // Meeting passcode
  encryptedPasscode?: string; // Preferred for SDK
  startTime: Timestamp; // Meeting start time
  duration: number; // Duration in minutes
}
```

## Best Practices

1. **Meeting Creation**:
   - Create meetings in advance with proper scheduling
   - Use encryptedPasscode for better security
   - Set appropriate waiting rooms and participant settings

2. **User Experience**:
   - Provide clear meeting information (time, duration, agenda)
   - Handle network issues gracefully
   - Show appropriate loading states

3. **Security**:
   - Regularly rotate Zoom SDK credentials
   - Monitor meeting access logs
   - Use role-based access control

4. **Performance**:
   - Load Zoom SDK only when needed
   - Clean up resources on component unmount
   - Handle meeting end events properly

## Support

For issues with Zoom integration:

1. Check Firebase Functions logs
2. Verify Zoom app configuration
3. Test with Zoom's SDK documentation
4. Contact Zoom support for SDK-specific issues
