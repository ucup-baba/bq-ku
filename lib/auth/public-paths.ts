export const PUBLIC_PATHS = ['/login', '/auth/callback', '/api/auth/logout', '/upload-mandiri', '/api/upload-mandiri'];
export const isPublicPath = (pathname: string) => PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
