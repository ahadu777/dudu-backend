# US-009 Integration Runbook: User Profile and Settings Management

## Story Overview
**User Story:** User profile and settings management
**Business Value:** Users can access and manage their profile information and preferences
**Implementation Status:** ✅ Complete and tested

## Prerequisites
- Server running on `http://localhost:8080`
- Valid JWT token for authentication
- User with ID 123 exists in system

## Step-by-Step Integration Guide

### Step 1: Generate Authentication Token
```bash
# Generate a valid JWT token for user 123
export JWT_TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
  { id: 123, email: 'john.doe@example.com' },
  'your-secret-key-change-in-production',
  { expiresIn: '7d' }
);
console.log(token);
")

echo "Token: $JWT_TOKEN"
```

### Step 2: Get User Profile Information
```bash
# GET /profile - Retrieve current user's profile
curl -H "Authorization: Bearer $JWT_TOKEN" \
     http://localhost:8080/profile

# Expected Response:
# {
#   "user_id": "123",
#   "name": "John Doe",
#   "email": "john.doe@example.com",
#   "preferences": {
#     "language": "en",
#     "timezone": "UTC",
#     "notification_email": true
#   },
#   "created_at": "2025-01-01T00:00:00Z",
#   "updated_at": "2025-01-01T00:00:00Z"
# }
```

### Step 3: Update Profile Information
```bash
# PUT /profile - Update user's name and language preference
curl -X PUT \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "name": "John Updated",
       "preferences": {
         "language": "es",
         "timezone": "America/New_York"
       }
     }' \
     http://localhost:8080/profile

# Expected Response:
# {
#   "user_id": "123",
#   "name": "John Updated",
#   "email": "john.doe@example.com",
#   "preferences": {
#     "language": "es",
#     "timezone": "America/New_York"
#   },
#   "created_at": "2025-01-01T00:00:00Z",
#   "updated_at": "[current timestamp]"
# }
```

### Step 4: Get User Settings and Preferences
```bash
# GET /profile/settings - Retrieve user settings
curl -H "Authorization: Bearer $JWT_TOKEN" \
     http://localhost:8080/profile/settings

# Expected Response:
# {
#   "notification_settings": {
#     "email_notifications": true,
#     "sms_notifications": false,
#     "push_notifications": true,
#     "order_updates": true,
#     "promotional_emails": false
#   },
#   "privacy_settings": {
#     "profile_visibility": "private",
#     "show_purchase_history": false,
#     "data_sharing_consent": false
#   },
#   "display_preferences": {
#     "language": "es",
#     "timezone": "America/New_York",
#     "date_format": "MM/DD/YYYY",
#     "currency_display": "USD"
#   },
#   "updated_at": "[current timestamp]"
# }
```

### Step 5: Update User Settings
```bash
# PUT /profile/settings - Update notification and display preferences
curl -X PUT \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "notification_settings": {
         "email_notifications": false,
         "promotional_emails": true
       },
       "display_preferences": {
         "currency_display": "EUR",
         "date_format": "DD/MM/YYYY"
       },
       "privacy_settings": {
         "profile_visibility": "public"
       }
     }' \
     http://localhost:8080/profile/settings

# Expected Response:
# Updated settings object with merged changes
```

### Step 6: Get User Activity History
```bash
# GET /profile/activity - Retrieve activity history (default pagination)
curl -H "Authorization: Bearer $JWT_TOKEN" \
     http://localhost:8080/profile/activity

# GET /profile/activity with filters
curl -H "Authorization: Bearer $JWT_TOKEN" \
     "http://localhost:8080/profile/activity?type=profile&limit=10&offset=0"

# Expected Response:
# {
#   "activities": [
#     {
#       "activity_id": "act_...",
#       "type": "profile",
#       "action": "profile_updated",
#       "description": "User profile was updated",
#       "timestamp": "[ISO timestamp]",
#       "metadata": {
#         "changes": {...}
#       },
#       "severity": "info"
#     }
#   ],
#   "total": 5,
#   "pagination": {
#     "limit": 20,
#     "offset": 0,
#     "has_more": false
#   }
# }
```

## Error Handling Examples

