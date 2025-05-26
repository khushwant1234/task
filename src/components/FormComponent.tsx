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

type FormDataType = {
  fields: Field[]
  hasAttachment?: boolean
  hasAttatchmentLabel?: string
}

const FormComponent = ({ formId }: { formId: string }) => {
  const [formData, setFormData] = useState<FormDataType | null>(null)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const [submitMessage, setSubmitMessage] = useState<{
    type: 'success' | 'error' | null
    text: string
  }>({ type: null, text: '' })

  // Step1- Getitng form data from Payload
  useEffect(() => {
    const fetchForm = async () => {
      try {
        const response = await fetch(`/api/forms/${formId}`)
        if (!response.ok) {
          throw new Error('Failed to fetch form')
        }
        const formData = await response.json()
        // console.log('Form data:', formData)
        setFormData(formData)
      } catch (error) {
        console.error('Error fetching form:', error)
      }
    }

    fetchForm()
  }, [formId])

  // Step3- Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const submittedFormData = new FormData(e.currentTarget as HTMLFormElement)

    const dataToBeSubmitted = Array.from(submittedFormData.entries()).map(([name, value]) => ({
      field: name,
      value: value.toString(),
    }))

    console.log('Data to be submitted:', dataToBeSubmitted)
    const file = submittedFormData.get('attachment')
    if (file && file instanceof File) {
      console.log('File to be submitted:', file)

      const fileToSend = new FormData()
      fileToSend.append('file', file as File)
      fileToSend.append('_payload', JSON.stringify({ alt: (file as File).name }))
      try {
        const fileResponse = await fetch('/api/media', {
          method: 'POST',
          body: fileToSend,
        })

        if (!fileResponse.ok) {
          throw new Error('Failed to upload file')
        }

        const fileResult = await fileResponse.json()
        console.log('File uploaded successfully:', fileResult.doc)
        dataToBeSubmitted.push({ field: 'attachment', value: fileResult.doc.url })
      } catch (error) {
        console.error('Error uploading file:', error)
        setError('Failed to upload attachment')
        return
      }
    }

    const response = await fetch('/api/form-submissions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        form: formId,
        submissionData: dataToBeSubmitted,
      }),
    })
    if (!response.ok) {
      const errorData = await response.json()
      setError(errorData.error || 'Something went wrong with the submission')
      setSubmitMessage({
        type: 'error',
        text: errorData || 'There was an error sending your message. Please try again.',
      })
      return
    }
    const result = await response.json()

    let confirmationText = 'Thank you! Your message has been sent successfully.'

    if (
      result.doc.form.confirmationMessage.root &&
      result.doc.form.confirmationMessage.root.children &&
      result.doc.form.confirmationMessage.root.children.length > 0
    ) {
      const firstChild = result.doc.form.confirmationMessage.root.children[0]

      if (firstChild.children && firstChild.children.length > 0) {
        const textNode = firstChild.children[0]

        if (textNode && textNode.text) {
          confirmationText = textNode.text
        }
      }
    }

    setSubmitMessage({
      type: 'success',
      text: confirmationText,
    })
    setTimeout(() => {
      setSubmitMessage({ type: null, text: '' })
      formRef.current?.reset()
    }, 5000)
  }

  console.log('Form data:', formData?.fields)

  // Step2- Render form fields based on formData
  if (!formData) {
    return <div>Loading form...</div>
  }
  if (error) {
    return <div>Error: {error}</div>
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
