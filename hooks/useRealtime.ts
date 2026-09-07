'use client'
import { useEffect, useRef } from 'react'

export function useRealtime(onChange: () => void) {
  const callback = useRef(onChange)
  callback.current = onChange
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const source = new EventSource('/api/events')
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        if (data.type !== 'connected') {
          clearTimeout(timer)
          timer = setTimeout(() => callback.current(), 120)
        }
      } catch {}
    }
    return () => { clearTimeout(timer); source.close() }
  }, [])
}
