import { Component } from 'react'
import Button from './ui/Button.jsx'
import Card from './ui/Card.jsx'

// Catches a crash anywhere below it, so that people see a way forward and never a blank page.
// React only offers this as a class. Leaving the crashed page also runs its clean-up, so the camera turns off.
class ErrorBoundary extends Component {
  state = { hasCrashed: false }

  static getDerivedStateFromError() {
    return { hasCrashed: true }
  }

  componentDidCatch(error) {
    console.error(error)
  }

  render() {
    if (!this.state.hasCrashed) return this.props.children

    return (
      <main className="flex min-h-dvh items-center justify-center p-4">
        <Card role="alert" padding="none" raised className="w-full max-w-md p-6 text-center sm:p-10">
          <h1 className="text-heading font-semibold">Something went wrong</h1>
          <p className="mt-3">Sorry about that. Reloading the page usually fixes it, and your choices saved on this device are safe.</p>
          <Button variant="primary" size="lg" onClick={() => window.location.reload()} className="mt-6">
            Reload
          </Button>
        </Card>
      </main>
    )
  }
}

export default ErrorBoundary
