import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { signIn, signUp } from '../auth.js'
import { LogoMark } from '../components/AppHeader.jsx'
import Showroom, { showroomFeatures } from '../components/Showroom.jsx'
import Button from '../components/ui/Button.jsx'
import Chip from '../components/ui/Chip.jsx'
import { AlertIcon, EyeIcon, EyeOffIcon } from '../components/ui/Icons.jsx'
import Input from '../components/ui/Input.jsx'
import SegmentedToggle from '../components/ui/SegmentedToggle.jsx'

// Check the form and return any errors, keyed by field name
function validate(mode, { name, email, password }) {
  const errors = {}

  if (mode === 'signUp' && !name.trim()) {
    errors.name = 'Enter your name.'
  }

  if (!email.trim()) {
    errors.email = 'Enter your email.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.email = 'Enter a valid email, like name@example.com.'
  }

  if (!password) {
    errors.password = 'Enter your password.'
  } else if (mode === 'signUp' && password.length < 8) {
    errors.password = 'Use at least 8 characters.'
  }

  return errors
}

const modeOptions = [
  { id: 'signUp', label: 'Sign up' },
  { id: 'signIn', label: 'Sign in' },
]

const wording = {
  signUp: { heading: 'Create your account', subheading: 'Try on frames with your own camera, in seconds.', submit: 'Sign up', busy: 'Creating your account...' },
  signIn: { heading: 'Welcome back', subheading: 'Sign in to pick up where you left off.', submit: 'Sign in', busy: 'Signing in...' },
}

// One field with room saved for its error, so that an error appearing doesn't push the form around.
// The stronger border is here for this page's contrast, on all but a field showing an error.
function Field(props) {
  return <Input {...props} className="min-h-[6.25rem] [&_input:not([aria-invalid=true])]:!border-ink/55" />
}

