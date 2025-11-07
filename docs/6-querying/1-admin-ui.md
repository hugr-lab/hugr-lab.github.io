---
title: "Admin UI"
sidebar_position: 1
description: GraphiQL-based Admin UI for interactive GraphQL exploration and testing
keywords: [admin, ui, graphiql, explorer, interface, playground]
---

# Admin UI

The Admin UI is a built-in GraphiQL-based interface for interactive GraphQL exploration, testing, and debugging. It provides a powerful web-based IDE for working with the hugr GraphQL API.

## Overview

The Admin UI provides:
- **GraphiQL Interface**: Industry-standard GraphQL IDE with syntax highlighting and autocomplete
- **Explorer Plugin**: Visual query builder for discovering and composing queries
- **Schema Documentation**: Interactive schema browser with type information
- **Query History**: Access to previously executed queries
- **Authentication Integration**: Seamless integration with hugr's authentication system
- **Role-Based Schema**: Schema visibility respects user permissions
- **Embeddable**: Can be embedded in external applications via iframe

## Accessing Admin UI

**Path**: `/admin`

**URL**: `http://your-hugr-server:8080/admin`

### Enabling Admin UI

The Admin UI is enabled by default. To control its availability, use the `ADMIN_UI` environment variable:

```bash
# Enable Admin UI (default)
ADMIN_UI=true

# Disable Admin UI
ADMIN_UI=false
```

When disabled, the `/admin` endpoint returns a 404 error, but the GraphQL API at `/query` continues to work normally.

## Authentication

The Admin UI respects all authentication rules configured for the hugr instance. Users must authenticate to access protected data.

### Anonymous Access

If anonymous access is enabled (`ALLOWED_ANONYMOUS=true`), the Admin UI will:
- Allow access without authentication
- Show only types and fields visible to the anonymous role
- Hide types/fields marked with `@hide` directive (unless explicitly allowed for anonymous)
- Display "Public Schema" mode indicator

**Example**: Enable anonymous access
```bash
ALLOWED_ANONYMOUS=true
ANONYMOUS_ROLE=anonymous
```

Users will see a limited schema with only publicly accessible types.

### Authenticated Access

For authenticated access, users must provide credentials. The Admin UI supports multiple authentication methods:

#### 1. Bearer Token (JWT/API Key)

The most common method is to use the Authorization header:

1. Obtain a JWT token or API key
2. Open the Admin UI at `/admin`
3. Click "Headers" at the bottom
4. Add the Authorization header:
   ```json
   {
     "Authorization": "Bearer your-token-here"
   }
   ```
5. Execute queries with authentication

#### 2. Cookie Authentication

For web applications, authentication tokens can be passed via cookies. This is the recommended method for embedding the Admin UI.

**Cookie Name**: Configured via `OIDC_COOKIE_NAME` (default: `hugr_session`)

**Setup**:
1. Configure cookie name:
   ```bash
   OIDC_COOKIE_NAME=hugr_session
   ```

2. Set the cookie in your application:
   ```javascript
   document.cookie = `hugr_session=${authToken}; path=/; secure; samesite=strict`;
   ```

3. Open Admin UI - authentication is automatic

**Note**: Cookies must be set for the same domain as the hugr server or use appropriate CORS configuration.

### Role-Based Schema Visibility

The Admin UI automatically filters the schema based on the user's role:

- **Anonymous users**: See only public types (without `@hide` or explicitly allowed)
- **Authenticated users**: See types and fields permitted for their role
- **Admin users**: Typically see the full schema

**Example**:
```graphql
type users @module(name: "app")
  @table(name: "users")
  @hide(roles: ["anonymous"]) {  # Hidden from anonymous users
  id: Int! @pk
  name: String!
  email: String! @hide(roles: ["viewer"])  # Hidden from viewer role
  password: String! @hide  # Hidden from all roles
}
```

In the Admin UI:
- **Anonymous**: Won't see the `users` type at all
- **Viewer**: Will see `users` but without `email` and `password` fields
- **Editor/Admin**: Will see all fields except `password`

## Features

### 1. Query Editor

The main editor provides:
- **Syntax Highlighting**: GraphQL syntax highlighting
- **Autocomplete**: Intelligent code completion (Ctrl+Space)
- **Error Detection**: Real-time query validation
- **Format**: Auto-format queries (Ctrl+Shift+F)
- **Execute**: Run queries (Ctrl+Enter)

### 2. Explorer Plugin

The Explorer plugin provides a visual query builder:
- **Type Browser**: Navigate the schema visually
- **Field Selection**: Click to add fields to the query
- **Filter Builder**: Add filters, sorting, and pagination
- **Relationship Navigation**: Explore nested relationships
- **One-Click Queries**: Generate complete queries with one click

