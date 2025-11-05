---
title: "Access Control"
sidebar_position: 6
---

# Access Control

Hugr provides a comprehensive role-based access control (RBAC) system that allows fine-grained permissions management for GraphQL types and fields. Access control is managed through the `roles` and `permissions` tables in the core database module.

## Overview

The access control system works by:

1. Assigning roles to users based on the authentication method
2. Defining permissions for each role to access specific GraphQL types and fields
3. Optionally applying filters and default values to enforce data-level security

All permissions are managed through the standard GraphQL API in the `core` module.

## Default Roles

When Hugr is deployed, three default roles are automatically created:

- **admin** - Full access to all types and fields
- **public** - Limited access for anonymous users
- **readonly** - Read-only access to allowed types

Mutation permissions are visible but disabled by default for security.

## Role Assignment

Roles are assigned to users based on the configured authentication scheme:

### 1. API Keys

For API key authentication, roles are configured through:
- Request headers that identify the username and user ID
- Role assignment in the API key configuration

See [Authentication Setup](../7-deployment/4-auth.md) for details on configuring API keys.

### 2. Anonymous Users

Anonymous (unauthenticated) requests are automatically assigned a role defined in the configuration settings.

### 3. OAuth2/JWT Tokens

For OAuth2 and JWT authentication, roles are determined from:
- Token claims
- Token scopes

### 4. OIDC Tokens

For OpenID Connect authentication, roles are extracted from:
- Token claims
- Token scopes

## Schema Definition

### Roles Table

The `roles` table defines available roles in the system:

```graphql
"""
  Roles are the permissions that can be assigned to users
"""
type roles @module(name: "core")
  @table(name: "roles") {
  """
    Role name
  """
  name: String! @pk
  """
    Role description
  """
  description: String!
  """
    Role disabled flag
  """
  disabled: Boolean @default(value: false)
}
```

### Permissions Table

The `role_permissions` table defines what each role can access:

```graphql
"""
  Role permissions to visible and allowed types and their fields
  that can be assigned to roles
"""
type role_permissions @module(name: "core")
  @table(name: "permissions") {
  "Role name"
  role: String! @pk @field_references(
    references_name: "roles",
    field: "name",
    query: "role_info"
    references_query: "permissions"
  )
  "Type name, can be * for all types"
  type_name: String! @pk
  "Field name, can be * for all fields"
  field_name: String! @pk
  "Hidden flag"
  hidden: Boolean @default(value: false)
  "Disabled flag"
  disabled: Boolean @default(value: false)
  "Required filter values for the field"
  filter: JSON
  "Required field values for the data mutation"
  data: JSON
}
```

## Managing Roles

### Creating Roles

Create a new role using the insert mutation:

```graphql
mutation {
  core {
    insert_roles(data: {
      name: "editor"
      description: "Can edit content but not delete"
      disabled: false
    }) {
      name
      description
    }
  }
}
```

### Updating Roles

Update existing roles:

```graphql
mutation {
  core {
    update_roles(
      filter: { name: { eq: "editor" } }
      data: {
        description: "Content editors with limited permissions"
      }
    ) {
      success
      affected_rows
    }
  }
}
```

### Disabling Roles

Disable a role without deleting it:

```graphql
mutation {
  core {
    update_roles(
      filter: { name: { eq: "editor" } }
      data: { disabled: true }
    ) {
      success
    }
  }
}
```

### Deleting Roles

Remove a role completely:

```graphql
mutation {
  core {
    delete_roles(
      filter: { name: { eq: "old_role" } }
    ) {
      success
      affected_rows
    }
  }
}
```

## Managing Permissions

### Granting Basic Access

Grant a role access to a specific type:

```graphql
mutation {
  core {
    insert_role_permissions(data: {
      role: "editor"
      type_name: "articles"
      field_name: "*"
      hidden: false
      disabled: false
    }) {
      role
      type_name
      field_name
    }
  }
}
```

### Field-Level Permissions

Grant access to specific fields only:

```graphql
mutation {
  core {
    insert_role_permissions(data: [
      {
        role: "public"
        type_name: "users"
        field_name: "id"
      }
      {
        role: "public"
        type_name: "users"
        field_name: "name"
      }
      {
        role: "public"
        type_name: "users"
        field_name: "email"
        hidden: true  # Hidden but accessible if explicitly requested
      }
    ]) {
      role
      type_name
      field_name
    }
  }
}
```

### Wildcard Permissions

Use wildcards to grant broad access:

