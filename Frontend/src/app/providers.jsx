import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'sonner'
import { StrictMode } from 'react'

export function AppProviders({ children }) {
  return (
    <StrictMode>
      <BrowserRouter>
        {children}
        <Toaster position="top-center" richColors offset="80px" />
      </BrowserRouter>
    </StrictMode>
  )
}
