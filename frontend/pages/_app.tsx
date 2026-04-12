import '@/styles/globals.css'
import type { AppProps } from 'next/app'
import { useRouter } from 'next/router'
import { AuthProvider } from '@/context/AuthContext'
import Footer from '@/components/Footer'

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter()
  const hideFooter = router.pathname.startsWith('/editor/') || router.pathname.startsWith('/auth/')

  return (
    <AuthProvider>
      <Component {...pageProps} />
      {!hideFooter && <Footer />}
    </AuthProvider>
  )
}