```graphql
mutation {
  core {
    insert_role_permissions(data: {
      role: "admin"
      type_name: "*"      # All types
      field_name: "*"     # All fields
    }) {
      role
    }
  }
}
```

## Data-Level Security

### Row-Level Filters

Apply filters that restrict which rows a role can access. Filters are automatically applied to queries, updates, and deletes.

**Example: Users can only see their own records**

```graphql
mutation {
  core {
    insert_role_permissions(data: {
      role: "user"
      type_name: "orders"
      field_name: "*"
      filter: {
        user_id: { eq: "[$auth.user_id]" }
      }
    }) {
      role
      type_name
    }
  }
}
```

The filter uses the same format as GraphQL query filters. See [Queries](../5-graphql/1-queries.md) for filter syntax.

**Example: Region-based access**

```graphql
mutation {
  core {
    insert_role_permissions(data: {
      role: "regional_manager"
      type_name: "stores"
      field_name: "*"
      filter: {
        region: { eq: "[$auth.user_region]" }
      }
    }) {
      role
      type_name
    }
  }
}
```

**Example: Complex filters**

```graphql
mutation {
  core {
    insert_role_permissions(data: {
      role: "moderator"
      type_name: "comments"
      field_name: "*"
      filter: {
        _or: [
          { author_id: { eq: "[$auth.user_id]" } }
          { status: { eq: "pending_review" } }
        ]
      }
    }) {
      role
      type_name
    }
  }
}
```

### Default Values for Mutations

Enforce default field values in insert and update mutations. These values are applied automatically and cannot be overridden by the user.

**Example: Auto-set ownership**

```graphql
mutation {
  core {
    insert_role_permissions(data: {
      role: "user"
      type_name: "insert_articles"
      field_name: "*"
      data: {
        author_id: "[$auth.user_id]"
        created_by: "[$auth.user_name]"
      }
    }) {
      role
      type_name
    }
  }
}
```

**Example: Enforce status on updates**

```graphql
mutation {
  core {
    insert_role_permissions(data: {
      role: "editor"
      type_name: "update_articles"
      field_name: "*"
      data: {
        status: "pending_review"
        reviewed_by: null
      }
    }) {
      role
      type_name
    }
  }
}
```

The `data` field uses the same format as GraphQL mutation input types.

## Authentication Variables

Use authentication variables in filters and default values to create dynamic, user-specific permissions:

| Variable | Description | Example Value |
|----------|-------------|---------------|
| `[$auth.user_name]` | Username | "john.doe" |
| `[$auth.user_id]` | User ID (string) | "12345" |
| `[$auth.user_id_int]` | User ID (integer) | 12345 |
| `[$auth.role]` | User's role | "editor" |
| `[$auth.auth_type]` | Authentication type | "jwt", "apikey", "oidc" |
| `[$auth.provider]` | Auth provider | "google", "auth0" |

### Custom Claim Variables

You can also access custom claims from JWT/OIDC tokens:

```graphql
mutation {
  core {
    insert_role_permissions(data: {
      role: "employee"
      type_name: "departments"
      field_name: "*"
      filter: {
        department_id: { eq: "[$auth.department_id]" }
      }
    }) {
      role
      type_name
    }
  }
}
```

## Permission Flags

### Hidden Flag

When `hidden: true`, the field is not returned in queries by default but can be explicitly requested:

```graphql
# Without explicit request - email field not returned
query {
  users {
    id
    name
  }
}

# With explicit request - email field is returned
query {
  users {
    id
    name
    email  # Must be explicitly requested
  }
}
```

### Disabled Flag

When `disabled: true`, the field or type is completely inaccessible:

```graphql
mutation {
  core {
    insert_role_permissions(data: {
      role: "readonly"
      type_name: "delete_users"
      field_name: "*"
      disabled: true  # Delete mutation blocked
    }) {
      role
      type_name
    }
  }
}
```

## Complete Examples

### Example 1: Multi-tenant Application

```graphql
mutation {
  core {
    # Create role
    insert_roles(data: {
      name: "tenant_user"
      description: "User within a tenant organization"
    }) {
      name
    }

    # Grant filtered access
    insert_role_permissions(data: [
      {
        role: "tenant_user"
        type_name: "customers"
        field_name: "*"
        filter: {
          tenant_id: { eq: "[$auth.tenant_id]" }
        }
      }
      {
        role: "tenant_user"
        type_name: "insert_customers"
        field_name: "*"
        data: {
          tenant_id: "[$auth.tenant_id]"
        }
      }
    ]) {
      role
      type_name
    }
  }
}
```