**Usage**:
1. Click the "Explorer" icon in the left sidebar
2. Browse types in the explorer panel
3. Check fields to add them to the query
4. Click "Play" to execute

### 3. Documentation Explorer

The Docs panel provides:
- **Schema Browser**: Browse all types, fields, and operations
- **Type Information**: View field types, descriptions, and deprecations
- **Search**: Search types and fields by name
- **Examples**: See usage examples for queries and mutations

**Usage**:
1. Click "Docs" in the top-right
2. Click on types to view details
3. Click on fields to see arguments and return types

### 4. Query History

Access previously executed queries:
- **Persistent History**: Queries are saved in browser localStorage
- **Quick Access**: Rerun previous queries with one click
- **Search History**: Find queries by content

**Usage**:
1. Click the "History" icon
2. Browse previous queries
3. Click a query to load it in the editor

### 5. Variables Panel

Define query variables separately from the query:
- **JSON Editor**: Edit variables in JSON format
- **Validation**: Real-time JSON validation
- **Type Checking**: Variables are validated against query signature

**Usage**:
1. Click "Variables" at the bottom
2. Enter variables in JSON format:
   ```json
   {
     "userId": 123,
     "limit": 10
   }
   ```
3. Reference in query: `query GetUser($userId: Int!)`

### 6. Headers Panel

Add custom HTTP headers:
- **Authorization**: Bearer tokens, API keys
- **Custom Headers**: Any additional headers

**Usage**:
1. Click "Headers" at the bottom
2. Enter headers in JSON format:
   ```json
   {
     "Authorization": "Bearer your-token",
     "X-Custom-Header": "value"
   }
   ```

### 7. Response Viewer

View query results:
- **JSON Viewer**: Formatted JSON response with collapsible sections
- **Error Display**: Clear error messages with locations
- **Extensions**: View extensions data (e.g., JQ transformations)
- **Copy to Clipboard**: Copy response JSON

## Embedding Admin UI

The Admin UI can be embedded in external applications using iframes. This is useful for:
- Building custom admin panels
- Integrating with existing applications
- Creating developer portals
- Adding GraphQL capabilities to dashboards

### CORS Configuration

To embed the Admin UI in an iframe, configure CORS:

```bash
# Allow specific origins
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://app.example.com

# Allow all headers (required for iframe)
CORS_ALLOWED_HEADERS=Content-Type,Authorization,*

# Allow all methods
CORS_ALLOWED_METHODS=GET,POST,PUT,DELETE,OPTIONS
```

