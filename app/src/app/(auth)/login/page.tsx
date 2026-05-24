import { redirect } from 'next/navigation'

// Auth disabled — single-user app. Redirect anyone who lands here.
export default function LoginPage() {
  redirect('/dashboard')
}
