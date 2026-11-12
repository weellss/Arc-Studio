import { useEffect, useState } from 'react'
import { getShareBase } from '@/lib/share'

/** Resolves the public base URL for links the user will copy and send. Undefined until ready. */
export function useShareBase(): string | undefined {
  const [base, setBase] = useState<string | undefined>()
  useEffect(() => {
    let live = true
    void getShareBase().then((value) => {
      if (live) setBase(value)
    })
    return () => {
      live = false
    }
  }, [])
  return base
}
