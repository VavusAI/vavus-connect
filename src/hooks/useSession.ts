import { useEffect, useState } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export function useSession() {
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setSession(data.session ?? null)
            setLoading(false)
        })
        const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
            setSession(s)
        })
        return () => sub.subscription.unsubscribe()
    }, [])

    return { session, loading }
}
