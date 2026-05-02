import { type NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
    const pathname = request.nextUrl.pathname
    const requiresAuth = pathname.startsWith('/dashboard') || pathname.startsWith('/chat')
    const isLoginRoute = pathname === '/login'

    // Check for JWT token in cookies or Authorization header
    const token = request.cookies.get('ainote_token')?.value

    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    })

    if (requiresAuth) {
        if (!token) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
        response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
        response.headers.set('Pragma', 'no-cache')
        response.headers.set('Expires', '0')
    }

    if (isLoginRoute && token) {
        return NextResponse.redirect(new URL('/', request.url))
    }

    return response
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/chat/:path*',
        '/login',
    ],
}