### Invalid Authentication
```bash
# Missing token
curl http://localhost:8080/profile
# Returns: 401 {"code": "UNAUTHORIZED", "message": "No token provided"}

# Invalid token
curl -H "Authorization: Bearer invalid_token" http://localhost:8080/profile
# Returns: 401 {"code": "UNAUTHORIZED", "message": "Invalid token"}
```

### Validation Errors
```bash
# Invalid email format
curl -X PUT \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"email": "invalid-email"}' \
     http://localhost:8080/profile
# Returns: 422 {"code": "VALIDATION_FAILED", "message": "Invalid email format"}

# Invalid language
curl -X PUT \
     -H "Authorization: Bearer $JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"display_preferences": {"language": "invalid"}}' \
     http://localhost:8080/profile/settings
# Returns: 422 {"code": "VALIDATION_FAILED", "message": "Invalid language..."}
```

## Frontend Integration Examples

### JavaScript/TypeScript Client Code
```typescript
// Profile management class
class ProfileAPI {
  private baseURL = 'http://localhost:8080';
  private token: string;

  constructor(token: string) {
    this.token = token;
  }

  private headers() {
    return {
      'Authorization': `Bearer ${this.token}`,
      'Content-Type': 'application/json'
    };
  }

  async getProfile() {
    const response = await fetch(`${this.baseURL}/profile`, {
      headers: this.headers()
    });
    return response.json();
  }

  async updateProfile(updates: any) {
    const response = await fetch(`${this.baseURL}/profile`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(updates)
    });
    return response.json();
  }

  async getSettings() {
    const response = await fetch(`${this.baseURL}/profile/settings`, {
      headers: this.headers()
    });
    return response.json();
  }

  async updateSettings(settings: any) {
    const response = await fetch(`${this.baseURL}/profile/settings`, {
      method: 'PUT',
      headers: this.headers(),
      body: JSON.stringify(settings)
    });
    return response.json();
  }

  async getActivity(params?: {
    limit?: number;
    offset?: number;
    type?: string;
    fromDate?: string;
    toDate?: string;
  }) {
    const query = new URLSearchParams(params as any).toString();
    const response = await fetch(`${this.baseURL}/profile/activity?${query}`, {
      headers: this.headers()
    });
    return response.json();
  }
}

// Usage example
const profileAPI = new ProfileAPI(userToken);

// Get and display profile
const profile = await profileAPI.getProfile();
console.log('User Profile:', profile);

// Update user name
const updatedProfile = await profileAPI.updateProfile({
  name: 'New Name'
});

// Get user settings
const settings = await profileAPI.getSettings();
console.log('User Settings:', settings);

// Update notification preferences
const updatedSettings = await profileAPI.updateSettings({
  notification_settings: {
    email_notifications: false
  }
});

// Get recent activity
const activity = await profileAPI.getActivity({
  type: 'profile',
  limit: 10
});
console.log('Recent Activity:', activity);
```

## Testing Checklist

- [ ] ✅ GET /profile returns user profile data
- [ ] ✅ PUT /profile updates profile successfully
- [ ] ✅ GET /profile/settings returns structured settings
- [ ] ✅ PUT /profile/settings updates settings with validation
- [ ] ✅ GET /profile/activity returns paginated activity log
- [ ] ✅ Authentication required for all endpoints
- [ ] ✅ Input validation works correctly
- [ ] ✅ Error responses follow standard format
- [ ] ✅ Activity logging captures profile changes
- [ ] ✅ Settings merge properly with existing preferences

## Business Rules Validated

- ✅ Only authenticated users can access their own profile
- ✅ Email format validation prevents invalid emails
- ✅ Settings updates preserve existing values not explicitly changed
- ✅ Activity log captures all profile modifications
- ✅ Privacy settings are properly structured and validated
- ✅ Language and currency preferences are constrained to valid values

## Story Completion Status: ✅ COMPLETE

All acceptance criteria met:
- ✅ Users can view their profile information
- ✅ Users can update their profile details
- ✅ Users can access account settings
- ✅ Users can view their account activity/history
- ✅ Profile changes are validated and saved securely

**Ready for frontend integration and production deployment.**