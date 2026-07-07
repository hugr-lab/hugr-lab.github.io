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

- **admin** - Full access to all types and fields (no restrictions)
- **public** - Limited access for anonymous users (no default permissions; configure as needed)
- **readonly** - Can query all data but all mutations are disabled

The `readonly` role is created with a single permission entry:

```sql
INSERT INTO permissions (role, type_name, field_name, hidden, disabled)
VALUES ('readonly', 'Mutation', '*', false, true);
```

This configuration:
- Allows all queries (no restrictions needed due to "open by default" behavior)
- Blocks all mutations by targeting the `Mutation` root type with a wildcard field

You can customize these roles or create new ones based on your security requirements.

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

## Permission Behavior and Wildcards

### Default Access Behavior

**Important:** If a type or field is **not found** in the permissions table for a role, it is **accessible by default**. This "open by default" approach allows you to create targeted restrictions without explicitly listing every allowed field.

```graphql
# If no permissions exist for role "viewer", all types and fields are accessible
# To restrict access, you must explicitly add permission entries
```

This design enables two permission strategies:

1. **Deny-by-default** - Block everything with wildcards, then allow specific items
2. **Allow-by-default** - Start with full access, then block specific items

### Wildcard Matching

You can use `*` (asterisk) in place of type names or field names to apply rules broadly:

- `type_name: "*"` - Applies to all GraphQL types
- `field_name: "*"` - Applies to all fields of a type
- Both wildcards - Applies globally to everything

#### Default readonly Role Example

When Hugr creates the core database, the `readonly` role is configured to disable all mutations:

```sql
INSERT INTO permissions (role, type_name, field_name, hidden, disabled)
VALUES ('readonly', 'Mutation', '*', false, true);
```

This single entry:
- Targets the `Mutation` type (the root mutation type in GraphQL)
- Uses `*` for field_name to match all mutation fields
- Sets `disabled: true` to block all mutations

Result: `readonly` role can query data but cannot make any mutations.

### Permission Priority

When checking access, Hugr applies the **most specific** permission that matches:

**Priority order (highest to lowest):**
1. Exact match: `(type_name: "users", field_name: "email")`
2. Type with wildcard field: `(type_name: "users", field_name: "*")`
3. Wildcard type with exact field: `(type_name: "*", field_name: "email")`
4. Both wildcards: `(type_name: "*", field_name: "*")`
5. No match: **Allowed by default**

#### Example: Layered Permissions

```graphql
mutation {
  core {  # Mutation type for the core module
    insert_roles(data: {  # Mutation field
      name: "limited_editor"
      description: "Can edit most things except sensitive data"
      permissions: [
        # 1. Allow all types and fields by default (least specific)
        {
          type_name: "*"
          field_name: "*"
          disabled: false
        }
        # 2. Hide all email fields across all types (more specific)
        {
          type_name: "*"
          field_name: "email"
          hidden: true
        }
        # 3. Completely block ssn field in users type (most specific)
        {
          type_name: "users"
          field_name: "ssn"
          disabled: true
        }
        # 4. Block all mutations (specific type, all fields)
        {
          type_name: "Mutation"
          field_name: "*"
          disabled: true
        }
        # 5. But allow specific update mutation (most specific wins)
        {
          type_name: "Mutation"
          field_name: "update_users"
          disabled: false
        }
      ]
    }) {
      name
    }
  }
}
```

Result:
- Most fields are accessible
- All `email` fields are hidden but can be explicitly requested
- `users.ssn` is completely blocked
- All mutations are blocked except `update_users`

### Targeted Restrictions Strategy

The most efficient approach is to use wildcards for broad rules and specific entries for exceptions:

**Example: Read-only with specific write permissions**

```graphql
mutation {
  core {
    insert_roles(data: {
      name: "content_contributor"
      description: "Can only create articles, not edit or delete"
      permissions: [
        # Block all mutations
        {
          type_name: "Mutation"
          field_name: "*"
          disabled: true
        }
        # Except insert_articles
        {
          type_name: "Mutation"
          field_name: "insert_articles"
          disabled: false
          data: {
            author_id: "[$auth.user_id]"
            status: "pending"
          }
        }
      ]
    }) {
      name
    }
  }
}
```

