import { useState } from 'react'

const initialValues = {
  name: '',
  email: '',
  bio: ''
}

const MAX_BIO_LENGTH = 400

function validate(values) {
  const nextErrors = {}

  if (!values.name.trim()) {
    nextErrors.name = 'Name is required.'
  }

  if (!values.email.trim()) {
    nextErrors.email = 'Email is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
    nextErrors.email = 'Enter a valid email address.'
  }

  if (values.bio.length > MAX_BIO_LENGTH) {
    nextErrors.bio = 'Bio must be 400 characters or fewer.'
  }

  return nextErrors
}

function App() {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const handleChange = (event) => {
    const { name, value } = event.target
    setValues((current) => ({ ...current, [name]: value }))

    if (errors[name]) {
      setErrors((current) => ({ ...current, [name]: undefined }))
    }

    if (submitted) {
      setSubmitted(false)
    }
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const nextErrors = validate(values)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      setSubmitted(false)
      return
    }

    setSubmitted(true)
  }

  return (
    <main className="settings-page">
      <section className="settings-panel" aria-labelledby="settings-title">
        <header className="settings-header">
          <div>
            <p className="eyebrow">Portfolio</p>
            <h1 id="settings-title">Profile settings</h1>
          </div>
          <button type="submit" form="settings-form" className="primary-button">
            Save profile
          </button>
        </header>

        <form id="settings-form" noValidate onSubmit={handleSubmit} className="settings-form">
          <div className="field-group">
            <label htmlFor="name">Name</label>
            <input
              id="name"
              name="name"
              type="text"
              value={values.name}
              onChange={handleChange}
              aria-invalid={Boolean(errors.name)}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name && (
              <p id="name-error" className="error-text" role="alert">
                {errors.name}
              </p>
            )}
          </div>

          <div className="field-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={values.email}
              onChange={handleChange}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <p id="email-error" className="error-text" role="alert">
                {errors.email}
              </p>
            )}
          </div>

          <div className="field-group">
            <div className="label-row">
              <label htmlFor="bio">Bio</label>
              <span className="counter">{values.bio.length}/{MAX_BIO_LENGTH}</span>
            </div>
            <textarea
              id="bio"
              name="bio"
              rows="5"
              value={values.bio}
              onChange={handleChange}
              aria-invalid={Boolean(errors.bio)}
              aria-describedby={errors.bio ? 'bio-error' : undefined}
            />
            {errors.bio && (
              <p id="bio-error" className="error-text" role="alert">
                {errors.bio}
              </p>
            )}
          </div>

          {submitted && (
            <div className="success-banner" role="status" aria-live="polite">
              Profile saved successfully.
            </div>
          )}
        </form>
      </section>
    </main>
  )
}

export default App
