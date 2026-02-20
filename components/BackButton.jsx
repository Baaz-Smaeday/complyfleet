'use client';
import { useRouter } from 'next/navigation';

export default function BackButton({ href }) {
  const router = useRouter();
  return (
    <button
      onClick={() => href ? router.push(href) : router.back()}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '8px 16px', borderRadius: 10, border: '1px solid #e2e8f0',
        background: '#fff', fontSize: 13, fontWeight: 600, color: '#374151',
        cursor: 'pointer', fontFamily: 'inherit', marginBottom: 24,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)'
      }}
      onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
      onMouseLeave={e => e.currentTarget.style.background = '#fff'}
    >
      ← Back
    </button>
  );
}
