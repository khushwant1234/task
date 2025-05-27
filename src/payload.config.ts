// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { multiTenantPlugin } from '@payloadcms/plugin-multi-tenant'
import { s3Storage } from '@payloadcms/storage-s3'
import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Tenants } from './collections/Tenants'
import type { User } from './payload-types'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

function tryParseTenantId(tenant: any): number | null {
  if (tenant && typeof tenant === 'object' && 'id' in tenant) {
    return typeof tenant.id === 'number' ? tenant.id : parseInt(tenant.id, 10) || null
  }

  if (typeof tenant === 'string') {
    try {
      const parsed = JSON.parse(tenant)
      if (parsed && typeof parsed === 'object' && 'id' in parsed) {
        return typeof parsed.id === 'number'
          ? parsed.id
          : parseInt(parsed.id, 10) || null
      } else {
        const raw = parseInt(tenant, 10)
        return isNaN(raw) ? null : raw
      }
    } catch (e) {
      const raw = parseInt(tenant, 10)
      return isNaN(raw) ? null : raw
    }
  }

  return null
}

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Tenants],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
  sharp,
  plugins: [
    payloadCloudPlugin(),
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
    }),
    formBuilderPlugin({
      formOverrides: {
        hooks: {
          beforeValidate: [
            async ({ data, req }) => {
              const user = req.user as unknown as User;
              console.log('Current user:', user ? {
                id: user.id,
                email: user.email,
                role: user.role,
                tenant: user.tenant
              } : 'No user');
              
              let tenantId = null
              if (user && user.role !== 'admin' && user.tenant) {
                console.log('Trying to parse tenant from user:', user.tenant);
                tenantId = tryParseTenantId(user.tenant);
                console.log('Parsed tenant ID from user:', tenantId);
              } else {
                console.log('Trying to parse tenant from data:', data?.tenant);
                tenantId = tryParseTenantId(data?.tenant);
                console.log('Parsed tenant ID from data:', tenantId);
              }

              if (tenantId !== null) {
                console.log('Setting tenant ID in form data:', tenantId);
                return {
                  ...data,
                  tenant: tenantId,
                };
              }

              if (user?.role === 'admin' && user.tenant && !data?.tenant) {
                console.log('Admin fallback - using admin tenant:', user.tenant);
                return {
                  ...data,
                  tenant: user.tenant,
                };
              }

              console.log('No tenant ID found, returning original data');
              return data;
            },
          ],
        },
        fields: ({ defaultFields }) => {
          return [
            ...defaultFields,
            { name: 'hasAttachment', type: 'checkbox' },
            { name: 'hasAttatchmentLabel', type: 'text' },
            {
              name: 'tenant',
              type: 'relationship',
              relationTo: 'tenants',
              required: true,
              admin: {
                position: 'sidebar',
                condition: () => true,
              },
              access: {
                read: ({ req, doc }) => {
                  if (!doc) return false;
                  const currentUser = req.user as unknown as User;
                  if (currentUser && currentUser.role === 'admin') return true;
                  return currentUser && currentUser.tenant && doc.tenant
                    ? currentUser.tenant === doc.tenant
                    : false;
                },
                create: ({ req }) => Boolean(req.user),
              },
            },
          ];
        },
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
            
            return false;
          },
          update: ({ req }) => {
            const user = req.user as unknown as User;
            // Admins can update all forms
            if (user?.role === 'admin') return true;
            
            if (user?.tenant) {
              const tenantId = tryParseTenantId(user.tenant);
              if (tenantId !== null) {
                return {
                  tenant: { equals: tenantId }
                };
              }
            }
            
            return false;
          },
          delete: ({ req }) => {
            const user = req.user as unknown as User;
            
            if (user?.role === 'admin') return true;
            
            if (user?.tenant) {
              const tenantId = tryParseTenantId(user.tenant);
              if (tenantId !== null) {
                return {
                  tenant: { equals: tenantId }
                };
              }
            }
            
            return false;
          },
        },
      },
      formSubmissionOverrides: {
        hooks: {
          beforeValidate: [
            async ({ data, req }) => {
              const user = req.user as unknown as User;
              let tenantId = null
              if (user && user.role !== 'admin' && user.tenant) {
                tenantId = tryParseTenantId(user.tenant)
              } else {
                tenantId = tryParseTenantId(data?.tenant);
              }

              if (tenantId !== null) {
                return {
                  ...data,
                  tenant: tenantId,
                };
              }

              if (user?.role === 'admin' && user.tenant && !data?.tenant) {
                return {
                  ...data,
                  tenant: user.tenant,
                };
              }

              return data;
            },
          ],
        },
        fields: ({ defaultFields }) => {
          return [
            ...defaultFields,
            {
              name: 'file',
              type: 'upload',
              relationTo: 'media',
              required: false,
              admin: { allowCreate: true, allowEdit: true },
            },
            {
              name: 'tenant',
              type: 'relationship',
              relationTo: 'tenants',
              required: true,
              admin: {
                position: 'sidebar',
                condition: () => true,
              },
              access: {
                read: ({ req, doc }) => {
                  if (!doc) return false;
                  const currentUser = req.user as unknown as User;
                  return currentUser && currentUser.tenant && doc.tenant
                    ? currentUser.tenant === doc.tenant
                    : false;
                },
                create: ({ req }) => {
                  const currentUser = req.user as unknown as User;
                  return Boolean(currentUser);
                },
              },
            },
          ];
        },
        access: {
          read: ({ req }) => {
            const user = req.user as unknown as User;
            // Admins can access all form submissions
            if (user?.role === 'admin') return true;
            
            // Regular users can only access form submissions from their tenant
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
          update: ({ req }) => {
            const user = req.user as unknown as User;
           
            if (user?.role === 'admin') return true;
            
            if (user?.tenant) {
              const tenantId = tryParseTenantId(user.tenant);
              if (tenantId !== null) {
                return {
                  tenant: { equals: tenantId }
                };
              }
            }
            
            return false;
          },
          delete: ({ req }) => {
            const user = req.user as unknown as User;
           
            if (user?.role === 'admin') return true;
            
            if (user?.tenant) {
              const tenantId = tryParseTenantId(user.tenant);
              if (tenantId !== null) {
                return {
                  tenant: { equals: tenantId }
                };
              }
            }
            
            return false;
          },
        },
      },
    }),
    s3Storage({
      collections: {
        media: {
          prefix: 'media',
        },
      },
      bucket: process.env.S3_BUCKET || '',
      config: {
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY || '',
          secretAccessKey: process.env.S3_SECRET_KEY || '',
        },
        region: process.env.S3_REGION || '',
        endpoint: process.env.S3_ENDPOINT || '',
      },
    }),
  ],
})
