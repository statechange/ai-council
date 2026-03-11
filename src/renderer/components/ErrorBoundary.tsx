import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "../ui/button";

interface Props {
  children: React.ReactNode;
  /** When provided, resets the boundary by navigating instead of reloading */
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Something went wrong</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            {this.state.error.message}
          </p>
        </div>
        <details className="text-xs text-muted-foreground/60 font-mono max-w-lg max-h-40 overflow-auto text-left">
          <summary className="cursor-pointer hover:text-muted-foreground">
            Stack trace
          </summary>
          <pre className="mt-2 whitespace-pre-wrap">{this.state.error.stack}</pre>
        </details>
        <Button variant="outline" size="sm" onClick={this.handleReset} className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    );
  }
}
