'use client';
import { usePathname, useRouter } from 'next/navigation';

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const isRoot = pathname === '/dashboard';

  return (
    <div>
      {!isRoot && (
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
    </div>
  );
}
