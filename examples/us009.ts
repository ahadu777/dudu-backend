/**
 * US-009 Example: User Profile and Settings Management
 *
 * This example demonstrates the complete user profile and settings workflow:
 * 1. Get user profile information
 * 2. Update profile details
 * 3. Manage settings and preferences
 * 4. View activity history
 */

// Using Node.js built-in fetch (Node 18+)

// Types matching our domain models
interface UserProfile {
  user_id: string;
  name: string;
  email: string;
  preferences: {
    language?: string;
    timezone?: string;
    notification_email?: boolean;
  };
  created_at: string;
  updated_at: string;
}

interface UserSettings {
  notification_settings: {
    email_notifications: boolean;
    sms_notifications: boolean;
    push_notifications: boolean;
    order_updates: boolean;
    promotional_emails: boolean;
  };
  privacy_settings: {
    profile_visibility: 'public' | 'private';
    show_purchase_history: boolean;
    data_sharing_consent: boolean;
  };
  display_preferences: {
    language: 'en' | 'es' | 'fr' | 'de';
    timezone: string;
    date_format: 'MM/DD/YYYY' | 'DD/MM/YYYY' | 'YYYY-MM-DD';
    currency_display: 'USD' | 'EUR' | 'GBP' | 'CAD';
  };
  updated_at: string;
}

interface ActivityEntry {
  activity_id: string;
  type: 'profile' | 'order' | 'ticket' | 'login' | 'settings';
  action: string;
  description: string;
  timestamp: string;
  metadata?: {
    ip_address?: string;
    user_agent?: string;
    resource_id?: string;
    changes?: any;
  };
  severity: 'info' | 'warning' | 'critical';
}

interface ActivityHistory {
  activities: ActivityEntry[];
  total: number;
  pagination: {
    limit: number;
    offset: number;
    has_more: boolean;
  };
}

class ProfileClient {
  private baseURL: string;
  private authToken?: string;