### Example 2: Hierarchical Permissions

```graphql
mutation {
  core {
    # Viewer role - read only
    insert_role_permissions(data: [
      {
        role: "viewer"
        type_name: "articles"
        field_name: "*"
      }
      {
        role: "viewer"
        type_name: "insert_articles"
        field_name: "*"
        disabled: true
      }
      {
        role: "viewer"
        type_name: "update_articles"
        field_name: "*"
        disabled: true
      }
    ]) {
      role
      type_name
    }

    # Editor role - can create and edit own content
    insert_role_permissions(data: [
      {
        role: "editor"
        type_name: "articles"
        field_name: "*"
        filter: {
          author_id: { eq: "[$auth.user_id]" }
        }
      }
      {
        role: "editor"
        type_name: "insert_articles"
        field_name: "*"
        data: {
          author_id: "[$auth.user_id]"
          status: "draft"
        }
      }
      {
        role: "editor"
        type_name: "update_articles"
        field_name: "*"
        filter: {
          author_id: { eq: "[$auth.user_id]" }
        }
      }
    ]) {
      role
      type_name
    }
  }
}
```

### Example 3: Sensitive Field Protection

```graphql
mutation {
  core {
    insert_role_permissions(data: [
      # Public can see basic user info
      {
        role: "public"
        type_name: "users"
        field_name: "id"
      }
      {
        role: "public"
        type_name: "users"
        field_name: "name"
      }
      {
        role: "public"
        type_name: "users"
        field_name: "avatar"
      }
      # Email hidden but accessible
      {
        role: "public"
        type_name: "users"
        field_name: "email"
        hidden: true
      }
      # Phone completely blocked
      {
        role: "public"
        type_name: "users"
        field_name: "phone"
        disabled: true
      }
      # SSN completely blocked
      {
        role: "public"
        type_name: "users"
        field_name: "ssn"
        disabled: true
      }
    ]) {
      role
      type_name
      field_name
    }
  }
}
```

## Querying Permissions

### List All Roles

```graphql
query {
  core {
    roles {
      name
      description
      disabled
      permissions {
        type_name
        field_name
        hidden
        disabled
      }
    }
  }
}
```

### Check Specific Role Permissions

```graphql
query {
  core {
    role_permissions(
      filter: { role: { eq: "editor" } }
    ) {
      type_name
      field_name
      hidden
      disabled
      filter
      data
    }
  }
}
```

### Find Permissions for a Type

```graphql
query {
  core {
    role_permissions(
      filter: {
        type_name: { eq: "articles" }
      }
    ) {
      role
      field_name
      hidden
      disabled
    }
  }
}
```

## Best Practices

1. **Principle of Least Privilege**: Grant only the minimum permissions required for each role
2. **Use Wildcards Sparingly**: Explicit permissions are more secure and easier to audit
3. **Test Permissions**: Always test with different roles to ensure permissions work as expected
4. **Audit Regularly**: Periodically review role assignments and permissions
5. **Use Authentication Variables**: Leverage `[$auth.*]` variables for dynamic, user-specific permissions
6. **Combine Filters**: Use both row-level filters and field-level permissions for defense in depth
7. **Document Roles**: Maintain clear descriptions for each role's purpose and permissions
8. **Version Control**: Track permission changes in version control alongside schema changes

## Troubleshooting

### Permission Not Applied

- Verify the role is not disabled: `roles.disabled = false`
- Check the permission is not disabled: `role_permissions.disabled = false`
- Ensure the user has the correct role assigned
- Verify authentication is working correctly

### Filter Not Working

- Check filter syntax matches GraphQL filter format
- Verify authentication variables are available and correctly named
- Test the filter independently in a query
- Check for typos in field names

### Default Values Not Applied

- Ensure the permission targets the mutation type (e.g., `insert_articles`, not `articles`)
- Verify the `data` field uses correct input type format
- Check that authentication variables exist and have values
- Confirm the field is not explicitly set by the user (defaults don't override)

## See Also

- [Authentication Setup](../7-deployment/4-auth.md) - Configure user authentication
- [Queries](../5-graphql/1-queries.md) - Query syntax including filters
- [Mutations](../4-engine-configuration/3-schema-definition/3-data-objects/5-mutations.md) - Mutation operations and input types
- [Schema Definition](../4-engine-configuration/3-schema-definition/index.md) - Define types and fields
