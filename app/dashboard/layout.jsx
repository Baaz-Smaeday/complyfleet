'use client';
import { usePathname, useRouter } from 'next/navigation';

const HIDE_BACK = ['/login', '/portal', '/dashboard', '/admin', '/reset-password', '/magic-links'];

export default function RootLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const showBack = !HIDE_BACK.some(p => pathname === p);

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;0,9..40,800&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0 }}>
        {showBack && (
          <div style={{ padding: '16px 32px 0', background: '#f8fafc' }}>
            <button
              onClick={() => router.back()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 16px', borderRadius: 10, border: '1px solid #e2e8f0',
                background: '#fff', fontSize: 13, fontWeight: 600, color: '#374151',
                cursor: 'pointer', fontFamily: 'inherit',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
              }}>
              ← Back
            </button>
          </div>
        )}
        {children}
      </body>
    </html>
  );
}
