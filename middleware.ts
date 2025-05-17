import { NextRequest, NextResponse } from 'next/server'

export function middleware(req: NextRequest) {
  const session = req.cookies.get('user-session')?.value

  const url = req.nextUrl.clone()

  // List of protected paths
  const protectedRoutes = [
    '/admin/dashboard',
    '/agent/dashboard',
    '/employee/dashboard',
    '/user/dashboard'
  ]

  if (protectedRoutes.includes(url.pathname)) {
    if (!session) {
      url.pathname = '/login' // Redirect to login if no session
      return NextResponse.redirect(url)
    }

    // Optional: Parse session & validate role-path match
    try {
      const data = JSON.parse(session)
      if (url.pathname.startsWith(`/${data.userType}`)) {
        return NextResponse.next()
      } else {
        url.pathname = `/${data.userType}/dashboard` // Redirect to correct role
        return NextResponse.redirect(url)
      }
    } catch {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/dashboard',
    '/agent/dashboard',
    '/employee/dashboard',
    '/user/dashboard'
  ]
}
  