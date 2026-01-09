import { useEffect } from 'react'
import { Redirect } from 'expo-router'
import { initializeServiceToken } from '@/lib/api'

export default function IndexPage() {
  // ✅ Fetch token immediately (safe — doesn’t depend on router)
  useEffect(() => {
    initializeServiceToken()
  }, [])

  // ✅ Use <Redirect> instead of router.replace() to avoid “navigate before mount” error
  return <Redirect href="/loading" />
}
