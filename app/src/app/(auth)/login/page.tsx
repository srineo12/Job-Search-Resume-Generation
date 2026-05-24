'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// Auth permanently disabled. Anyone landing on /login is sent to dashboard.
export default function LoginPage() {
  const router = useRouter()
  useEffect(() => { router.replace('/dashboard') }, [router])
  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-gray-500 text-sm">Redirecting…</p>
    </div>
  )
}
