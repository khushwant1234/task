import type { CollectionConfig } from 'payload'
import type { User } from '../payload-types'

export const Tenants: CollectionConfig = {
  slug: 'tenants',
  admin: {
    useAsTitle: 'name',
  },

  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
    },
    {
      name: 'domain',
      type: 'text',
      required: true,
      unique: true,
    },
    {
      name: 'settings',
      type: 'group',
      fields: [
        {
          name: 'allowedFormTypes',
          type: 'select',
          hasMany: true,
          options: [
            {
              label: 'Contact Form',
              value: 'contact',
            },
            {
              label: 'Registration Form',
              value: 'registration',
            },
            {
              label: 'Survey Form',
              value: 'survey',
            },
          ],
        },
        {
          name: 'maxSubmissionsPerForm',
          type: 'number',
          min: 0,
        },
        {
          name: 'customEmailTemplate',
          type: 'textarea',
        },
      ],
    },
  ],
}
