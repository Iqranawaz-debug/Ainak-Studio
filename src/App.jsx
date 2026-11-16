import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { getCurrentUser } from './auth.js'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import StorageNotice from './components/StorageNotice.jsx'
import { ToastProvider } from './components/ui/Toast.jsx'
import AuthPage from './pages/AuthPage.jsx'
import CollectionPage from './pages/CollectionPage.jsx'
import TryPage from './pages/TryPage.jsx'

// Only show this page to logged-in users, send everyone else to "/"
function RequireLogin({ children }) {
  return getCurrentUser() ? children : <Navigate to="/" replace />
}

// Logged-in users have no need for the auth page, so send them on to "/try"
function RedirectIfLoggedIn({ children }) {
  return getCurrentUser() ? <Navigate to="/try" replace /> : children
}

function App() {
  return (
    <ErrorBoundary>
    <ToastProvider>
    <StorageNotice />
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <RedirectIfLoggedIn>
              <AuthPage />
            </RedirectIfLoggedIn>
          }
        />
        <Route
          path="/try"
          element={
            <RequireLogin>
              <TryPage />
            </RequireLogin>
          }
        />
        <Route
          path="/collection"
          element={
            <RequireLogin>
              <CollectionPage />
            </RequireLogin>
          }
        />
        {/* Unknown URLs go back to the start */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </ToastProvider>
    </ErrorBoundary>
  )
}

export default App
