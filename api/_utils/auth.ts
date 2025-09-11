// _utils/auth.ts
import jwt, { JwtPayload } from 'jsonwebtoken';

export function requireUser(req: any) {
    const auth = req.headers?.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) throw new Error('Missing bearer token');

    const payload = jwt.verify(
        token,
        process.env.SUPABASE_JWT_SECRET as string
    ) as JwtPayload;

    const userId = (payload as any)?.sub;
    if (!userId) throw new Error('Invalid token');

    return { userId, token };
}

// alias so chat.ts compiles
export const getUserFromReq = requireUser;
