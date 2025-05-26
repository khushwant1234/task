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
              // This runs before any validation - good place to fix the tenant
              console.log('Form data before processing:', JSON.stringify(data));
              
              // Extract tenant ID from various possible formats
              let tenantId = null;
              const user = req.user as unknown as User;
              
              // 1. If user is non-admin with tenant, use their tenant
              if (user && user.role !== 'admin' && user.tenant) {
                tenantId = user.tenant;
              } 
              // 2. If tenant is an object with ID
              else if (data?.tenant && typeof data?.tenant === 'object' && 'id' in data?.tenant) {
                tenantId = data?.tenant.id;
              }
              // 3. If tenant is a string that can be parsed
              else if (data?.tenant && typeof data?.tenant === 'string') {
                try {
                  // Try parsing as JSON
                  const parsed = JSON.parse(data?.tenant);
                  if (parsed && typeof parsed === 'object' && 'id' in parsed) {
                    tenantId = parsed.id;
                  }
                } catch (e) {
                  // If not valid JSON, check if it's a numeric string
                  if (!isNaN(Number(data?.tenant))) {
                    tenantId = Number(data?.tenant);
                  }
                }
              }
              
              // Set the tenant ID if we found one
              if (tenantId) {
                console.log(`Setting tenant ID to: ${tenantId}`);
                return {
                  ...data,
                  tenant: tenantId,
                };
              }
              
              // Admin fallback
              if (user?.role === 'admin' && user.tenant && !data?.tenant) {
                return {
                  ...data,
                  tenant: user.tenant,
                };
              }
              
              return data;
            }
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
                condition: (data, siblingData) => {
                  // Only show in admin UI for admin users
                  return data?.role === 'admin' || false;
                },
              },
              // Keep field-level access controls but rely on global hook for data transformation
              access: {
                read: ({ req, doc }) => {
                  if (!doc) return false;
                  const currentUser = req.user as unknown as User;
                  if (currentUser && currentUser.role === 'admin') return true;
                  return currentUser && currentUser.tenant && doc.tenant 
                    ? currentUser.tenant === doc.tenant 
                    : false;
                },
                create: ({ req }) => {
                  return Boolean(req.user);
                },
              },
            },
          ]
        },
      },
      formSubmissionOverrides: {
        // Apply the same hook pattern to submissions
        hooks: {
          beforeValidate: [
            async ({ data, req }) => {
              // Same code as above for form submissions
              console.log('Form submission data before processing:', JSON.stringify(data));
              
              // Extract tenant ID from various possible formats
              let tenantId = null;
              const user = req.user as unknown as User;
              
              // 1. If user is non-admin with tenant, use their tenant
              if (user && user.role !== 'admin' && user.tenant) {
                tenantId = user.tenant;
              } 
              // 2. If tenant is an object with ID
              else if (data?.tenant && typeof data?.tenant === 'object' && 'id' in data?.tenant) {
                tenantId = data?.tenant.id;
              }
              // 3. If tenant is a string that can be parsed
              else if (data?.tenant && typeof data?.tenant === 'string') {
                try {
                  // Try parsing as JSON
                  const parsed = JSON.parse(data?.tenant);
                  if (parsed && typeof parsed === 'object' && 'id' in parsed) {
                    tenantId = parsed.id;
                  }
                } catch (e) {
                  // If not valid JSON, check if it's a numeric string
                  if (!isNaN(Number(data?.tenant))) {
                    tenantId = Number(data?.tenant);
                  }
                }
              }
              
              // Set the tenant ID if we found one
              if (tenantId) {
                console.log(`Setting tenant ID to: ${tenantId}`);
                return {
                  ...data,
                  tenant: tenantId,
                };
              }
              
              // Admin fallback
              if (user?.role === 'admin' && user.tenant && !data?.tenant) {
                return {
                  ...data,
                  tenant: user.tenant,
                };
              }
              
              return data;
            }
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
                condition: (data, siblingData) => {
                  // Only show in admin UI for admin users
                  return data?.role === 'admin' || false;
                },
              },
              access: {
                read: ({ req, doc }) => {
                  if (!doc) return false; // If document doesn't exist, deny access
                  const currentUser = req.user as unknown as User;
                  // Check that both user and tenant properties exist before comparing
                  return currentUser && currentUser.tenant && doc.tenant 
                    ? currentUser.tenant === doc.tenant 
                    : false;
                },
                create: ({ req }) => {
                  const currentUser = req.user as unknown as User;
                  return currentUser ? true : false // Allow any logged-in user to create forms
                },
              },
            },
          ]
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
