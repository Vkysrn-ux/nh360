import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const session = req.cookies.get('user-session')?.value
  const url = req.nextUrl.clone()

  // Match all protected role paths
  const protectedPrefixes = ['/admin', '/agent', '/employee', '/user']

  // Check if path starts with a protected prefix
  const isProtected = protectedPrefixes.some(prefix => url.pathname.startsWith(prefix))

  if (isProtected) {
    if (!session) {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    try {
      const data = JSON.parse(session) // expects: { userType: 'admin' | 'agent' | ... }

      // Allow only correct role to access their routes
      const allowedPrefix = `/${data.userType}`
      if (url.pathname.startsWith(allowedPrefix)) {
        return NextResponse.next()
      } else {
        // Redirect to correct dashboard if wrong role
        url.pathname = `${allowedPrefix}/dashboard`
        return NextResponse.redirect(url)
      }
    } catch {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

// Protect *all* pages under role paths, not just dashboard
export const config = {
  matcher: [
    '/admin/:path*',
    '/agent/:path*',
    '/employee/:path*',
    '/user/:path*',
  ]
}
