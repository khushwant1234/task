'use client'
import React from 'react'
import { useEffect, useState, useRef } from 'react'
import './form.css'

//get the form from payload
// render the form based on field types

type Field = {
  id: string
  name: string
  label: string
  type: string
  required?: boolean
}

type FormData = {
  id: string
  title: string
  fields: Field[]
  hasAttachment?: boolean
  hasAttatchmentLabel?: string
  tenant: {
    id: string
    name: string
  }
}

type SubmitMessage = {
  type: 'success' | 'error' | null
  text: string
}

const FormComponent = ({ formId, tenantId }: { formId: string; tenantId: string }) => {
  const [formData, setFormData] = useState<FormData | null>(null)
  const [submitMessage, setSubmitMessage] = useState<SubmitMessage>({ type: null, text: '' })
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const response = await fetch(`/api/forms/${formId}?tenant=${tenantId}`)
        if (!response.ok) throw new Error('Failed to fetch form')
        const data = await response.json()
        setFormData(data)
      } catch (error) {
        console.error('Error fetching form:', error)
        setSubmitMessage({
          type: 'error',
          text: 'Failed to load form. Please try again later.',
        })
      }
    }

    fetchForm()
  }, [formId, tenantId])

  console.log('tenant', tenantId)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formRef.current || !formData) return

    const formDataObj = new FormData(formRef.current)
    const submissionData: Record<string, string> = {}

    // Convert FormData to object
    formDataObj.forEach((value, key) => {
      submissionData[key] = value.toString()
    })
    console.log(tenantId)

    try {
      const response = await fetch('/api/form-submissions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          form: formId,
          tenant: tenantId,
          submissionData: Object.entries(submissionData).map(([field, value]) => ({
            field,
            value,
          })),
        }),
      })

      if (!response.ok) throw new Error('Failed to submit form')

      setSubmitMessage({
        type: 'success',
        text: 'Form submitted successfully!',
      })
      formRef.current.reset()
    } catch (error) {
      console.error('Error submitting form:', error)
      setSubmitMessage({
        type: 'error',
        text: 'Failed to submit form. Please try again later.',
      })
    }
  }

  if (!formData) {
    return <div>Loading form...</div>
  }

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit} ref={formRef}>
        {formData.fields.map((field: any) => (
          <div key={field.id} className="form-field">
            <label htmlFor={field.id}>{field.name}</label>
            {field.blockType === 'email' && (
              <input
                type={field.blockType}
                id={field.id}
                name={field.name}
                placeholder={field.label}
                required={field.required}
              />
            )}
            {field.blockType === 'text' && (
              <input
                type="text"
                id={field.id}
                name={field.name}
                required={field.required}
                placeholder={field.label}
              />
            )}
            {field.blockType === 'textarea' && (
              <textarea
                id={field.id}
                name={field.name}
                required={field.required}
                placeholder={field.label}
                rows={10}
              ></textarea>
            )}
          </div>
        ))}

        {formData.hasAttachment && (
          <div className="form-field">
            <label htmlFor={`attachmentLabel`}>{formData.hasAttatchmentLabel}</label>
            <input type="file" id={`attachment`} name={`attachment`} />
          </div>
        )}
        <button type="submit" className="submit-button">
          Submit
        </button>
      </form>
      {submitMessage.type && (
        <div className={`submit-message ${submitMessage.type === 'success' ? 'success' : 'error'}`}>
          {submitMessage.text}
        </div>
      )}
    </div>
  )
}

export default FormComponent