See [Configuration - CORS Settings](/docs/deployment/config#cors-settings) for more details.

### Embedding Example

**HTML**:
```html
<!DOCTYPE html>
<html>
<head>
  <title>My Admin Panel</title>
  <style>
    #graphiql-frame {
      width: 100%;
      height: 100vh;
      border: none;
    }
  </style>
</head>
<body>
  <iframe
    id="graphiql-frame"
    src="http://localhost:8080/admin"
    allow="clipboard-write"
  ></iframe>
</body>
</html>
```

### Authentication for Embedded UI

When embedding the Admin UI, use cookie-based authentication for seamless integration:

#### Setup Cookie Authentication

1. **Configure cookie name**:
   ```bash
   OIDC_COOKIE_NAME=hugr_session
   ```

2. **Set the cookie in your application**:
   ```javascript
   // After user authenticates in your app
   const authToken = 'user-jwt-token';

   // Set cookie for hugr domain
   document.cookie = `hugr_session=${authToken}; path=/; domain=.example.com; secure; samesite=none`;
   ```

3. **Embed the Admin UI**:
   ```html
   <iframe src="https://hugr.example.com/admin"></iframe>
   ```

The Admin UI will automatically read the authentication token from the cookie.

#### Cross-Domain Authentication

For cross-domain embedding, ensure:

1. **CORS is configured** to allow the parent domain:
   ```bash
   CORS_ALLOWED_ORIGINS=https://app.example.com
   ```

2. **Cookie is set with SameSite=None and Secure**:
   ```javascript
   document.cookie = `hugr_session=${token}; path=/; secure; samesite=none`;
   ```

3. **Both domains use HTTPS** (required for SameSite=None)

#### Example: React Integration

```jsx
import React, { useEffect, useRef } from 'react';

function GraphQLExplorer({ authToken }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    // Set authentication cookie
    document.cookie = `hugr_session=${authToken}; path=/; secure; samesite=none`;
  }, [authToken]);

  return (
    <iframe
      ref={iframeRef}
      src="https://hugr.example.com/admin"
      style={{ width: '100%', height: '100vh', border: 'none' }}
      allow="clipboard-write"
    />
  );
}

export default GraphQLExplorer;
```

### Security Considerations for Embedding

1. **Validate Origins**: Always specify exact origins in CORS configuration
   ```bash
   # Good: Specific origins
   CORS_ALLOWED_ORIGINS=https://app.example.com,https://dashboard.example.com

   # Avoid: Wildcard in production
   CORS_ALLOWED_ORIGINS=*
   ```

2. **Use HTTPS**: Always use HTTPS for production deployments

3. **Secure Cookies**: Set `Secure` and `HttpOnly` flags on cookies

4. **Content Security Policy**: Configure CSP headers in the parent application:
   ```html
   <meta http-equiv="Content-Security-Policy"
         content="frame-src https://hugr.example.com;">
   ```

5. **Token Expiration**: Implement token refresh for long-lived sessions

## Common Use Cases

### 1. API Exploration

Use the Admin UI to explore the API schema:
1. Open `/admin` without authentication (if anonymous access is enabled)
2. Click "Docs" to browse available types
3. Use Explorer to build queries visually
4. Test queries and see results

### 2. Development and Testing

During development:
1. Open Admin UI in a separate tab
2. Test queries as you build your application
3. Copy working queries to your code
4. Debug issues with real-time feedback

### 3. Documentation for Teams

Share the Admin UI with team members:
1. Enable anonymous access for public types
2. Share the `/admin` URL
3. Team members can explore the schema
4. Non-technical users can use Explorer to build queries

### 4. Customer/Partner Portal

Embed Admin UI in customer-facing applications:
1. Configure CORS for your domain
2. Embed Admin UI in iframe
3. Use cookie authentication for seamless experience
4. Customers can explore data they have access to

### 5. Debugging Production Issues

Use Admin UI to investigate issues:
1. Authenticate with appropriate credentials
2. Execute queries to reproduce issues
3. Check error messages and response data
4. Test fixes in real-time

## Limitations

### 1. Mutations Require Confirmation

When executing mutations (insert, update, delete), the Admin UI:
- Shows a warning before execution
- Requires explicit confirmation
- Displays affected rows after execution

This prevents accidental data modifications.

### 2. Query Complexity Limits

The Admin UI respects the same query complexity limits as the API:
- Maximum query depth (default: 7)
- Maximum concurrent queries
- Timeout limits

### 3. No File Upload

The current Admin UI does not support file uploads. Use the GraphQL API directly for file operations.

### 4. Browser Storage

Query history and preferences are stored in browser localStorage:
- Limited storage space (~5-10 MB)
- Cleared when browser data is cleared
- Not synchronized across devices

## Customization

The Admin UI uses GraphiQL with the Explorer plugin. The HTML template is:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hugr GraphQL Explorer (GraphiQL)</title>
    <style>
      body {
        margin: 0;
        overflow: hidden;
      }

      #graphiql {
        height: 100dvh;
      }

      .loading {
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 4rem;
      }
    </style>
    <link
      rel="stylesheet"
      href="https://esm.sh/graphiql@4.0.0/dist/style.css"
    />
    <link
      rel="stylesheet"
      href="https://esm.sh/@graphiql/plugin-explorer@4.0.0/dist/style.css"
    />
    <script type="importmap">
      {
        "imports": {
          "react": "https://esm.sh/react@19.1.0",
          "react/jsx-runtime": "https://esm.sh/react@19.1.0/jsx-runtime",
          "react-dom": "https://esm.sh/react-dom@19.1.0",
          "react-dom/client": "https://esm.sh/react-dom@19.1.0/client",
          "graphiql": "https://esm.sh/graphiql@4.0.0?standalone&external=react,react/jsx-runtime,react-dom,@graphiql/react",
          "@graphiql/plugin-explorer": "https://esm.sh/@graphiql/plugin-explorer@4.0.0?standalone&external=react,react/jsx-runtime,react-dom,@graphiql/react,graphql",
          "@graphiql/react": "https://esm.sh/@graphiql/react@0.30.0?standalone&external=react,react/jsx-runtime,react-dom,graphql,@graphiql/toolkit",
          "@graphiql/toolkit": "https://esm.sh/@graphiql/toolkit@0.11.2?standalone&external=graphql",
          "graphql": "https://esm.sh/graphql@16.11.0"
        }
      }
    </script>
    <script type="module">
      import React from 'react';
      import ReactDOM from 'react-dom/client';
      import { GraphiQL } from 'graphiql';
      import { createGraphiQLFetcher } from '@graphiql/toolkit';
      import { explorerPlugin } from '@graphiql/plugin-explorer';

      const fetcher = createGraphiQLFetcher({
        url: "{{ .graphQLPath }}",
      });
      const explorer = explorerPlugin();

      function App() {
        return React.createElement(GraphiQL, {
          fetcher,
          plugins: [explorer],
          defaultQuery: ``,
          referencesPlugin: explorer.referencesPlugin
        });
      }

      const container = document.getElementById('graphiql');
      const root = ReactDOM.createRoot(container);
      root.render(React.createElement(App));
    </script>
  </head>
  <body>
    <div id="graphiql">
      <div class="loading">Loading…</div>
    </div>
  </body>
