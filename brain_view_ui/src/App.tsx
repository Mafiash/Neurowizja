import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { ThemeProvider, createTheme, CssBaseline, Box } from "@mui/material";
import { SnackbarProvider } from "notistack";
import { Login } from "./pages/Login/Login.tsx";
import Home from "./pages/Home/Home.tsx";
import { Scans } from "./pages/Home/Scans.tsx";
import { Annotations } from "./pages/Home/Annotations.tsx";
import AdminPanel from "./pages/Admin/AdminPanel.tsx";
import Navigator from "./components/Navigator.tsx";
import ProtectedRoute from "./components/ProtectedRoute.tsx";

// Create a premium, modern theme
const theme = createTheme({
  palette: {
    primary: {
      main: "#2563eb",
      light: "#60a5fa",
      dark: "#1d4ed8",
    },
    secondary: {
      main: "#6366f1",
      light: "#818cf8",
      dark: "#4f46e5",
    },
    background: {
      default: "#f8fafc",
      paper: "#ffffff",
    },
    text: {
      primary: "#1e293b",
      secondary: "#64748b",
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: "-0.02em",
    },
    button: {
      textTransform: "none",
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: "none",
          "&:hover": {
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)",
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          border: "1px solid #e2e8f0",
          boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
        },
      },
    },
  },
});

function Layout() {
  return (
    <Box sx={{ display: "flex", minHeight: "100vh" }}>
      <Navigator />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 0,
          display: "flex",
          flexDirection: "column",
          width: "100%",
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider autoHideDuration={3000}>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/home" element={<Home />} />
              <Route path="/home/scans" element={<Scans />} />
              <Route path="/home/annotations" element={<Annotations />} />
              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly>
                    <AdminPanel />
                  </ProtectedRoute>
                }
              />
            </Route>

            <Route path="/" element={<Navigate to="/home" />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </Router>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
