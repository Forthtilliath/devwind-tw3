import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { useT } from '../i18n/useT'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

function ErrorFallback({ error }: { error: Error }) {
  const t = useT()
  return (
    <div className="devwind-panel devwind-panel--empty" role="alert">
      <p>{t('error.title')}</p>
      <pre className="devwind-error__details">{error.message}</pre>
      <button type="button" className="devwind-button" onClick={() => window.location.reload()}>
        {t('error.reload')}
      </button>
    </div>
  )
}

/** Une exception de rendu ne doit pas laisser un écran blanc : message + rechargement du panneau
 * (qui se reconnecte à la page au démarrage). */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('DevWind :', error, info.componentStack)
  }

  render() {
    return this.state.error ? <ErrorFallback error={this.state.error} /> : this.props.children
  }
}
