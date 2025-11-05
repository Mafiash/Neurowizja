import { Box, Button, TextField, Typography, Paper } from "@mui/material";
import { useState } from "react";
import React from "react";
import { login } from "../../services/api_user.ts";
import { useNavigate } from "react-router-dom";

export const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    await login(username, password, navigate);
    setLoading(false);
  };

  return (
    <Box
      display="flex"
      justifyContent="center"
      alignItems="center"
      minHeight="100vh"
      bgcolor="#f5f5f5"
    >
      <Paper elevation={3} sx={{ p: 4, minWidth: 320 }}>
        <Typography variant="h5" mb={2} align="center">
          Logowanie
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            label="Login"
            fullWidth
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={loading}
          />
          <TextField
            label="Hasło"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
          >
            Zaloguj się
          </Button>
        </form>
        <Box display="flex" justifyContent="center" mt={2}>
          <Button variant="text" color="primary" href="/register">
            Nie masz konta? Zarejestruj się
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};
