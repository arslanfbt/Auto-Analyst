<--DEPRECIATED; TO BE REMOVED SOON -->

# Custom Templates

This folder contains components for managing AI agent templates in the Auto-Analyst application. The templates system allows users to browse, enable/disable, and manage professional AI agent templates.

## Architecture

The templates system has been refactored to integrate directly into the main sidebar, following modern SaaS design patterns similar to OpenAI and Claude. This provides a centralized location for accessing all features.

## Components

### Core Components

- **`TemplatesButton.tsx`** - Main button component that integrates into the sidebar, showing template counts and access status
- **`TemplatesModal.tsx`** - Comprehensive modal providing browsing, searching, and management functionality
- **`useTemplates.ts`** - Custom hook for managing template state and operations
- **`types.ts`** - TypeScript interfaces and types for the templates system
- **`index.ts`** - Barrel export file for easy importing

### Features

#### Templates Modal
- **Browse Tab**: Browse all available templates by category with search functionality
- **Manage Tab**: Enable/disable templates with bulk operations
- **Search & Filter**: Real-time search and category filtering
- **Premium Integration**: Shows premium badges and enforces access controls
- **Usage Tracking**: Displays usage statistics and last used dates

#### Templates Button
- **Access Indicator**: Shows lock icon for non-premium users, count badge for premium users
- **Status Display**: Shows enabled/total template counts
- **Tooltip Information**: Detailed hover information about features and access
- **Premium Badges**: Clear indication of premium features

#### Templates Hook
- **Data Management**: Loads templates and user preferences
- **State Management**: Handles loading, error states, and data synchronization
- **API Integration**: Handles all backend communication
- **Event System**: Listens for updates from other components

## Integration

### Sidebar Integration

The templates functionality is integrated into the main chat sidebar (`components/chat/Sidebar.tsx`):

```tsx
import { TemplatesButton, TemplatesModal, useTemplates } from '@/components/custom-templates'

// In component:
const { templateCount, enabledCount } = useTemplates({ userId, enabled: isOpen && !!userId })

// In JSX:
<TemplatesButton
  onClick={() => setIsTemplatesModalOpen(true)}
  userProfile={userProfile}
  templateCount={templateCount}
  enabledCount={enabledCount}
/>

<TemplatesModal
  isOpen={isTemplatesModalOpen}
  onClose={() => setIsTemplatesModalOpen(false)}
  userId={userId}
/>
```

### State Management

The system uses multiple state management approaches:

1. **Local State**: Component-level state for UI interactions
2. **Custom Hook**: `useTemplates` for data fetching and management
3. **Global Store**: `useUserSubscriptionStore` for subscription information
4. **Event System**: Custom events for cross-component communication

## API Integration

The components integrate with the following backend endpoints:

- `GET /templates` - Fetch all available templates
- `GET /templates/user/{userId}` - Fetch user template preferences
- `POST /templates/user/{userId}/toggle` - Toggle single template
- `POST /templates/user/{userId}/bulk-toggle` - Bulk update preferences

## Premium Features

The templates system includes comprehensive premium feature support:

- **Access Control**: Checks user subscription status
- **Premium Badges**: Visual indicators for premium-only templates
- **Upgrade Prompts**: Encourages non-premium users to upgrade
- **Feature Enforcement**: Prevents unauthorized access to premium features


## Usage Examples

### Basic Usage
```tsx
import { TemplatesButton, TemplatesModal } from '@/components/custom-templates'

function MyComponent() {
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  return (
    <>
      <TemplatesButton
        onClick={() => setIsModalOpen(true)}
        userProfile={userProfile}
      />
      <TemplatesModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        userId={userId}
      />
    </>
  )
}
```

### With State Management
```tsx
import { useTemplates } from '@/components/custom-templates'

function MyComponent() {
  const { 
    templates, 
    preferences, 
    loading, 
    toggleTemplate 
  } = useTemplates({ userId: 123 })
  
  // Use template data and operations
}
```

## Future Enhancements

Potential areas for future development:

1. **Template Creation**: Allow users to create custom templates
2. **Template Sharing**: Share templates between users or teams
3. **Template Analytics**: Detailed usage analytics and insights
4. **Template Versioning**: Version control for template updates
5. **Template Categories**: Custom user-defined categories 