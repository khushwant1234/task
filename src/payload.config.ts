// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import { formBuilderPlugin } from '@payloadcms/plugin-form-builder'
import { s3Storage } from '@payloadcms/storage-s3'
import { Users } from './collections/Users'
import { Media } from './collections/Media'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media],
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
    formBuilderPlugin({
      formOverrides: {
        fields: ({defaultFields}) => {
          return [
          ...defaultFields,
          {name: 'hasAttachment' , type: 'checkbox' },
            {name: 'hasAttatchmentLabel', type: 'text'}, ]
           },
      },
      formSubmissionOverrides: {
        fields: ({defaultFields}) => {
          return [
            ...defaultFields,
            {name: 'file', type: 'upload', relationTo: 'media', required: false, admin: { allowCreate: true, allowEdit: true } },
          ]
        }
      }
    }),
    s3Storage({
      collections: {
        media: {
          prefix: "media",
        }
      },
      bucket: process.env.S3_BUCKET,
      config: {
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY, // Changed from S3_ACCESS_KEY_ID to match .env
          secretAccessKey: process.env.S3_SECRET_KEY, // Changed from S3_SECRET_ACCESS_KEY to match .env
        },
        region: process.env.S3_REGION,
        endpoint: process.env.S3_ENDPOINT, // Moved endpoint inside config object
      },
    }),
    
  ],
})
