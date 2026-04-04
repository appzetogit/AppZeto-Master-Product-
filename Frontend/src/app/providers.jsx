import { BrowserRouter, HashRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { StrictMode } from 'react'
import { Provider as ReduxProvider } from 'react-redux'
import { store } from './store'

import { QuickCartProvider } from '@quickCommerce/user/context/QuickCartContext'
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

export function AppProviders({ children }) {
  const Router = shouldUseHashRouter() ? HashRouter : BrowserRouter

  return (
    <StrictMode>
      <AuthProvider>
        <SettingsProvider>
          <ToastProvider>
            <ReduxProvider store={store}>
              <QuickCartProvider>
                <Router>
                  {children}
                  <Toaster position="top-center" richColors offset="80px" />
                </Router>
              </QuickCartProvider>
            </ReduxProvider>
          </ToastProvider>
        </SettingsProvider>
      </AuthProvider>
    </StrictMode>
  )
}
