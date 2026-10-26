export const metadata = {
  title: 'Fact or Feed?',
  description: 'Send it anything. Get the real story.',
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-icon.png',
  },
  appleWebApp: {
    capable: true,
    title: 'Fact or Feed',
    statusBarStyle: 'default',
  },
};

export const viewport = {
  themeColor: '#4f46e5',
};

export default function RootLayout({ children }) {
  return (
    // lang and dir start as English; the page switches them to the language the person picks (Arabic: right to left)
    <html lang="en" dir="ltr">
      <body style={{ margin: 0, background: '#f7f7f5', color: '#1a1a1a' }}>
        {children}
      </body>
    </html>
  );
}
