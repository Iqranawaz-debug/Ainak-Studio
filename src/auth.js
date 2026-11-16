// Fake auth for now: everything lives in this browser's localStorage.
// This is NOT real security. Replace it with a real backend before launch.
import { readItem, readList, removeItem, writeItem, writeList } from './storage.js'

const USERS_KEY = 'visuallens.users'
const LOGGED_IN_KEY = 'visuallens.loggedIn'
const CURRENT_EMAIL_KEY = 'visuallens.currentEmail'

// Read the saved users, falling back to an empty list if the data is missing or broken
function getUsers() {
  return readList(USERS_KEY, (user) => typeof user?.email === 'string' && typeof user?.name === 'string')
}

// Emails are compared in one consistent form, so "A@b.com" matches "a@b.com"
function normalizeEmail(email) {
  return email.trim().toLowerCase()
}

// Hash the password so it is never stored as plain text.
// crypto.subtle only works on localhost and https.
async function hashPassword(email, password) {
  const bytes = new TextEncoder().encode(`${email}:${password}`)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

// Set the logged-in flag and remember who is logged in
function startSession(email) {
  writeItem(LOGGED_IN_KEY, 'true')
  writeItem(CURRENT_EMAIL_KEY, email)
}

// Create an account and log in. Returns an error message, or null on success.
export async function signUp({ name, email, password }) {
  const cleanEmail = normalizeEmail(email)
  const users = getUsers()

  if (users.some((user) => user.email === cleanEmail)) {
    return 'An account with this email already exists. Sign in instead.'
  }

  const passwordHash = await hashPassword(cleanEmail, password)
  users.push({ name: name.trim(), email: cleanEmail, passwordHash })
  writeList(USERS_KEY, users)
  startSession(cleanEmail)
  return null
}

// Log in to an existing account. Returns an error message, or null on success.
export async function signIn({ email, password }) {
  const cleanEmail = normalizeEmail(email)
  const user = getUsers().find((savedUser) => savedUser.email === cleanEmail)
  const passwordHash = await hashPassword(cleanEmail, password)

  if (!user || user.passwordHash !== passwordHash) {
    return 'Incorrect email or password.'
  }

  startSession(cleanEmail)
  return null
}

// Clear the session but keep the saved account, so the user can sign in again
export function logOut() {
  removeItem(LOGGED_IN_KEY)
  removeItem(CURRENT_EMAIL_KEY)
}

// The logged-in user, or null if nobody is logged in
export function getCurrentUser() {
  if (readItem(LOGGED_IN_KEY) !== 'true') return null
  const email = readItem(CURRENT_EMAIL_KEY)
  return getUsers().find((user) => user.email === email) ?? null
}
