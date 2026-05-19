// Start JFBM
import React from 'react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    if (typeof this.props.onError === 'function') {
      this.props.onError(error, info)
      return
    }
    console.error('ErrorBoundary caught an error', error, info)
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null })
    if (typeof this.props.onRetry === 'function') {
      this.props.onRetry()
    }
  }

  render() {
    const { hasError } = this.state
    if (!hasError) return this.props.children

    const title = this.props.title || 'Ocurrio un problema'
    const message = this.props.message || 'No se pudo renderizar esta vista. Puedes reintentar.'

    return (
      <section className="fe-card border border-red-200 bg-red-50 px-5 py-4">
        <h2 className="text-base font-semibold text-red-700">{title}</h2>
        <p className="mt-2 text-sm text-red-700">{message}</p>
        <button type="button" onClick={this.handleRetry} className="fe-btn-primary mt-3">
          Reintentar
        </button>
      </section>
    )
  }
}

export default ErrorBoundary
// End JFBM
