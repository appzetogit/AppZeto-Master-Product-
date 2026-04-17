import { BrowserRouter, HashRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { StrictMode, useEffect } from 'react'
import { Provider as ReduxProvider } from 'react-redux'
import { store } from './store'

import { AuthProvider } from '@core/context/AuthContext'
import { SettingsProvider } from '@core/context/SettingsContext'
import { ToastProvider } from '@shared/components/ui/Toast'

function shouldUseHashRouter() {
  if (typeof window === 'undefined') return false

  const protocol = String(window.location?.protocol || '').toLowerCase()
  const userAgent = String(window.navigator?.userAgent || '').toLowerCase()

  return (
    Boolean(window.flutter_inappwebview) ||
    Boolean(window.ReactNativeWebView) ||
    protocol === 'file:' ||
    userAgent.includes(' wv') ||
    userAgent.includes('; wv')
  )
}

const resolveTheme = () => {
  if (typeof window === 'undefined') return 'light'
  const saved = String(window.localStorage.getItem('appTheme') || 'light').toLowerCase()
  return saved === 'dark' ? 'dark' : 'light'
}

const applyThemeClass = (theme) => {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

function ThemeClassSync() {
  useEffect(() => {
    const syncTheme = () => {
      applyThemeClass(resolveTheme())
    }

    syncTheme()
    window.addEventListener('storage', syncTheme)
    window.addEventListener('app-theme-changed', syncTheme)
    document.addEventListener('visibilitychange', syncTheme)

    return () => {
      window.removeEventListener('storage', syncTheme)
      window.removeEventListener('app-theme-changed', syncTheme)
      document.removeEventListener('visibilitychange', syncTheme)
    }
  }, [])

  return null
}

export function AppProviders({ children }) {
  const Router = shouldUseHashRouter() ? HashRouter : BrowserRouter

  return (
    <StrictMode>
      <ThemeClassSync />
      <AuthProvider>
        <SettingsProvider>
          <ToastProvider>
            <ReduxProvider store={store}>
              <Router>
                {children}
                <Toaster position="top-center" richColors offset="80px" />
              </Router>
            </ReduxProvider>
          </ToastProvider>
        </SettingsProvider>
      </AuthProvider>
    </StrictMode>
  )
}
