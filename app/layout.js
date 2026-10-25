export const metadata = {
  title: 'Fact or Feed?',
  description: 'Send it anything. Get the real story.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#f7f7f5', color: '#1a1a1a' }}>
        {children}
      </body>
    </html>
  );
}
