import { Component, type ErrorInfo, type ReactNode } from 'react'

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() { return { hasError: true } }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('TeachersLog rendering error', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="fatal-error">
          <h1>TeachersLog</h1>
          <h2>画面を表示できませんでした</h2>
          <p>保存されたデータはそのままです。ページを再読み込みしてください。</p>
          <button onClick={() => window.location.reload()} type="button">再読み込み</button>
        </main>
      )
    }
    return this.props.children
  }
}
