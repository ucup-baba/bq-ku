export const PUBLIC_PATHS = ['/login', '/auth/callback', '/api/auth/logout', '/upload-mandiri', '/api/upload-mandiri', '/manifest.webmanifest', '/icon.png', '/apple-icon.png', '/sw.js', '/offline.html'];
export const isPublicPath = (pathname: string) => PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'));
