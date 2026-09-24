'use client'
import { useEffect, useRef } from 'react'

export function useRealtime(onChange: () => void, intervalMs = 5000) {
  const callback = useRef(onChange)
  callback.current = onChange
  useEffect(() => {
    const timer = setInterval(() => callback.current(), intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs])
}
