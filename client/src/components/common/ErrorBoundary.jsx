import React from 'react';

class ErrorBoundary extends React.Component {
      constructor(props) {
            super(props);
            this.state = { hasError: false, error: null, errorInfo: null };
      }

      static getDerivedStateFromError(error) {
            return { hasError: true };
      }

      componentDidCatch(error, errorInfo) {
            this.setState({
                  error: error,
                  errorInfo: errorInfo
            });
            console.error('ErrorBoundary caught an error:', error, errorInfo);
      }

      render() {
            if (this.state.hasError) {
                  return (
                        <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
                              <h3 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h3>
                              <p className="text-red-700 mb-4">
                                    There was an error rendering this component. Please try refreshing the page.
                              </p>
                              <details className="text-sm text-red-600">
                                    <summary className="cursor-pointer mb-2">Error details</summary>
                                    <pre className="bg-red-100 p-3 rounded overflow-auto">
                                          {this.state.error && this.state.error.toString()}
                                    </pre>
                              </details>
                        </div>
                  );
            }

            return this.props.children;
      }
}

export default ErrorBoundary;