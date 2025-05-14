# Contributing to Auto-Analyst

Thank you for your interest in contributing to Auto-Analyst! This document provides guidelines and instructions for contributing to the project.

## Table of Contents
- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style Guidelines](#code-style-guidelines)
- [Documentation Guidelines](#documentation-guidelines)
- [Pull Request Process](#pull-request-process)
- [Security Guidelines](#security-guidelines)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone. Please be kind and courteous to other contributors.

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- Redis
- SQLite
- Git

### Setup Development Environment

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/Auto-Analyst.git
   cd Auto-Analyst
   ```

2. **Backend Setup**
   ```bash
   cd auto-analyst-backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Frontend Setup**
   ```bash
   cd auto-analyst-frontend
   npm install
   ```

4. **Environment Variables**
   Create `.env` files in both frontend and backend directories with required variables:
   ```
   # Backend .env
   DATABASE_URL=sqlite:///chat_database.db
   REDIS_URL=your_redis_url
   OPENAI_API_KEY=your_openai_key
   GROQ_API_KEY=your_groq_key
   ANTHROPIC_API_KEY=your_anthropic_key
   GEMINI_API_KEY=your_gemini_key
   STRIPE_SECRET_KEY=your_stripe_key
   STRIPE_WEBHOOK_SECRET=your_webhook_secret
   ```

## Development Workflow

### Branch Strategy
- `main` - Production-ready code
- `develop` - Development branch
- Feature branches: `feature/feature-name`
- Bug fix branches: `fix/bug-name`
- Hotfix branches: `hotfix/issue-name`

### Git Workflow
1. Create a new branch from `develop`
   ```bash
   git checkout develop
   git pull
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

3. Push and create a Pull Request
   ```bash
   git push origin feature/your-feature-name
   ```

## Code Style Guidelines

### Python (Backend)
- Follow PEP 8 style guide
- Use type hints
- Maximum line length: 88 characters
- Use Black for code formatting
- Use isort for import sorting

Example:
```python
from typing import List, Optional

def process_data(data: List[str], limit: Optional[int] = None) -> List[str]:
    """Process the input data with optional limit.
    
    Args:
        data: List of strings to process
        limit: Optional maximum number of items to process
        
    Returns:
        Processed list of strings
    """
    return data[:limit] if limit else data
```

### JavaScript/TypeScript (Frontend)
- Follow ESLint configuration
- Use Prettier for formatting
- Use TypeScript for type safety
- Follow React best practices

Example:
```typescript
interface UserProps {
  name: string;
  email: string;
  role?: 'admin' | 'user';
}

const User: React.FC<UserProps> = ({ name, email, role = 'user' }) => {
  return (
    <div className="user-card">
      <h2>{name}</h2>
      <p>{email}</p>
      <span>{role}</span>
    </div>
  );
};
```


## Documentation Guidelines

### Code Documentation
- Use docstrings for all functions and classes
- Include type hints
- Document complex algorithms
- Keep comments up-to-date

### API Documentation
- Document all API endpoints
- Include request/response examples
- Document error cases
- Keep OpenAPI/Swagger docs updated

### README Updates
- Update relevant sections when adding features
- Include setup instructions
- Document environment variables
- Update testing instructions

## Pull Request Process

1. **Before Submitting**
   - Update documentation
   - Add tests for new features
   - Ensure all tests pass
   - Update CHANGELOG.md

2. **PR Description**
   - Clear description of changes
   - Link to related issues
   - Include testing instructions
   - Screenshots for UI changes

3. **Review Process**
   - Address review comments
   - Keep PR focused and small
   - Squash commits if needed
   - Ensure CI passes

## Security Guidelines

### API Keys and Secrets
- Never commit API keys or secrets
- Use environment variables
- Rotate keys regularly
- Follow principle of least privilege

### Code Security
- Sanitize user inputs
- Validate all API requests
- Implement rate limiting
- Use secure authentication

### Data Protection
- Encrypt sensitive data
- Implement proper access controls
- Follow data retention policies
- Regular security audits

## Additional Resources

- [Project Documentation](/docs)
- [API Documentation](/docs/redis-setup)
- [Frontend Architecture](/docs/frontend.md)
- [Backend Architecture](/docs/backend.md)
- [Database Schema](/docs/db_schema.md)

## Getting Help

- Open an issue for bugs
- Use discussions for questions
- Join our community chat
- Contact maintainers

Thank you for contributing to Auto-Analyst! 🚀 