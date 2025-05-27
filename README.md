## Technology Stack

- PostgreSQL Database backend using Supabase
- Used the Form-Builder and the Multi-Tenants Plugin to implement the given task.

## Form Builder Implementation

Used the `@payloadcms/plugin-form-builder` to create and manage forms with the following customizations:

```typescript
formBuilderPlugin({
  formOverrides: {
    // Added Custom fields
    fields: ({ defaultFields }) => [
      ...defaultFields,
      { name: 'hasAttachment', type: 'checkbox' },
      { name: 'hasAttatchmentLabel', type: 'text' },
      {
        name: 'tenant',
        type: 'relationship',
        relationTo: 'tenants',
        required: true,
        // Additional configuration...
      },
    ],
    // Hooks and access controls...
  },
  // Form submission configuration...
})
```

Custom hooks ensure that forms are automatically assigned to the correct tenant:

```typescript
beforeValidate: [
  async ({ data, req }) => {
    const user = req.user as unknown as User
    // Extract tenant ID and assign to form
    let tenantId = tryParseTenantId(user?.tenant)
    if (tenantId !== null) {
      return {
        ...data,
        tenant: tenantId,
      }
    }
    // Additional logic...
  },
]
```

## Multi-Tenant Implementation

The Multi-Tenant plugin is configured to manage tenant-specific data:

```typescript
multiTenantPlugin({
  collections: {
    forms: {
      useTenantAccess: true,
    },
    'form-submissions': {
      useTenantAccess: true,
    },
  },
  tenantField: {
    name: 'tenant',
  },
  tenantsSlug: 'tenants',
  useTenantsCollectionAccess: true,
  useTenantsListFilter: true,
  useUsersTenantFilter: true,
  userHasAccessToAllTenants: (user) => (user as unknown as User)?.role === 'admin',
})
```

Key aspects of our implementation:

- Each tenant organization has its own collection of forms
- Form submissions are also tenant-specific
- Users are associated with a specific tenant
- Admin users have cross-tenant access
- Proper tenant filtering is applied at the database query level

## Custom Access Control Logic

Implemented custom access control :

```typescript
access: {
  read: ({ req }) => {
    const user = req.user as unknown as User;
    // Admins can access all forms
    if (user?.role === 'admin') return true;

    // Regular users can only access forms from their tenant
    if (user?.tenant) {
      const tenantId = tryParseTenantId(user.tenant);
      if (tenantId !== null) {
        return {
          tenant: { equals: tenantId }
        };
      }
    }

    // No access by default
    return false;
  },
  // Similar logic for update and delete...
}
```

Made `tryParseTenantId` function which handles various tenant ID formats. I made this because I was facing issues with passing tenantId :

```typescript
function tryParseTenantId(tenant: any): number | null {
  // Handle tenant as object with ID
  if (tenant && typeof tenant === 'object' && 'id' in tenant) {
    return typeof tenant.id === 'number' ? tenant.id : parseInt(tenant.id, 10) || null
  }

  // Handle tenant as string (possibly JSON or numeric)
  if (typeof tenant === 'string') {
    try {
      const parsed = JSON.parse(tenant)
      // Extract ID if parsed successfully...
    } catch (e) {
      // Try parsing as numeric string...
    }
  }

  return null
}
```

## API Endpoints

The application exposes these key endpoints:

- **Login**: `POST /api/users/login`

  ```json
  {
    "email": "your-email@example.com",
    "password": "your-password"
  }
  ```

  Returns a JWT token to use for authenticated requests

- **Verify Token**: `GET /api/users/me`
  Requires Authorization header with JWT token

### Tenant Management

- **Create Tenant**: `POST /api/tenants`

  ```json
  {
    "name": "New Tenant Organization",
    "domain": "tenant-domain.com",
    "settings": {
      "allowedFormTypes": ["contact", "survey"],
      "maxSubmissionsPerForm": 1000,
      "customEmailTemplate": null
    }
  }
  ```

  _Note: Tenant creation typically requires admin permissions_

- **List Tenants**: `GET /api/tenants`
  _Note: Users will only see tenants they have access to based on their role_

### Forms

- **Form Creation**: `POST /api/forms`
- **Form Retrieval**: `GET /api/forms`
- **Form Submission**: `POST /api/form-submissions`
- **Submission Retrieval**: `GET /api/form-submissions`

## Authentication and Permissions

- **JWT Authentication**: Used for securing API endpoints
- **Role-Based Access**:
  - `admin` users can access all forms and submissions across all tenants
  - Regular `user` role can only access their own tenant's forms and submissions
- **Tenant Filtering**: Automatic filtering based on user's tenant
- **Field-Level Access Control**: Tenant fields visibility is controlled based on user role

## Creating Forms via API

To create a form using Postman or other API clients:

1. **Authentication**:

   ```
   POST /api/users/login
   {
     "email": "your-email@example.com",
     "password": "your-password"
   }
   ```

   Copy the JWT token from the response.

2. **Form Creation**:

   ```
   POST /api/forms
   Authorization: JWT your-token-here
   Content-Type: application/json

   {
     "title": "Contact Form",
     "fields": [
       {
         "name": "fullName",
         "label": "Full Name",
         "required": true,
         "blockType": "text"
       },
       {
         "name": "email",
         "label": "Email Address",
         "required": true,
         "blockType": "email"
       },
       {
         "name": "message",
         "label": "Your Message",
         "blockType": "textarea"
       }
     ],
     "submitButtonLabel": "Submit",
     "confirmationType": "message",
     "tenant": 1
   }
   ```

For regular users, the tenant will be automatically assigned based on their user account. Admins must specify which tenant the form belongs to.

## Notes on Implementation

- Forms and submissions are automatically assigned to the correct tenant
- The application handles various tenant ID formats (objects, strings, numbers)
- Proper error handling ensures tenant IDs are always valid
- The UI conditionally shows/hides tenant fields based on user role
- All tenant-based filtering happens at the database query level for security
- User accounts are also tenant-scoped, ensuring proper isolation

## Installation and Setup

Refer to the project setup documentation for details on environment variables, database configuration, and deployment instructions.

## Features

- Multi-tenant form creation and management
- Customizable form fields
- File upload support for form submissions
- Rich text editing for form content
- Automatic tenant assignment
- Role-based access control
- S3-compatible storage for media files
