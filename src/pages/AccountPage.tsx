import { supabase } from '@/lib/supabase'

export default function AccountPage() {
    return (
        <div className="p-6 max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-4">Welcome to Vavus AI</h1>
            <p className="mb-6">You’re logged in. Build your dashboard here.</p>
            <button
                className="rounded px-4 py-2 border"
                onClick={() => supabase.auth.signOut()}
            >
                Sign out
            </button>
        </div>
    )
}
