---
title: "Authentication Setup"
sidebar_position: 4
---

# Authentication Setup

Hugr supports multiple authentication methods to secure your GraphQL API. Authentication determines user identity and assigns roles that control access permissions.

## Overview

Hugr supports the following authentication methods:

1. **API Keys** - Static keys for service-to-service communication
2. **Anonymous** - Unauthenticated access with limited permissions
3. **OAuth2/JWT** - Token-based authentication with standard JWT
4. **OIDC** - OpenID Connect for enterprise identity providers

Each authentication method assigns roles to users, which are then used by the [Access Control](../4-engine-configuration/5-access-control.md) system to determine permissions.

## Configuration

Authentication is configured in the Hugr configuration file. The configuration defines which authentication methods are enabled and how roles are assigned.

### Configuration File Location

The authentication configuration is typically located in:
- `config.yaml` - Main configuration file
- `config.json` - Alternative JSON format

See the [hugr repository](https://github.com/hugr-lab/hugr) for detailed configuration examples.

## API Key Authentication

API keys are ideal for service-to-service communication and automated access.

### Configuration

```yaml
auth:
  api_keys:
    enabled: true
    header_username: "X-API-Username"
    header_user_id: "X-API-User-ID"
    keys:
      - key: "service_key_abc123"
        role: "service"
        username: "api_service"
        user_id: "svc_001"
      - key: "admin_key_xyz789"
        role: "admin"
        username: "admin_service"
        user_id: "admin_001"
```

### Usage

Include the API key and user information in request headers:

```bash
curl -X POST https://api.example.com/graphql \
  -H "Authorization: Bearer service_key_abc123" \
  -H "X-API-Username: api_service" \
  -H "X-API-User-ID: svc_001" \
  -H "Content-Type: application/json" \
  -d '{"query": "{ customers { id name } }"}'
```

### Role Assignment

For API keys, the role is explicitly configured in the `keys` section. The role determines what the authenticated service can access.

**Authentication Variables Available:**
- `[$auth.user_name]` - From configuration or header
- `[$auth.user_id]` - From configuration or header
- `[$auth.role]` - From configuration
- `[$auth.auth_type]` - "apikey"

## Anonymous Access

Anonymous access allows unauthenticated requests with limited permissions.

### Configuration

```yaml
auth:
  anonymous:
    enabled: true
    role: "public"
```

### Role Assignment

All unauthenticated requests are assigned the role specified in the `anonymous.role` configuration (typically "public").

**Authentication Variables Available:**
- `[$auth.user_name]` - "anonymous"
- `[$auth.user_id]` - null or "anonymous"
- `[$auth.role]` - From configuration (e.g., "public")
- `[$auth.auth_type]` - "anonymous"

## OAuth2/JWT Authentication

JWT tokens provide stateless authentication with embedded claims.

### Configuration

```yaml
auth:
  jwt:
    enabled: true
    secret: "your-jwt-secret"
    algorithm: "HS256"  # or RS256, ES256
    issuer: "https://your-auth-provider.com"
    audience: "your-api-audience"
    role_claim: "role"  # JWT claim containing the role
    role_scope_prefix: "role:"  # Prefix for role in scopes
```

### Token Example

```json
{
  "sub": "user123",
  "name": "John Doe",
  "email": "john@example.com",
  "role": "editor",
  "scope": "read write",
  "iss": "https://your-auth-provider.com",
  "aud": "your-api-audience",
  "exp": 1735689600
}
```

### Usage

Include the JWT token in the Authorization header:

```bash
curl -X POST https://api.example.com/graphql \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"query": "{ customers { id name } }"}'
```

### Role Assignment

Roles can be assigned from JWT in two ways:

#### 1. From Claims

The role is read from a specific claim in the JWT payload:

```yaml
auth:
  jwt:
    role_claim: "role"  # Reads from token.role
```

If the claim contains multiple roles (array), the first role is used, or you can configure priority:

```yaml
auth:
  jwt:
    role_claim: "roles"
    role_priority: ["admin", "editor", "viewer"]  # First matching role is used
```

#### 2. From Scopes

The role is extracted from OAuth2 scopes with a specific prefix:

```yaml
auth:
  jwt:
    role_scope_prefix: "role:"  # Extracts "editor" from scope "role:editor"
```

Token with scopes:
```json
{
  "scope": "read write role:editor"
}
```

**Authentication Variables Available:**
- `[$auth.user_name]` - From "name" claim or "sub" claim
- `[$auth.user_id]` - From "sub" claim
- `[$auth.role]` - From configured role claim or scope
- `[$auth.auth_type]` - "jwt"
- `[$auth.provider]` - From "iss" claim
- Any custom claim: `[$auth.custom_claim]`

## OIDC Authentication

OpenID Connect extends OAuth2 with standardized identity information.

### Configuration

```yaml
auth:
  oidc:
    enabled: true
    issuer: "https://accounts.google.com"
    client_id: "your-client-id"
    client_secret: "your-client-secret"
    redirect_uri: "https://your-app.com/auth/callback"
    role_claim: "role"
    role_scope_prefix: "role:"
    additional_scopes: ["email", "profile"]
```

### Token Example

```json
{
  "iss": "https://accounts.google.com",
  "sub": "110169484474386276334",
  "azp": "your-client-id",
  "aud": "your-client-id",
  "iat": 1735689000,
  "exp": 1735692600,
  "email": "john@example.com",
  "email_verified": true,
  "name": "John Doe",
  "picture": "https://...",
  "role": "editor"
}
```

### Usage

OIDC typically uses the OAuth2 authorization code flow. Include the ID token in requests:

```bash
curl -X POST https://api.example.com/graphql \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIs..." \
  -H "Content-Type: application/json" \
  -d '{"query": "{ customers { id name } }"}'
```

### Role Assignment

Similar to JWT, roles can be assigned from:

#### 1. From Claims

```yaml
auth:
  oidc:
    role_claim: "role"  # Reads from ID token role claim
```

Common enterprise claims:
- `role` - Custom role claim
- `groups` - Group membership (can be mapped to roles)
- `realm_access.roles` - Keycloak-specific roles
- `resource_access.{client}.roles` - Keycloak client-specific roles

#### 2. From Scopes

```yaml
auth:
  oidc:
    role_scope_prefix: "role:"
```

**Authentication Variables Available:**
- `[$auth.user_name]` - From "name" or "preferred_username" claim
- `[$auth.user_id]` - From "sub" claim
- `[$auth.role]` - From configured role claim or scope
- `[$auth.auth_type]` - "oidc"
- `[$auth.provider]` - From "iss" claim
- `[$auth.email]` - From "email" claim
- Any custom claim: `[$auth.custom_claim]`

## Multiple Authentication Methods

You can enable multiple authentication methods simultaneously. Hugr tries each method in order:

```yaml
auth:
  # Try API key first
  api_keys:
    enabled: true
    # ... config

  # Then OIDC
  oidc:
    enabled: true
    # ... config

  # Then JWT
  jwt:
    enabled: true
    # ... config

  # Finally anonymous
  anonymous:
    enabled: true
    role: "public"
```

The first successful authentication method is used. If all fail, the request is treated as anonymous (if enabled).

## Custom Claims Mapping

You can map custom claims to authentication variables for use in permissions:

```yaml
auth:
  jwt:
    enabled: true
    secret: "your-secret"
    custom_claims:
      tenant_id: "organization_id"  # Maps JWT "organization_id" to $auth.tenant_id
      department_id: "dept"         # Maps JWT "dept" to $auth.department_id
      region: "user_region"          # Maps JWT "user_region" to $auth.region
```

These custom claims can then be used in permission filters:

```graphql
mutation {
  core {
    insert_role_permissions(data: {
      role: "employee"
      type_name: "documents"
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

## Testing Authentication

### Test API Key

```bash
# Should succeed with configured permissions
curl -X POST http://localhost:8080/graphql \
  -H "Authorization: Bearer service_key_abc123" \
  -H "X-API-Username: api_service" \
  -H "X-API-User-ID: svc_001" \
  -d '{"query": "{ customers { id name } }"}'
```

### Test Anonymous

```bash
# Should succeed with public role permissions
curl -X POST http://localhost:8080/graphql \
  -d '{"query": "{ customers { id name } }"}'
```

### Test JWT

```bash
# Generate a test token (example using jwt.io or similar tool)
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X POST http://localhost:8080/graphql \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query": "{ customers { id name } }"}'
```

## Security Best Practices

1. **Use HTTPS**: Always use TLS/SSL in production
2. **Rotate Keys**: Regularly rotate API keys and JWT secrets
3. **Limit Token Lifetime**: Use short-lived tokens with refresh mechanisms
4. **Validate Issuers**: Always verify token issuer in production
5. **Principle of Least Privilege**: Assign minimal necessary roles
6. **Audit Logs**: Enable logging for authentication events
7. **Rate Limiting**: Implement rate limiting to prevent abuse
8. **Secure Storage**: Never commit secrets to version control

## Troubleshooting

### Authentication Failed

1. Check token is not expired
2. Verify token signature with correct secret/public key
3. Confirm issuer and audience match configuration
4. Check Authorization header format: `Bearer <token>`

### Role Not Assigned

1. Verify role claim name matches configuration
2. Check token contains the expected role claim
3. Confirm role exists in the roles table
4. Review role assignment configuration

### Permission Denied

1. Confirm user has correct role assigned
2. Check role has necessary permissions in access control
3. Verify permissions are not disabled
4. Test with admin role to isolate permission vs. auth issues

### Custom Claims Not Available

1. Verify claim exists in token payload
2. Check custom_claims mapping in configuration
3. Ensure claim name matches exactly (case-sensitive)
4. Test with a tool like jwt.io to inspect token

## Integration Examples

### Auth0

```yaml
auth:
  oidc:
    enabled: true
    issuer: "https://your-tenant.auth0.com/"
    client_id: "your-client-id"
    client_secret: "your-client-secret"
    role_claim: "https://your-app.com/roles"  # Custom namespace claim
```

### Keycloak

```yaml
auth:
  oidc:
    enabled: true
    issuer: "https://keycloak.example.com/realms/your-realm"
    client_id: "your-client-id"
    client_secret: "your-client-secret"
    role_claim: "realm_access.roles"
```

### Google

```yaml
auth:
  oidc:
    enabled: true
    issuer: "https://accounts.google.com"
    client_id: "your-client-id.apps.googleusercontent.com"
    client_secret: "your-client-secret"
    additional_scopes: ["email", "profile"]
    # Google doesn't provide roles by default, use custom solution
```

### Azure AD

```yaml
auth:
  oidc:
    enabled: true
    issuer: "https://login.microsoftonline.com/{tenant-id}/v2.0"
    client_id: "your-client-id"
    client_secret: "your-client-secret"
    role_claim: "roles"  # Azure AD app roles
```

## See Also

- [Access Control](../4-engine-configuration/5-access-control.md) - Configure roles and permissions
- [Configuration](1-config.md) - General Hugr configuration
- [Deployment](5-container.md) - Deploy Hugr with authentication
- [Hugr Repository](https://github.com/hugr-lab/hugr) - Detailed configuration examples
