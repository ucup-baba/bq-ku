export const PUBLIC_PATHS = ['/login', '/reset-password', '/auth/callback', '/upload-mandiri', '/api/upload-mandiri'];
export const isPublicPath = (pathname: string) => PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
