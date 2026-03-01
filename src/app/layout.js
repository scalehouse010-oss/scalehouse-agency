export const metadata = {
  title: 'Scale House — Agency OS',
  description: 'TikTok Shop Agency Management',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, height: '100vh' }}>
        {children}
      </body>
    </html>
  )
}
