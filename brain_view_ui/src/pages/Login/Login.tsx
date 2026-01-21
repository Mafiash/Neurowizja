import { Box, Button, TextField, Typography, Paper, InputAdornment, CircularProgress } from "@mui/material";
import { useState } from "react";
import React from "react";
import { login } from "../../services/api_user.ts";
import PersonIcon from "@mui/icons-material/Person";
import LockIcon from "@mui/icons-material/Lock";
import InsightsIcon from "@mui/icons-material/Insights";

export const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await login(username, password);
    setLoading(false);
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "radial-gradient(circle at top left, #2563eb 0%, #1e293b 40%, #0f172a 100%)",
        p: 3,
      }}
    >
      <Box className="fade-in" sx={{ width: "100%", maxWidth: 450 }}>
        <Box sx={{ textAlign: "center", mb: 4 }}>
          <InsightsIcon sx={{ fontSize: 60, color: "#60a5fa", mb: 2 }} />
          <Typography variant="h4" sx={{ color: "white", fontWeight: 800, letterSpacing: "-0.02em" }}>
            Brain View
          </Typography>
          <Typography variant="body1" sx={{ color: "rgba(255,255,255,0.6)" }}>
            System Analizy Obrazów MRI
          </Typography>
        </Box>

        <Paper
          className="glass"
          sx={{
            p: 4,
            borderRadius: 4,
            bgcolor: "rgba(255, 255, 255, 0.05)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <Typography variant="h6" sx={{ color: "white", mb: 3, fontWeight: 600 }}>
            Zaloguj się
          </Typography>

          <form onSubmit={handleSubmit}>
            <TextField
              placeholder="Nazwa użytkownika"
              fullWidth
              margin="normal"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              disabled={loading}
              variant="outlined"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonIcon sx={{ color: "rgba(255,255,255,0.4)" }} />
                  </InputAdornment>
                ),
                sx: {
                  color: "white",
                  bgcolor: "rgba(255,255,255,0.05)",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.1) !important" },
                  "&:hover fieldset": { borderColor: "rgba(255,255,255,0.2) !important" },
                },
              }}
            />
            <TextField
              placeholder="Hasło"
              type="password"
              fullWidth
              margin="normal"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockIcon sx={{ color: "rgba(255,255,255,0.4)" }} />
                  </InputAdornment>
                ),
                sx: {
                  color: "white",
                  bgcolor: "rgba(255,255,255,0.05)",
                  "& fieldset": { borderColor: "rgba(255,255,255,0.1) !important" },
                  "&:hover fieldset": { borderColor: "rgba(255,255,255,0.2) !important" },
                },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              fullWidth
              sx={{
                mt: 4,
                py: 1.5,
                fontWeight: 700,
                fontSize: "1rem",
                background: "linear-gradient(90deg, #2563eb 0%, #6366f1 100%)",
                boxShadow: "0 4px 15px rgba(37, 99, 235, 0.3)",
                "&:hover": {
                  background: "linear-gradient(90deg, #1d4ed8 0%, #4f46e5 100%)",
                },
              }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : "Wejdź do systemu"}
            </Button>
          </form>
        </Paper>
      </Box>
    </Box>
  );
};
