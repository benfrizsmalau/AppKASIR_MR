import { NextResponse } from 'next/server';

/**
 * Middleware route protection (edge-safe, no DB calls).
 * Hanya cek keberadaan cookie — verifikasi role dilakukan di layout masing-masing.
 *
 * /pos/*       → butuh session_user_id + active_outlet_id → redirect ke /
 * /portal/*    → butuh session_user_id + active_tenant_id → redirect ke /masuk
 * /pengaturan/* → butuh session_user_id + active_outlet_id → redirect ke /
 */
export function middleware(request) {
    const { pathname } = request.nextUrl;
    const sessionUserId = request.cookies.get('session_user_id')?.value;
    const activeTenantId = request.cookies.get('active_tenant_id')?.value;
    const activeOutletId = request.cookies.get('active_outlet_id')?.value;

    // Proteksi portal Owner/Admin
    if (pathname.startsWith('/portal')) {
        if (!sessionUserId || !activeTenantId) {
            return NextResponse.redirect(new URL('/masuk', request.url));
        }
    }

    // Proteksi halaman POS & Pengaturan
    if (pathname.startsWith('/pos') || pathname.startsWith('/pengaturan')) {
        if (!sessionUserId || !activeOutletId) {
            return NextResponse.redirect(new URL('/', request.url));
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/pos/:path*', '/portal/:path*', '/pengaturan/:path*'],
};
