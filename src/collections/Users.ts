import type { CollectionConfig } from 'payload'
import type { User } from '../payload-types'

export const Users: CollectionConfig = {
  slug: 'users',
  auth: true,
  admin: {
    useAsTitle: 'email',
  },
  access: {
    read: () => true,
    create: () => true,
    update: ({ req: { user }, id }) => {
      // Users can update their own profile
      if ((user as User)?.id === id) return true
      // Admins can update any user
      return (user as User)?.role === 'admin'
    },
    delete: ({ req: { user } }) => {
      // Only admin users can delete users
      return (user as User)?.role === 'admin'
    },
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      options: [
        {
          label: 'Admin',
          value: 'admin',
        },
        {
          label: 'Tenant Admin',
          value: 'tenant-admin',
        },
        {
          label: 'User',
          value: 'user',
        },
      ],
      defaultValue: 'user',
    },
    {
      name: 'tenant',
      type: 'relationship',
      relationTo: 'tenants',
      required: false,
      admin: {
        position: 'sidebar',
      },
      access: {
        read: ({ req, doc }) => {
          if (!doc) return false; // If document doesn't exist, deny access
          const user = req.user as unknown as User;
          // Check that both user and tenant properties exist before comparing
          return user && user.tenant && doc.tenant 
            ? user.tenant === doc.tenant 
            : false;
        },
        create: ({ req }) => {
          // Allow users to create submissions for their tenant
          return req.user ? true : false
        },
      },
    },
  ],
}
