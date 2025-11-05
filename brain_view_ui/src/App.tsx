import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom";
import { Login } from "./pages/Login/Login.tsx";
import Home from "./pages/Home/Home.tsx";
import Register from "./pages/Login/Register.tsx";
import { SnackbarProvider } from "notistack";
import { Scans } from "./pages/Home/Scans.tsx";
import Navigator from "./components/Navigator.tsx";
import { Box } from "@mui/material";
const isAuthenticated = false;

function Layout() {
  return (
    <Box sx={{ display: "flex" }}>
      <Navigator />
      <Box component="main" sx={{ flexGrow: 1 }}>
        <Outlet />
      </Box>
    </Box>
  );
}

function App() {
  return (
    <SnackbarProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<Layout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/home/scans" element={<Scans />} />
            <Route
              path="/"
              element={isAuthenticated ? <Home /> : <Navigate to="/login" />}
            />
          </Route>
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </SnackbarProvider>
  );
}

export default App;
