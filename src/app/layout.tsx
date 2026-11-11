export const metadata = { title: 'Conquer Files', robots: { index: false, follow: false } };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: 32, color: '#1a1a1a' }}>{children}</body>
    </html>
  );
}
