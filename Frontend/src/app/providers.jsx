import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { StrictMode } from 'react'
import { Provider as ReduxProvider } from 'react-redux'
import { store } from './store'

export function AppProviders({ children }) {
  return (
    <StrictMode>
      <ReduxProvider store={store}>
        <BrowserRouter>
          {children}
          <Toaster position="top-center" richColors offset="80px" />
        </BrowserRouter>
      </ReduxProvider>
    </StrictMode>
  )
}
