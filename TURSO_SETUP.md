# Turso Database Integration Setup

This guide will help you set up Turso database integration for user storage and configuration options in your STL Slicer application.

## Prerequisites

1. **Turso Account**: Sign up at [turso.tech](https://turso.tech)
2. **Turso CLI**: Install the Turso CLI tool

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash
```

## Setup Steps

### 1. Create a Turso Database

```bash
# Login to Turso
turso auth login

# Create a new database
turso db create stl-slicer

# Get the database URL
turso db show stl-slicer --url

# Create an auth token
turso db tokens create stl-slicer
```

### 2. Configure Environment Variables

Create a `.env.local` file in your project root:

```env
TURSO_DATABASE_URL=your_database_url_from_step_1
TURSO_AUTH_TOKEN=your_auth_token_from_step_1
```

### 3. Initialize the Database

Start your development server:

```bash
npm run dev
```

Then visit `http://localhost:3000/turso-test` and click "Initialize Database" to create the required tables.

Alternatively, you can initialize via API:

```bash
curl -X POST http://localhost:3000/api/db-init
```

### 4. Test the Integration

Visit the test page at `http://localhost:3000/turso-test` to:

1. Test database connection
2. Create/login users
3. Save and load user configurations
4. Test auto-save functionality

## Database Schema

The integration creates three main tables:

### `users`
- `id`: Unique user identifier
- `email`: User email (unique)
- `name`: Optional user name
- `created_at`, `updated_at`: Timestamps

### `user_configs`
- `id`: Configuration ID
- `user_id`: Reference to users table
- `config_name`: Configuration name (default: 'default')
- Slicing parameters: `layer_height`, `infill_density`, `print_speed`, etc.
- UI preferences: `theme`, `units`, `auto_save`
- `custom_settings`: JSON field for additional settings

### `user_projects`
- `id`: Project ID
- `user_id`: Reference to users table
- `project_name`: Project name
- Project data: `stl_file_name`, `slice_settings`, `preview_image`
- Metadata: `file_size`, `estimated_print_time`, `material_usage`

## API Endpoints

### User Management
- `GET /api/users?email=user@example.com` - Get user by email
- `GET /api/users?userId=123` - Get user by ID
- `POST /api/users` - Create new user
- `PUT /api/users` - Update user

### Configuration Management
- `GET /api/user-config?userId=123&configName=default` - Get user config
- `POST /api/user-config` - Create new config
- `PUT /api/user-config` - Update existing config
- `DELETE /api/user-config?userId=123&configName=default` - Delete config

### Database Management
- `GET /api/db-init` - Test database connection
- `POST /api/db-init` - Initialize database tables

## Frontend Hooks

### `useUser()`
Manages user authentication and profile:

```tsx
const { user, loading, error, loginOrCreateUser } = useUser();

// Login or create user
await loginOrCreateUser('user@example.com', 'User Name');
```

### `useUserConfig(userId, configName)`
Manages user configuration:

```tsx
const { config, loading, error, updateConfig, saveConfig } = useUserConfig(userId);

// Update configuration (auto-saves if enabled)
updateConfig({ layerHeight: 0.3, infillDensity: 25 });

// Manual save
await saveConfig({ layerHeight: 0.3 });
```

## Integration with Existing Components

To integrate with your existing STL Slicer components:

1. **Add user authentication** to your main component
2. **Load user configuration** when component mounts
3. **Save configuration changes** when slicing parameters change
4. **Sync UI preferences** like theme and units

Example integration:

```tsx
import { useUser } from '@/hooks/useUser';
import { useUserConfig } from '@/hooks/useUserConfig';

export function StlSlicer() {
  const { user } = useUser();
  const { config, updateConfig } = useUserConfig(user?.id);

  const handleLayerHeightChange = (value: number) => {
    updateConfig({ layerHeight: value });
    // Your existing logic here
  };

  // Rest of your component
}
```

## Security Considerations

1. **Environment Variables**: Never commit `.env.local` to version control
2. **API Validation**: All API endpoints validate user input
3. **Database Access**: Turso provides built-in security with auth tokens
4. **User Data**: Consider implementing proper user authentication (Auth0, NextAuth.js, etc.)

## Troubleshooting

### Connection Issues
- Verify `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` are correct
- Check that your Turso database is active
- Test connection using the test page

### API Errors
- Check browser console for detailed error messages
- Verify API endpoints are accessible
- Ensure database is initialized

### Performance
- Turso provides edge replication for fast global access
- Consider implementing caching for frequently accessed configurations
- Use auto-save judiciously to avoid excessive API calls

## Next Steps

1. **Implement Authentication**: Add proper user authentication system
2. **Project Storage**: Extend to save complete STL projects
3. **Sharing**: Add functionality to share configurations between users
4. **Backup**: Implement configuration export/import
5. **Analytics**: Track usage patterns for optimization

For more information, visit the [Turso documentation](https://docs.turso.tech/).
