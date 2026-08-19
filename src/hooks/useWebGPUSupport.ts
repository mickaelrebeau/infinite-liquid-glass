import { useEffect, useState } from 'react'

export function useWebGPUSupport() {
  const [supported, setSupported] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false

    async function check() {
      if (!('gpu' in navigator)) {
        if (!cancelled) setSupported(false)
        return
      }

      try {
        const adapter = await navigator.gpu.requestAdapter()
        if (!cancelled) setSupported(Boolean(adapter))
      } catch {
        if (!cancelled) setSupported(false)
      }
    }

    void check()

    return () => {
      cancelled = true
    }
  }, [])

  return supported
}

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(media.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return reduced
}
