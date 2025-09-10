import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🚨 GuideOps Error:', error);
    console.error('📋 Error Info:', errorInfo);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="error-boundary__container">
            <div className="error-boundary__icon">⚠️</div>
            <h2>Oops! Something went wrong</h2>
            <p>GuideOps encountered an unexpected error.</p>
            
            <details className="error-boundary__details">
              <summary>Technical Details</summary>
              <pre className="error-boundary__error">
                {this.state.error?.toString()}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
            
            <div className="error-boundary__actions">
              <button 
                className="error-boundary__button"
                onClick={() => window.location.reload()}
              >
                🔄 Reload Page
              </button>
              <button 
                className="error-boundary__button secondary"
                onClick={() => this.setState({ hasError: false })}
              >
                🔙 Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
