import { Navigate } from 'react-router-dom'
import { useSession } from '@/hooks/useSession'

export default function ProtectedRoute({ children }: { children: JSX.Element }) {
    const { session, loading } = useSession()
    if (loading) return null // or a spinner
    return session ? children : <Navigate to="/auth" replace />
}