</html>
```

The `{{ .graphQLPath }}` template variable is replaced with the GraphQL endpoint (`/query`) at runtime.

## Troubleshooting

### Admin UI Not Loading

**Issue**: `/admin` returns 404

**Solutions**:
1. Check `ADMIN_UI=true` is set
2. Restart hugr server after changing configuration
3. Verify the URL: `http://your-server:8080/admin` (not `/graphql` or `/query`)

### Authentication Not Working

**Issue**: Queries fail with "Unauthorized" error

**Solutions**:
1. Check token is valid and not expired
2. Verify Authorization header format: `Bearer <token>`
3. For cookie auth, check cookie name matches `OIDC_COOKIE_NAME`
4. Test with anonymous access (if enabled) to isolate auth issues

### Schema Not Visible

**Issue**: Types or fields are missing

**Solutions**:
1. Check user role: Anonymous users see limited schema
2. Review `@hide` directives on types/fields
3. Authenticate with appropriate credentials
4. Use introspection to verify schema:
   ```graphql
   { __schema { types { name } } }
   ```

### Embedded UI Not Loading

**Issue**: iframe shows blank page or CORS error

**Solutions**:
1. Configure CORS to allow parent domain:
   ```bash
   CORS_ALLOWED_ORIGINS=https://your-app.com
   ```
2. Check browser console for specific errors
3. Verify both parent and hugr use HTTPS (for SameSite=None cookies)
4. Check iframe `src` URL is correct

### Cookie Authentication Not Working

**Issue**: Admin UI doesn't recognize authentication cookie

**Solutions**:
1. Verify cookie name matches `OIDC_COOKIE_NAME` configuration
2. Check cookie is set for the correct domain
3. For cross-domain, ensure:
   - `SameSite=None` and `Secure` flags are set
   - Both domains use HTTPS
4. Check cookie is not expired
5. Inspect cookies in browser DevTools

### Mutations Not Working

**Issue**: Mutations fail or don't execute

**Solutions**:
1. Check user has permission for mutations
2. Verify mutation syntax is correct
3. Confirm required fields are provided
4. Check for validation errors in response
5. Test with GraphQL API directly to isolate UI issues

## Best Practices

### 1. Disable in Production API Servers

For production API servers, consider disabling the Admin UI:

```bash
ADMIN_UI=false
```

Use a separate Admin UI instance or embed it in your admin application.

### 2. Use Role-Based Access

Configure schema visibility based on roles:
- **Public data**: No `@hide` directive
- **Internal data**: `@hide(roles: ["anonymous"])`
- **Sensitive data**: `@hide` (hidden from all roles) or restrict to specific roles

### 3. Implement Session Timeouts

For security, implement session timeouts:
- Use short-lived JWT tokens
- Implement token refresh
- Clear cookies on logout

### 4. Monitor Usage

Track Admin UI usage for security auditing:
- Log authentication events
- Monitor mutation operations
- Alert on suspicious activity

### 5. Provide Example Queries

Add example queries to help users:
- Use query comments to explain usage
- Provide example variables
- Document common use cases

### 6. Keep Dependencies Updated

The Admin UI uses CDN-hosted libraries (GraphiQL, React). While this ensures the latest version, you may want to:
- Monitor for breaking changes
- Pin specific versions if stability is critical
- Test after GraphiQL updates

## See Also

### Documentation
- [GraphQL API](/docs/querying/graphql) - Main GraphQL API documentation
- [Authentication Setup](/docs/deployment/auth) - Configure authentication methods
- [Access Control](/docs/engine-configuration/access-control) - Role-based permissions
- [Configuration](/docs/deployment/config) - Server configuration options
- [CORS Settings](/docs/deployment/config#cors-settings) - CORS configuration for embedding

### External Resources
- [GraphiQL Documentation](https://github.com/graphql/graphiql)
- [GraphQL Explorer Plugin](https://github.com/graphql/graphiql/tree/main/packages/graphiql-plugin-explorer)
- [GraphQL Specification](https://spec.graphql.org/)
