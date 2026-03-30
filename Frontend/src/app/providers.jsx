import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { StrictMode } from 'react'
import { Provider as ReduxProvider } from 'react-redux'
import { store } from './store'

import { QuickCartProvider } from '@quickCommerce/user/context/QuickCartContext'

import { AuthProvider } from '@core/context/AuthContext'
import { SettingsProvider } from '@core/context/SettingsContext'
import { ToastProvider } from '@shared/components/ui/Toast'

export function AppProviders({ children }) {
  return (
    <StrictMode>
      <AuthProvider>
        <SettingsProvider>
          <ToastProvider>
            <ReduxProvider store={store}>
              <QuickCartProvider>
                <BrowserRouter>
                  {children}
                  <Toaster position="top-center" richColors offset="80px" />
                </BrowserRouter>
              </QuickCartProvider>
            </ReduxProvider>
          </ToastProvider>
        </SettingsProvider>
      </AuthProvider>
    </StrictMode>
  )
}
