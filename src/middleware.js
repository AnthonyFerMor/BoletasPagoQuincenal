import { NextResponse } from 'next/server';

export async function middleware(request) {
  // Supabase session refresh — desactivado hasta configurar .env.local
  // Cuando tengas las keys de Supabase, descomentar el código de refresh
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
