import { headers as getHeaders } from 'next/headers.js'
// import Image from 'next/image'
import { getPayload } from 'payload'
import React from 'react'
import { fileURLToPath } from 'url'

import config from '@/payload.config'
import './styles.css'
import FormComponent from '@/components/FormComponent'

export default async function HomePage() {
  const headers = await getHeaders()
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { user } = await payload.auth({ headers })

  // Get the host from headers to determine the tenant
  const host = headers.get('host') || ''

  const tenant = await payload.find({
    collection: 'tenants',
    where: {
      domain: {
        equals: host,
      },
    },
  })

  console.log(tenant)
  if (!tenant.docs.length) {
    return <div>Tenant not found</div>
  }

  const tenantId = tenant.docs[0].name

  return (
    <div className="contact-page">
      <h1 className="page-heading">Contact Form</h1>
      <FormComponent formId="1" tenantId={tenantId} />
    </div>
  )
}
