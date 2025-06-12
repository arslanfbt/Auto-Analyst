# Agent Templates Components

This directory contains components for browsing professional AI agent templates.

## Components

### TemplatesButton
Entry point button for accessing agent templates.

### TemplatesSidebar
Main sidebar component for browsing templates.

### TemplateListView
Lists all available templates by category with search functionality.

### TemplateDetailView
Shows detailed view of a template with usage instructions.

## Usage Example

```tsx
import { useState } from 'react'
import { TemplatesButton, TemplatesSidebar } from '@/components/custom-agents'
import { useUserSubscriptionStore } from '@/lib/store/userSubscriptionStore'

export default function MyComponent() {
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false)
  const { subscription } = useUserSubscriptionStore()

  return (
    <div>
      <TemplatesButton
        onClick={() => setIsTemplatesOpen(true)}
        userProfile={subscription}
        showLabel={true}
      />
      
      <TemplatesSidebar
        isOpen={isTemplatesOpen}
        onClose={() => setIsTemplatesOpen(false)}
      />
    </div>
  )
}
```

## Features

- **Browse Templates**: View all available agent templates by category
- **Search Functionality**: Find templates by name, description, or category
- **Template Details**: View full prompt templates and usage instructions
- **Usage Tracking**: Track template views
- **Responsive Design**: Works on desktop and mobile
- **Template Usage**: Learn how to use templates in conversations with @mentions

## How Users Interact with Templates

Users can browse all available agent templates and see detailed information about each one, including:

- **Template Description**: What the agent specializes in
- **Prompt Template**: The full prompt used by the agent
- **Usage Instructions**: How to use the template in conversations
- **Category Information**: Template organization by specialty
- **Access Level**: Whether template requires premium subscription

To use a template in conversation, users simply mention it with @:
```
@template_name your request here
```

## Template Categories

Templates are organized into categories such as:
- **Data Manipulation**: Data cleaning, feature engineering
- **Modeling**: Machine learning, time series forecasting  
- **Visualization**: Chart creation, data plotting
- **And more**: Additional specialized categories

## Dependencies

- NextAuth for user session
- Template API endpoints for data fetching
- Toast notifications for user feedback
- Framer Motion for animations 