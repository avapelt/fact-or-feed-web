// Makes the website installable like an app.
// On Android, "share_target" puts Fact or Feed? in the phone's Share menu.
export default function manifest() {
  return {
    name: 'Fact or Feed?',
    short_name: 'Fact or Feed',
    description: 'Send it anything you saw online. Get the real story.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f4f1ec',
    theme_color: '#4f46e5',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    share_target: {
      action: '/',
      method: 'GET',
      params: { title: 'title', text: 'text', url: 'url' },
    },
  };
}
