import React, { useState } from "react";
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Paper,
} from "@mui/material";
import axios from "axios";

const Register: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (!username || !password) {
      setErrorMsg("Wszystkie pola są wymagane.");
      return;
    }
    if (password !== repeatPassword) {
      setErrorMsg("Hasła muszą być takie same.");
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post("/users/register", { username, password });
      setSuccessMsg(res.data.message || "Rejestracja zakończona sukcesem.");
      setUsername("");
      setPassword("");
      setRepeatPassword("");
    } catch (err: any) {
      setErrorMsg(
        err.response?.data?.detail || "Wystąpił błąd podczas rejestracji."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="sm">
      <Paper elevation={3} sx={{ mt: 8, p: 4 }}>
        <Typography variant="h4" align="center" gutterBottom>
          Rejestracja
        </Typography>
        <Box component="form" onSubmit={handleSubmit} noValidate>
          <TextField
            label="Nazwa użytkownika"
            fullWidth
            margin="normal"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          <TextField
            label="Hasło"
            type="password"
            fullWidth
            margin="normal"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          <TextField
            label="Powtórz hasło"
            type="password"
            fullWidth
            margin="normal"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
          {errorMsg && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {errorMsg}
            </Alert>
          )}
          {successMsg && (
            <Alert severity="success" sx={{ mt: 2 }}>
              {successMsg}
            </Alert>
          )}
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 3 }}
            disabled={
              loading ||
              username.length < 6 ||
              password.length < 6 ||
              repeatPassword.length < 6
            }
          >
            {loading ? "Rejestruję..." : "Zarejestruj się"}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default Register;
