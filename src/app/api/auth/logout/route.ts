import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { deleteSession, SESSION_COOKIE_NAME } from '@/lib/auth';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const sessionTokenCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (sessionTokenCookie && sessionTokenCookie.value) {
      // Delete from DB
      await deleteSession(sessionTokenCookie.value);
    }

    // Clear the cookie
    cookieStore.set(SESSION_COOKIE_NAME, '', {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      expires: new Date(0), // set to Unix epoch to delete
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error in logout endpoint:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