function AuthPage() {
  const navigate = useNavigate()
  const formRef = useRef(null)
  const [mode, setMode] = useState('signUp')
  const [values, setValues] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [isPasswordShown, setIsPasswordShown] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Counts failed attempts, to move focus to the first problem after each one
  const [failedAttempts, setFailedAttempts] = useState(0)
  const isSignUp = mode === 'signUp'
  const words = wording[mode]

  useEffect(() => {
    if (failedAttempts > 0) formRef.current.querySelector('[aria-invalid="true"]')?.focus()
  }, [failedAttempts])

  // Switching forms keeps the email but clears the password and any errors
  function switchMode(nextMode) {
    if (nextMode === mode) return
    setMode(nextMode)
    setValues({ ...values, password: '' })
    setErrors({})
    setIsPasswordShown(false)
  }

  // Update one field and clear its error, plus any "wrong password" message
  function handleChange(event) {
    const { name, value } = event.target
    setValues({ ...values, [name]: value })
    setErrors({ ...errors, [name]: undefined, form: undefined })
  }

  // Check a field when leaving it, but don't scold anyone for just passing through an empty one
  function handleBlur(event) {
    const { name, value } = event.target
    if (value) setErrors({ ...errors, [name]: validate(mode, values)[name] })
  }

  function showErrors(newErrors) {
    setErrors(newErrors)
    setFailedAttempts((count) => count + 1)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (isSubmitting) return

    const newErrors = validate(mode, values)
    if (Object.keys(newErrors).length > 0) return showErrors(newErrors)

    setErrors({})
    setIsSubmitting(true)
    const error = isSignUp ? await signUp(values) : await signIn(values)
    setIsSubmitting(false)

    if (error) return showErrors(isSignUp ? { email: error } : { form: error })
    navigate('/try', { replace: true })
  }

  const fieldProps = { error: undefined, onChange: handleChange, onBlur: handleBlur }

  return (
    // Desktop: two equal panels filling the screen with no page scroll. Smaller: the showroom as a banner, then the form.
    <div className="grid min-h-dvh grid-rows-[13.75rem_1fr] lg:h-dvh lg:grid-cols-2 lg:grid-rows-1 lg:overflow-hidden">
      {/* The bottom padding matches the brand lockup's height, so the form sits at the true middle of the panel */}
      <main className="relative order-last flex min-h-0 flex-col px-4 pb-4 sm:px-8 lg:order-first lg:overflow-y-auto lg:px-12 lg:pb-14 lg:[@media(max-height:720px)]:pb-4">
        {/* Short laptop screens get tighter spacing, so that the form still fits without scrolling */}
        <div className="flex shrink-0 items-center gap-2.5 pt-5 lg:pt-7 lg:[@media(max-height:720px)]:pt-4">
          <LogoMark />
          <p className="font-heading text-title font-semibold">VisualLens AI</p>
        </div>

        {/* my-auto centers the form, and still lets a short window scroll instead of clipping it */}
        <div className="mx-auto my-auto w-full max-w-[420px] py-6 lg:[@media(max-height:720px)]:py-2">
          <div key={mode} className="auth-fade">
            <h1 className="text-display font-semibold">{words.heading}</h1>
            <p className="mt-1.5 text-label text-ink/70">{words.subheading}</p>
          </div>

          <SegmentedToggle label="Sign up or sign in" options={modeOptions} value={mode} onChoose={switchMode} fill arrowKeys className="mt-5" />

          {/* noValidate turns off browser popups so our inline errors show instead */}
          <form ref={formRef} onSubmit={handleSubmit} noValidate className="mt-5">
            {/* Tall enough for sign up, so that switching to the shorter sign in doesn't make the page jump */}
            <div key={mode} className="auth-fade min-h-[25.75rem]">
              {isSignUp && <Field {...fieldProps} label="Name" name="name" type="text" autoComplete="name" value={values.name} error={errors.name} />}
              <Field {...fieldProps} label="Email" name="email" type="email" autoComplete="email" value={values.email} error={errors.email} />
              <Field
                {...fieldProps}
                label="Password"
                name="password"
                type={isPasswordShown ? 'text' : 'password'}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                value={values.password}
                error={errors.password}
                trailing={
                  <Button
                    variant="icon"
                    emphasis="ghost"
                    size="sm"
                    label={isPasswordShown ? 'Hide password' : 'Show password'}
                    onClick={() => setIsPasswordShown(!isPasswordShown)}
                  >
                    {isPasswordShown ? <EyeOffIcon /> : <EyeIcon />}
                  </Button>
                }
              />

              {errors.form && (
                <p className="mb-3 flex items-center gap-1.5 text-label">
                  <AlertIcon className="size-4 text-coral" />
                  {errors.form}
                </p>
              )}

              <Button variant="primary" size="lg" type="submit" loading={isSubmitting} className="mt-1 w-full">
                {isSubmitting ? words.busy : words.submit}
              </Button>

              <hr className="mt-5 border-ink/10" />
              <p className="mt-3 text-center text-caption text-ink/70">Your account is saved on this device.</p>
            </div>

            {/* Reads out new errors. It's always on the page, as screen readers only watch what was already there. */}
            <p aria-live="polite" className="sr-only">
              {Object.values(errors).filter(Boolean).join(' ')}
            </p>
          </form>

          {/* Small screens: the showroom's tagline and features, in a single row of chips */}
          <div className="mt-5 lg:hidden">
            <p className="text-center font-heading text-title font-semibold">Find the frames that fit your face.</p>
            <ul className="mt-3 flex justify-center gap-1.5">
              {showroomFeatures.map(({ id, icon: Icon, title }) => (
                <li key={id}>
                  <Chip className="!px-2 whitespace-nowrap">
                    {/* The chips only just fit on the smallest phones, without their icons */}
                    <Icon className="size-4 max-sm:hidden" />
                    {title}
                  </Chip>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>

      <Showroom className="order-first lg:order-last" />
    </div>
  )
}

export default AuthPage
