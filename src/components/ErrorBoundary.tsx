import { Component, type ReactNode } from "react";
import { Box, Button, Typography } from "@mui/material";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error("Uncaught error:", error);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            backgroundColor: "#f5f5f5",
            padding: 4,
          }}
        >
          <Typography variant="h4" gutterBottom>
            Something went wrong
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            An unexpected error occurred. Please reload the page.
          </Typography>
          {import.meta.env.DEV && this.state.error && (
            <Box
              component="pre"
              sx={{
                mb: 3,
                p: 2,
                backgroundColor: "#fff",
                borderRadius: 1,
                fontSize: "0.8rem",
                maxWidth: 600,
                overflow: "auto",
                border: "1px solid #ddd",
              }}
            >
              {this.state.error.message}
            </Box>
          )}
          <Button variant="contained" onClick={this.handleReset}>
            Reload
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}
