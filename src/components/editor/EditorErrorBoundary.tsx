import { Component } from "react"
import type { ReactNode, CSSProperties } from "react"

interface Props {
  children: ReactNode
  onReset: () => void
}

interface State {
  hasError: boolean
  message: string
}

export class EditorErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" }

  static getDerivedStateFromError(error: unknown): State {
    const message = error instanceof Error ? error.message : String(error)
    return { hasError: true, message }
  }

  handleReset = () => {
    this.props.onReset()
    this.setState({ hasError: false, message: "" })
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div style={overlayStyle}>
        <p style={titleStyle}>Something went wrong in the editor.</p>
        <p style={detailStyle}>{this.state.message}</p>
        <button onClick={this.handleReset} style={buttonStyle}>
          Reset editor
        </button>
      </div>
    )
  }
}

const overlayStyle: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  width: "100%",
  height: "100%",
  background: "var(--color-background)",
  color: "var(--color-foreground)",
}

const titleStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 500,
  margin: 0,
}

const detailStyle: CSSProperties = {
  fontSize: 12,
  color: "var(--color-muted-foreground)",
  margin: 0,
  maxWidth: 400,
  textAlign: "center",
}

const buttonStyle: CSSProperties = {
  marginTop: 4,
  padding: "8px 16px",
  borderRadius: 8,
  border: "1px solid var(--color-outline)",
  background: "var(--color-surface-container)",
  color: "var(--color-on-surface)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "inherit",
}