**Example: Hide sensitive fields by default**

```graphql
mutation {
  core {
    insert_roles(data: {
      name: "public"
      description: "Public access with hidden PII"
      permissions: [
        # Hide email across all types
        {
          type_name: "*"
          field_name: "email"
          hidden: true
        }
        # Hide phone across all types
        {
          type_name: "*"
          field_name: "phone"
          hidden: true
        }
        # Completely block SSN across all types
        {
          type_name: "*"
          field_name: "ssn"
          disabled: true
        }
      ]
    }) {
      name
    }
  }
}
```

**Example: Type-level restrictions**

```graphql
mutation {
  core {
    insert_roles(data: {
      name: "external_api"
      description: "External API with limited access"
      permissions: [
        # Block entire admin types
        {
          type_name: "admin_settings"
          field_name: "*"
          disabled: true
        }
        {
          type_name: "internal_logs"
          field_name: "*"
          disabled: true
        }
        # Block all mutations on sensitive table
        {
          type_name: "Mutation"
          field_name: "insert_user_credentials"
          disabled: true
        }
        {
          type_name: "Mutation"
          field_name: "update_user_credentials"
          disabled: true
        }
        {
          type_name: "Mutation"
          field_name: "delete_user_credentials"
          disabled: true
        }
      ]
    }) {
      name
    }
  }
}
```

## Creating Roles and Permissions

There are two approaches to setting up roles and permissions:

1. **Create role with nested permissions** - Create a role and all its permissions in a single mutation
2. **Create separately** - Create a role first, then add permissions individually

### Approach 1: Create Role with Nested Permissions (Recommended)

The most efficient way is to create a role with all its permissions at once using nested relations:

```graphql
mutation {
  core {
    insert_roles(data: {
      name: "editor"
      description: "Content editor with limited permissions"
      permissions: [
        {
          type_name: "Query"
          field_name: "articles"
        }
        {
          type_name: "Mutation"
          field_name: "insert_articles"
          data: {
            author_id: "[$auth.user_id]"
          }
        }
        {
          type_name: "Mutation"
          field_name: "update_articles"
          filter: {
            author_id: { eq: "[$auth.user_id]" }
          }
        }
      ]
    }) {
      name
      description
      permissions {
        type_name
        field_name
      }
    }
  }
}
```

This approach:
- Creates the role and all permissions in a single transaction
- Cleaner and more maintainable
- Reduces the number of API calls

### Approach 2: Create Role and Permissions Separately

Alternatively, create a role first, then add permissions individually:

```graphql
mutation {
  core {
    # Step 1: Create the role
    insert_roles(data: {
      name: "editor"
      description: "Content editor with limited permissions"
    }) {
      name
    }

    # Step 2: Add permissions for this role
    perm1: insert_role_permissions(data: {
      role: "editor"
      type_name: "Query"
      field_name: "articles"
    }) {
      role
      type_name
    }

    perm2: insert_role_permissions(data: {
      role: "editor"
      type_name: "Mutation"
      field_name: "insert_articles"
    }) {
      role
      type_name
    }
  }
}
```

This approach is useful when:
- Adding permissions to an existing role
- Managing permissions incrementally
- Different team members manage roles vs. permissions

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

**Note:** The `data` argument in insert mutations accepts a single object, not an array. To create multiple permissions at once, either:
- Create a role with nested permissions (see "Creating Roles and Permissions" above)
- Use multiple mutation calls with aliases in a single request

### Granting Basic Access

Grant a role access to a specific type:

