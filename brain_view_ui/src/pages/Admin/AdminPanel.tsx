import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  IconButton,
  Tooltip,
  Avatar,
  Chip,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import VpnKeyIcon from "@mui/icons-material/VpnKey";
import ShieldIcon from "@mui/icons-material/Shield";
import PersonAddIcon from "@mui/icons-material/PersonAdd";
import { listUsers, createUser, promoteUser, deleteUser, resetUserPassword } from "../../services/api_user.ts";

interface User {
  id: number;
  email: string;
  is_admin: boolean;
  role: string | null;
  profile_pic_url?: string;
}

const AdminPanel = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [openResetDialog, setOpenResetDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  const refreshUsers = async () => {
    setLoading(true);
    const data = await listUsers();
    setUsers(data);
    setLoading(false);
  };

  useEffect(() => {
    refreshUsers();
  }, []);

  const handleAddUser = async () => {
    const success = await createUser(newUsername, newPassword);
    if (success) {
      setOpenAddDialog(false);
      setNewUsername("");
      setNewPassword("");
      refreshUsers();
    }
  };

  const handlePromote = async (userId: number) => {
    const success = await promoteUser(userId);
    if (success) {
      refreshUsers();
    }
  };

  const handleDelete = async (userId: number) => {
    if (window.confirm("Czy na pewno chcesz usunąć tego użytkownika?")) {
      const success = await deleteUser(userId);
      if (success) {
        refreshUsers();
      }
    }
  };

  const handleResetPasswordSubmit = async () => {
    if (selectedUser) {
      const success = await resetUserPassword(selectedUser.id, resetPassword);
      if (success) {
        setOpenResetDialog(false);
        setResetPassword("");
        setSelectedUser(null);
      }
    }
  };

  if (loading && users.length === 0) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box p={4} className="fade-in">
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
        <Box>
          <Typography variant="h4" gutterBottom sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <ShieldIcon color="primary" fontSize="large" />
            Zarządzanie Systemem
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Administracja kontami użytkowników i uprawnieniami w chmurze Azure SQL.
          </Typography>
        </Box>
        <Button variant="contained" color="primary" startIcon={<PersonAddIcon />} onClick={() => setOpenAddDialog(true)} sx={{ borderRadius: 2, px: 3 }}>
          Nowy Użytkownik
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: 3, overflow: "hidden" }}>
        <Table>
          <TableHead sx={{ bgcolor: "#f8fafc" }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 600 }}>Użytkownik</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Uprawnienia</TableCell>
              <TableCell sx={{ fontWeight: 600 }} align="right">
                Akcje
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id} hover sx={{ "&:last-child td, &:last-child th": { border: 0 } }}>
                <TableCell>
                  <Box display="flex" alignItems="center" gap={2}>
                    <Avatar
                      src={user.profile_pic_url}
                      sx={{
                        width: 40,
                        height: 40,
                        bgcolor: user.is_admin ? "primary.light" : "grey.300",
                        fontSize: "0.9rem",
                      }}
                    >
                      {user.email.substring(0, 2).toUpperCase()}
                    </Avatar>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {user.email}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ID: {user.id} • {user.role || "Specjalista"}
                      </Typography>
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>
                  {user.is_admin ? (
                    <Chip label="Administrator" size="small" color="primary" variant="soft" sx={{ fontWeight: 600, bgcolor: "rgba(37, 99, 235, 0.1)", color: "primary.main" }} />
                  ) : (
                    <Chip label="Użytkownik" size="small" variant="outlined" sx={{ color: "text.secondary" }} />
                  )}
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
                    {!user.is_admin && (
                      <Tooltip title="Nadaj uprawnienia administratora">
                        <IconButton size="small" color="primary" onClick={() => handlePromote(user.id)}>
                          <ShieldIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Zresetuj hasło">
                      <IconButton
                        size="small"
                        onClick={() => {
                          setSelectedUser(user);
                          setOpenResetDialog(true);
                        }}
                      >
                        <VpnKeyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Usuń konto">
                      <IconButton size="small" color="error" onClick={() => handleDelete(user.id)}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog dodawania */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Dodaj nowego użytkownika</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Wprowadź dane dostępowe dla nowego pracownika.
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Email / Login"
            fullWidth
            variant="outlined"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField margin="dense" label="Hasło" type="password" fullWidth variant="outlined" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setOpenAddDialog(false)} color="inherit">
            Anuluj
          </Button>
          <Button onClick={handleAddUser} color="primary" variant="contained" sx={{ px: 4 }}>
            Stwórz
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog resetu hasła */}
      <Dialog open={openResetDialog} onClose={() => setOpenResetDialog(false)} PaperProps={{ sx: { borderRadius: 3, p: 1 } }}>
        <DialogTitle sx={{ fontWeight: 700 }}>Zmień hasło</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Ustawiasz nowe hasło dla: <strong>{selectedUser?.email}</strong>
          </Typography>
          <TextField
            autoFocus
            margin="dense"
            label="Nowe hasło"
            type="password"
            fullWidth
            variant="outlined"
            value={resetPassword}
            onChange={(e) => setResetPassword(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setOpenResetDialog(false)} color="inherit">
            Anuluj
          </Button>
          <Button onClick={handleResetPasswordSubmit} color="primary" variant="contained" sx={{ px: 4 }}>
            Zapisz
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminPanel;