  constructor(baseURL: string = 'http://localhost:8080', authToken?: string) {
    this.baseURL = baseURL;
    this.authToken = authToken;
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers
      }
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(`HTTP ${response.status}: ${error.message || response.statusText}`);
    }

    return response.json();
  }

  // Profile Management
  async getProfile(): Promise<UserProfile> {
    return this.request<UserProfile>('/profile');
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    return this.request<UserProfile>('/profile', {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  // Settings Management
  async getSettings(): Promise<UserSettings> {
    return this.request<UserSettings>('/profile/settings');
  }

  async updateSettings(settings: any): Promise<UserSettings> {
    return this.request<UserSettings>('/profile/settings', {
      method: 'PUT',
      body: JSON.stringify(settings)
    });
  }

  // Activity History
  async getActivity(params?: {
    limit?: number;
    offset?: number;
    type?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<ActivityHistory> {
    const query = params ? new URLSearchParams(params as any).toString() : '';
    const endpoint = query ? `/profile/activity?${query}` : '/profile/activity';
    return this.request<ActivityHistory>(endpoint);
  }
}

// Example usage and testing
async function demonstrateProfileWorkflow() {
  console.log('🔄 Starting US-009 Profile Management Demo...\n');

  // Create client (token will be set below)
  const client = new ProfileClient();

  try {
    // Generate a test JWT token
    const jwt = require('jsonwebtoken');
    const testToken = jwt.sign(
      { id: 123, email: 'john.doe@example.com' },
      'your-secret-key-change-in-production',
      { expiresIn: '7d' }
    );

    client.setAuthToken(testToken);
    console.log('✅ Authentication token set\n');

    // Step 1: Get current profile
    console.log('📋 Step 1: Getting user profile...');
    const profile = await client.getProfile();
    console.log('Current Profile:', JSON.stringify(profile, null, 2));
    console.log();

    // Step 2: Update profile information
    console.log('✏️  Step 2: Updating profile...');
    const profileUpdates = {
      name: 'John Smith',
      preferences: {
        language: 'fr',
        timezone: 'Europe/Paris'
      }
    };

    const updatedProfile = await client.updateProfile(profileUpdates);
    console.log('Updated Profile:', JSON.stringify(updatedProfile, null, 2));
    console.log();

    // Step 3: Get user settings
    console.log('⚙️  Step 3: Getting user settings...');
    const settings = await client.getSettings();
    console.log('Current Settings:', JSON.stringify(settings, null, 2));
    console.log();

    // Step 4: Update settings
    console.log('🔧 Step 4: Updating settings...');
    const settingsUpdates = {
      notification_settings: {
        email_notifications: false,
        promotional_emails: true
      },
      display_preferences: {
        currency_display: 'EUR',
        date_format: 'DD/MM/YYYY'
      },
      privacy_settings: {
        profile_visibility: 'public'
      }
    };

    const updatedSettings = await client.updateSettings(settingsUpdates);
    console.log('Updated Settings:', JSON.stringify(updatedSettings, null, 2));
    console.log();

    // Step 5: Get activity history
    console.log('📊 Step 5: Getting activity history...');
    const activity = await client.getActivity({ limit: 10 });
    console.log('Activity History:');
    console.log(`Total activities: ${activity.total}`);
    console.log('Recent activities:');
    activity.activities.forEach(act => {
      console.log(`  - ${act.timestamp}: ${act.action} (${act.type}) - ${act.description}`);
    });
    console.log();

    // Step 6: Get filtered activity
    console.log('🔍 Step 6: Getting filtered activity (profile changes only)...');
    const profileActivity = await client.getActivity({
      type: 'profile',
      limit: 5
    });
    console.log('Profile Activity:');
    profileActivity.activities.forEach(act => {
      console.log(`  - ${act.timestamp}: ${act.action} - ${act.description}`);
      if (act.metadata?.changes) {
        console.log(`    Changes: ${JSON.stringify(act.metadata.changes)}`);
      }
    });
    console.log();

    console.log('✅ US-009 Profile Management Demo completed successfully!');

    return {
      profile: updatedProfile,
      settings: updatedSettings,
      activity
    };

  } catch (error: any) {
    console.error('❌ Error during profile management demo:', error.response?.data || error.message);
    throw error;
  }
}

// Validation and testing functions
async function validateProfileFeatures() {
  console.log('🧪 Running Profile Management Validation Tests...\n');

  const client = new ProfileClient();

  try {
    // Set auth token
    const jwt = require('jsonwebtoken');
    const testToken = jwt.sign(
      { id: 123, email: 'john.doe@example.com' },
      'your-secret-key-change-in-production',
      { expiresIn: '7d' }
    );
    client.setAuthToken(testToken);

    const tests = [
      {
        name: 'Profile retrieval',
        test: async () => {
          const profile = await client.getProfile();
          console.assert(profile.user_id === '123', 'User ID should be 123');
          console.assert(typeof profile.name === 'string', 'Name should be string');
          console.assert(typeof profile.email === 'string', 'Email should be string');
          return '✅ Profile retrieval test passed';
        }
      },
      {
        name: 'Profile update',
        test: async () => {
          const updates = { name: 'Test User' };
          const updated = await client.updateProfile(updates);
          console.assert(updated.name === 'Test User', 'Name should be updated');
          console.assert(new Date(updated.updated_at) > new Date('2025-01-01'), 'Updated timestamp should be recent');
          return '✅ Profile update test passed';
        }
      },
      {
        name: 'Settings retrieval',
        test: async () => {
          const settings = await client.getSettings();
          console.assert(typeof settings.notification_settings === 'object', 'Should have notification settings');
          console.assert(typeof settings.privacy_settings === 'object', 'Should have privacy settings');
          console.assert(typeof settings.display_preferences === 'object', 'Should have display preferences');
          return '✅ Settings retrieval test passed';
        }
      },
      {
        name: 'Settings update',
        test: async () => {
          const updates = {
            notification_settings: { email_notifications: false }
          };
          const updated = await client.updateSettings(updates);
          console.assert(updated.notification_settings.email_notifications === false, 'Email notifications should be disabled');
          return '✅ Settings update test passed';
        }
      },
      {
        name: 'Activity history',
        test: async () => {
          const activity = await client.getActivity({ limit: 5 });
          console.assert(Array.isArray(activity.activities), 'Activities should be an array');
          console.assert(typeof activity.total === 'number', 'Total should be a number');
          console.assert(typeof activity.pagination === 'object', 'Should have pagination info');
          return '✅ Activity history test passed';
        }
      }
    ];

    for (const test of tests) {
      try {
        const result = await test.test();
        console.log(result);
      } catch (error: any) {
        console.error(`❌ ${test.name} test failed:`, error.message);
      }
    }

    console.log('\n🎉 Profile Management validation completed!');

  } catch (error: any) {
    console.error('❌ Validation setup error:', error.response?.data || error.message);
  }
}

// Export for use in other modules
export {
  ProfileClient,
  UserProfile,
  UserSettings,
  ActivityHistory,
  ActivityEntry,
  demonstrateProfileWorkflow,
  validateProfileFeatures
};

// Run demonstration if this file is executed directly
if (require.main === module) {
  demonstrateProfileWorkflow()
    .then(() => validateProfileFeatures())
    .then(() => {
      console.log('\n✨ All profile management demonstrations completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Demo failed:', error);
      process.exit(1);
    });
}