```graphql
mutation {
  core {
    insert_role_permissions(data: {
      role: "editor"
      type_name: "Query"
      field_name: "articles"
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

Grant access to specific fields only. You can create permissions individually:

```graphql
mutation {
  core {
    # Create permission for id field
    perm1: insert_role_permissions(data: {
      role: "public"
      type_name: "users"
      field_name: "id"
    }) {
      role
      type_name
      field_name
    }

    # Create permission for name field
    perm2: insert_role_permissions(data: {
      role: "public"
      type_name: "users"
      field_name: "name"
    }) {
      role
      type_name
      field_name
    }

    # Create permission for email field (hidden)
    perm3: insert_role_permissions(data: {
      role: "public"
      type_name: "users"
      field_name: "email"
      hidden: true  # Hidden but accessible if explicitly requested
    }) {
      role
      type_name
      field_name
    }
  }
}
```

Or create a role with all permissions at once:

```graphql
mutation {
  core {
    insert_roles(data: {
      name: "public"
      description: "Public access role"
      permissions: [
        {
          type_name: "users"
          field_name: "id"
        }
        {
          type_name: "users"
          field_name: "name"
        }
        {
          type_name: "users"
          field_name: "email"
          hidden: true
        }
      ]
    }) {
      name
      permissions {
        type_name
        field_name
        hidden
      }
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

:::warning Field-level filters do not compose through relations
A filter seeded on a `Query`/`Mutation` field (as in the examples below) applies **only when that field is queried directly**. If the same table is reached through a **relation** — a forward `@field_references`, a reverse `references_query` edge, or a `_join` — the field-level filter is **not** re-applied, because the relation is a different `(type_name, field_name)` pair. This means a per-field filter is not a complete row-level-security boundary.

For row-level security that holds on **every** path a table is reached (direct, `_by_pk`, relations, `_join`, aggregations, and mutations), use **[Data-Object (Table-Level) Permissions](#data-object-table-level-permissions)** — a filter keyed on the table itself, applied wherever the table is materialised. Field-level filters remain useful for shaping a specific query field; data-object filters are the tool for isolating rows.
:::

**Example: Users can only see their own records**

```graphql
mutation {
  core {
    insert_role_permissions(data: {
      role: "user"
      type_name: "Query"
      field_name: "orders"
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

The filter uses the same format as GraphQL query filters. See [Queries](../5-graphql/1-queries/index.md) for filter syntax.

**Example: Region-based access**

```graphql
mutation {
  core {
    insert_role_permissions(data: {
      role: "regional_manager"
      type_name: "Query"
      field_name: "stores"
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
      type_name: "Query"
      field_name: "comments"
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
      type_name: "Mutation"
      field_name: "insert_articles"
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
      type_name: "Mutation"
      field_name: "update_articles"
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

:::note Field-level vs. data-object default values
A field-level `data` rule applies only to the named mutation field. To force a value on **every** insert/update of a table — including nested inserts and many-to-many junction rows — use a [`data-object:insert` / `data-object:update`](#force-stamping-mutation-data) rule instead. When both are present, the data-object value takes precedence (it is applied last).
:::

## Data-Object (Table-Level) Permissions

Field-level permissions (everything above) are keyed on a GraphQL **field** — a specific list query, mutation, or relation edge. **Data-object permissions** are keyed on the **table or view itself**, so a single rule applies wherever that data object is materialised: the top-level list, `_by_pk`, forward and reverse relations, `_join`, aggregations, and mutations. This is the mechanism for **row-level security that composes** — you seed one filter per table and it holds on every path, instead of enumerating every relation edge.

### How they are stored

Data-object rules are ordinary rows in the `permissions` table (no schema change) that use a synthetic `type_name`:

| `type_name` | `field_name` | Carries | Applies to |
|---|---|---|---|
| `data-object:query` | table's GraphQL type name (or `*`) | `filter`, `disabled`, `hidden` | Every read: list, `_by_pk`, relations, `_join`, aggregations — and the fallback for update/delete `WHERE` |
| `data-object:insert` | table's GraphQL type name (or `*`) | `data`, `disabled` | Insert (force-stamped values; deny) |
| `data-object:update` | table's GraphQL type name (or `*`) | `data`, `disabled`, `filter` | Update `SET` (force-stamp), update `WHERE` |
| `data-object:delete` | table's GraphQL type name (or `*`) | `filter`, `disabled` | Delete `WHERE` |

The `field_name` is the **GraphQL type name of the data object** — the source-prefixed name such as `pg_store_products` (what you see in introspection), not the raw SQL table name. Use `*` to apply a rule to every data object.

:::info No migration required
The `data-object:` prefix cannot collide with a real GraphQL type name (a `:` is not a legal identifier character), so these rows coexist with existing field-level rows. A deployment that uses only field-level rules behaves exactly as before.
:::

### Row-level security that composes

Seed one `data-object:query` filter and it applies on every path the table is reached:

```graphql
mutation {
  core {
    insert_role_permissions(data: {
      role: "agent"
      type_name: "data-object:query"
      field_name: "pg_store_skills"       # the table's GraphQL type name
      filter: { agent_id: { eq: "[$auth.user_id]" } }
    }) {
      role
    }
  }
}
```

With this single row, an `agent` sees only their own skills whether they query `skills` directly, reach them through `skill_links.target` (forward reference), through `skills_by_pk(...).outgoing_links` (reverse edge), through a `_join`, or count them via `skills_aggregation`. A field-level filter would have had to be repeated for each of those edges.

### Force-stamping mutation data

`data-object:insert` and `data-object:update` `data` values are applied **over** the client's input — the client cannot override them. This closes the "insert is not filterable" gap: a client cannot create or reassign rows to another principal.

```graphql
mutation {
  core {
    insert_role_permissions(data: {
      role: "agent"
      type_name: "data-object:insert"
      field_name: "pg_store_skills"
      data: { agent_id: "[$auth.user_id]" }   # stamped on every insert, incl. nested
    }) {
      role
    }
  }
}
```

The stamp is applied to the target table and to every **nested** object created in the same mutation (nested reference inserts and the many-to-many junction rows), so it cannot be bypassed by inserting through a parent object.

### Denying a table

`disabled: true` on a `data-object:query` row denies the table on **every** path — reads and mutations alike. `disabled` on an operation-specific row (`data-object:insert`, etc.) denies just that operation:

```graphql
mutation {
  core {
    insert_role_permissions(data: {
      role: "agent"
      type_name: "data-object:query"
      field_name: "pg_store_audit_log"
      disabled: true                 # agent can never read audit_log, on any path
    }) {
      role
    }
  }
}
```

`hidden: true` on a `data-object:query` row omits fields returning that object from the introspected schema (the object stays queryable unless also `disabled`).

### Merge semantics

Data-object rules combine with everything else deterministically:

- **Filters** combine by **AND**. `final = user filter AND field-level filter AND data-object filter`. Each term only narrows the result — a field-level rule can never widen past the data-object floor.
- **Mutation data** overlays in order **client input → field-level `data` → data-object `data`**, so the data-object value is the force-stamp floor.
- **`disabled`** is **OR** across levels — any level denying wins.
- For update/delete, an operation-specific `filter` (`data-object:update` / `data-object:delete`) is used when present; otherwise the `data-object:query` filter applies (you cannot delete or update rows you cannot read, unless an operation row explicitly says otherwise).

### Multi-tenant example

Isolating a tenant's rows across a set of tables takes ~3 rows per table instead of one row per relation edge:

```graphql
mutation {
  core {
    insert_roles(data: {
      name: "tenant_user"
      description: "Sees and writes only its own tenant's rows"
      permissions: [
        { type_name: "data-object:query",  field_name: "app_orders",   filter: { tenant_id: { eq: "[$auth.user_id]" } } }
        { type_name: "data-object:insert", field_name: "app_orders",   data:   { tenant_id: "[$auth.user_id]" } }
        { type_name: "data-object:update", field_name: "app_orders",   data:   { tenant_id: "[$auth.user_id]" } }
        { type_name: "data-object:query",  field_name: "app_invoices", filter: { tenant_id: { eq: "[$auth.user_id]" } } }
        { type_name: "data-object:insert", field_name: "app_invoices", data:   { tenant_id: "[$auth.user_id]" } }
      ]
    }) {
      name
    }
  }
}
```

### Migrating from per-field row-level filters

If you previously seeded a filter on every relation edge to isolate a table, replace them with a single `data-object:query` filter on that table plus (for writes) `data-object:insert`/`update` `data`. The data-object rules compose to the edges you were enumerating, and they extend the isolation to inserts and updates, which per-field filters could not reach.

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
      type_name: "Query"
      field_name: "departments"
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
      type_name: "Mutation"
      field_name: "delete_users"
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
    # Create role with permissions for multi-tenant access
    insert_roles(data: {
      name: "tenant_user"
      description: "User within a tenant organization"
      permissions: [
        {
          type_name: "Query"
          field_name: "customers"
          filter: {
            tenant_id: { eq: "[$auth.tenant_id]" }
          }
        }
        {
          type_name: "Mutation"
          field_name: "insert_customers"
          data: {
            tenant_id: "[$auth.tenant_id]"
          }
        }
        {
          type_name: "Mutation"
          field_name: "update_customers"
          filter: {
            tenant_id: { eq: "[$auth.tenant_id]" }
          }
        }
        {
          type_name: "Mutation"
          field_name: "delete_customers"
          filter: {
            tenant_id: { eq: "[$auth.tenant_id]" }
          }
        }
      ]
    }) {
      name
      description
      permissions {
        type_name
        field_name
      }
    }
  }
}
```

### Example 2: Hierarchical Permissions

```graphql
mutation {
  core {
    # Viewer role - read only
    viewer: insert_roles(data: {
      name: "viewer"
      description: "Read-only access to articles"
      permissions: [
        {
          type_name: "Query"
          field_name: "articles"
        }
        {
          type_name: "Mutation"
          field_name: "insert_articles"
          disabled: true
        }
        {
          type_name: "Mutation"
          field_name: "update_articles"
          disabled: true
        }
        {
          type_name: "Mutation"
          field_name: "delete_articles"
          disabled: true
        }
      ]
    }) {
      name
      description
    }

    # Editor role - can create and edit own content
    editor: insert_roles(data: {
      name: "editor"
      description: "Can create and edit own articles"
      permissions: [
        {
          type_name: "Query"
          field_name: "articles"
          filter: {
            author_id: { eq: "[$auth.user_id]" }
          }
        }
        {
          type_name: "Mutation"
          field_name: "insert_articles"
          data: {
            author_id: "[$auth.user_id]"
            status: "draft"
          }
        }
        {
          type_name: "Mutation"
          field_name: "update_articles"
          filter: {
            author_id: { eq: "[$auth.user_id]" }
          }
        }
        {
          type_name: "Mutation"
          field_name: "delete_articles"
          filter: {
            author_id: { eq: "[$auth.user_id]" }
          }
        }
      ]
    }) {
      name
      description
    }
  }
}
```

### Example 3: Sensitive Field Protection

```graphql
mutation {
  core {
    insert_roles(data: {
      name: "public"
      description: "Public access with field-level restrictions"
      permissions: [
        # Public can see basic user info
        {
          type_name: "users"
          field_name: "id"
        }
        {
          type_name: "users"
          field_name: "name"
        }
        {
          type_name: "users"
          field_name: "avatar"
        }
        # Email hidden but accessible if explicitly requested
        {
          type_name: "users"
          field_name: "email"
          hidden: true
        }
        # Phone completely blocked
        {
          type_name: "users"
          field_name: "phone"
          disabled: true
        }
        # SSN completely blocked
        {
          type_name: "users"
          field_name: "ssn"
          disabled: true
        }
      ]
    }) {
      name
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

## Permission Caching

Hugr automatically caches role permissions to improve authorization performance. When a user makes a request, their role permissions are fetched once and cached, reducing database queries on subsequent requests.

### How Permission Caching Works

Hugr caches role permissions using a specific pattern:

**Cache Key Format**: `RolePermissions:{role_name}`
**Cache Tag**: `$role_permissions`

When checking permissions for a role:
1. **First request**: Query the database for role permissions
2. **Cache the result**: Store permissions with the role-specific key
3. **Subsequent requests**: Serve permissions from cache (1-5ms vs 50-100ms)
4. **Cache until TTL**: Default TTL of 1 hour (configurable)

### Internal Permission Query

Here's the internal query Hugr uses to fetch and cache role permissions:

```graphql
query ($role: String!, $cacheKey: String) {
  core {
    info: roles_by_pk(name: $role) @cache(key: $cacheKey, tags: ["$role_permissions"]) {
      name
      disabled
      permissions {
        type_name
        field_name
        hidden
        disabled
        filter
        data
      }
    }
  }
}

# Called with:
# { role: "editor", cacheKey: "RolePermissions:editor" }
```

### Invalidating Permission Cache

After modifying roles or permissions, invalidate the cache to ensure users get updated permissions immediately.

#### Method 1: Invalidate All Role Permissions (Recommended)

When you update permissions, invalidate all role caches:

```graphql
mutation UpdatePermissions {
  # Update role permissions
  core {
    update_role_permissions(
      filter: { role: { eq: "editor" } }
      data: { disabled: false }
    ) {
      success
      affected_rows
    }

    # Invalidate ALL role permissions cache
    invalidateCache: function {
      core {
        cache {
          invalidate(tags: ["$role_permissions"]) {
            success
            affected_rows
            message
          }
        }
      }
    }
  }
}
```

#### Method 2: Invalidate Specific Role

Use `@invalidate_cache` directive to refresh a specific role:

```graphql
query RefreshEditorPermissions {
  core {
    editor: roles_by_pk(name: "editor")
      @invalidate_cache
      @cache(
        key: "RolePermissions:editor",
        tags: ["$role_permissions"]
      ) {
      name
      permissions {
        type_name
        field_name
        disabled
      }
    }
  }
}
```

#### Method 3: Automatic Invalidation in Mutations

Combine permission updates with cache invalidation in a single mutation:

```graphql
mutation CreateRoleWithPermissions {
  core {
    # Create new role
    insert_roles(data: {
      name: "content_manager"
      description: "Can manage content"
      permissions: [
        {
          type_name: "articles"
          field_name: "*"
        }
        {
          type_name: "insert_articles"
          field_name: "*"
          data: {
            author_id: "[$auth.user_id]"
          }
        }
      ]
    }) {
      name
    }

    # Invalidate cache so new role is immediately available
    invalidateCache: function {
      core {
        cache {
          invalidate(tags: ["$role_permissions"]) {
            success
            affected_rows
          }
        }
      }
    }
  }
}
```

### When to Invalidate Permission Cache

**Always invalidate cache when**:
- Creating new roles
- Updating role permissions
- Deleting roles
- Changing `hidden` or `disabled` flags
- Modifying `filter` or `data` constraints
- Enabling/disabling roles

### Performance Impact

**Without Caching**:
- Permission check on every request: 50-100ms
- High database load for multi-user systems
- Slower API response times

**With Caching**:
- Permission check from cache: 1-5ms
- Reduced database load by 90%+
- Faster API response times
- Scales to thousands of concurrent users

### Example: Complete Permission Update Workflow

```graphql
mutation UpdateRoleAndInvalidateCache {
  core {
    # 1. Update role permissions
    update_role_permissions(
      filter: {
        role: { eq: "viewer" }
        type_name: { eq: "articles" }
      }
      data: {
        hidden: false
        disabled: false
      }
    ) {
      success
      affected_rows
    }

    # 2. Invalidate permission cache
    invalidatePermissions: function {
      core {
        cache {
          invalidate(tags: ["$role_permissions"]) {
            success
            affected_rows
            message
          }
        }
      }
    }
  }
}
```

### Best Practices for Permission Caching

1. **Always Invalidate After Changes**: Immediately invalidate cache after any permission modifications
2. **Use Tag-Based Invalidation**: Use `$role_permissions` tag to invalidate all roles at once
3. **Monitor Cache Effectiveness**: Track `affected_rows` to ensure cache is being cleared
4. **Test After Updates**: Verify permissions work correctly after invalidation
5. **Consider Security**: Stale permissions can lead to unauthorized access or denial of valid requests

### Security Considerations

⚠️ **Important**: Stale permission cache can cause security issues:

- **Privilege Escalation**: Users may retain permissions after they've been revoked
- **Access Denial**: Users may be blocked from resources they should access
- **Compliance Violations**: Cached permissions may not reflect current security policies

**Always verify invalidation succeeds**:

```graphql
mutation CriticalPermissionUpdate {
  core {
    update_role_permissions(...) {
      success
    }

    # Verify invalidation succeeded
    invalidate: function {
      core {
        cache {
          invalidate(tags: ["$role_permissions"]) {
            success
            message
          }
        }
      }
    }
  }
}

# Check: invalidate.function.core.cache.invalidate.success === true
```

For more details on caching, see [Cache Directives](/docs/engine-configuration/cache#example-8-caching-role-permissions).

## Best Practices

### Permission Strategy

1. **Understand Default Behavior**: Remember that types/fields are **accessible by default** if not found in permissions table
2. **Choose Your Strategy**:
   - **Deny-by-default**: Use wildcards to block everything, then explicitly allow specific items (more secure for sensitive data)
   - **Allow-by-default**: Only add permission entries to block or hide specific items (simpler for most cases)
3. **Use Wildcards Effectively**: Wildcards are powerful for broad rules with specific exceptions
   - Block all mutations: `(type_name: "Mutation", field_name: "*", disabled: true)`
   - Hide PII fields: `(type_name: "*", field_name: "email", hidden: true)`
   - Then add specific exceptions with higher priority rules

### Security and Maintenance

4. **Principle of Least Privilege**: Grant only the minimum permissions required for each role
5. **Leverage Priority System**: Use layered permissions - broad wildcard rules with specific overrides
6. **Test Permissions**: Always test with different roles to ensure permissions work as expected
7. **Audit Regularly**: Periodically review role assignments and permissions
8. **Use Authentication Variables**: Leverage `[$auth.*]` variables for dynamic, user-specific permissions
9. **Combine Filters**: Use both row-level filters and field-level permissions for defense in depth
10. **Document Roles**: Maintain clear descriptions for each role's purpose and permissions
11. **Version Control**: Track permission changes in version control alongside schema changes

### Common Patterns

**Read-only access:**
```graphql
permissions: [
  { type_name: "Mutation", field_name: "*", disabled: true }
]
```

**Hide sensitive fields globally:**
```graphql
permissions: [
  { type_name: "*", field_name: "ssn", disabled: true }
  { type_name: "*", field_name: "password", disabled: true }
  { type_name: "*", field_name: "email", hidden: true }
]
```

**Allow specific mutations only:**
```graphql
permissions: [
  { type_name: "Mutation", field_name: "*", disabled: true }
  { type_name: "Mutation", field_name: "insert_articles", disabled: false }
  { type_name: "Mutation", field_name: "update_articles", disabled: false }
]
```

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

### Filter Works on the Direct Query but Not Through a Relation

A field-level filter (`type_name: "Query"`, `field_name: "<table>"`) is applied only when the table is queried directly. When the table is reached through a forward reference, a reverse `references_query` edge, or a `_join`, the field-level filter does not re-apply — that edge is a different permission surface.

- Use a [`data-object:query`](#data-object-table-level-permissions) filter keyed on the table's GraphQL type name; it composes to every path (direct, `_by_pk`, relations, `_join`, aggregations).
- The `field_name` must be the **GraphQL type name** (e.g. `pg_store_products`), not the SQL table name.

### Default Values Not Applied

- Ensure the permission targets the mutation type (e.g., `insert_articles`, not `articles`)
- Verify the `data` field uses correct input type format
- Check that authentication variables exist and have values
- Field-level `data` values are **force-stamped** — they overwrite a value the client supplied. To force a value on nested inserts and many-to-many junction rows as well, use a [`data-object:insert`/`update`](#force-stamping-mutation-data) rule.

## See Also

- [Authentication Setup](../7-deployment/4-auth.md) - Configure user authentication
- [Cache Directives](./6-cache.md) - Role permission caching and cache invalidation
- [Queries](../5-graphql/1-queries/index.md) - Query syntax including filters
- [Mutations](../4-engine-configuration/3-schema-definition/3-data-objects/5-mutations.md) - Mutation operations and input types
- [Schema Definition](../4-engine-configuration/3-schema-definition/index.md) - Define types and fields
