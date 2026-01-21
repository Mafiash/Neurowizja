import React, { useState, useRef } from "react";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Box,
  Typography,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import DescriptionIcon from "@mui/icons-material/Description";
import { useNavigate } from "react-router-dom";
import { logout, uploadProfilePicture } from "../services/api_user.ts";

export default function Navigator() {
  const drawerWidth = 260;
  const navigate = useNavigate();
  const isAdmin = localStorage.getItem("is_admin") === "true";
  const [profilePic, setProfilePic] = useState(localStorage.getItem("profile_pic_url") || "");
  const [openSettings, setOpenSettings] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const newUrl = await uploadProfilePicture(file);
      if (newUrl) {
        setProfilePic(newUrl);
      }
    }
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: "border-box",
          bgcolor: "background.paper",
          borderRight: "1px solid #e2e8f0",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 4,
          px: 2,
          background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)",
        }}
      >
        <Box sx={{ position: "relative" }}>
          <Avatar
            src={profilePic}
            sx={{
              width: 90,
              height: 90,
              mb: 2,
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              border: "3px solid #fff",
            }}
          />
          <IconButton
            size="small"
            onClick={() => fileInputRef.current?.click()}
            sx={{
              position: "absolute",
              bottom: 12,
              right: 2,
              bgcolor: "primary.main",
              color: "white",
              "&:hover": { bgcolor: "primary.dark" },
              width: 28,
              height: 28,
            }}
          >
            <PhotoCameraIcon sx={{ fontSize: 16 }} />
          </IconButton>
          <input type="file" hidden ref={fileInputRef} onChange={handleFileChange} accept="image/*" />
        </Box>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: "text.primary" }}>
          {localStorage.getItem("token") ? "Użytkownik" : "Niezalogowany"}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {isAdmin ? "Administrator" : "Specjalista"}
        </Typography>
      </Box>

      <Divider sx={{ mx: 2 }} />

      <List sx={{ px: 1, mt: 2 }}>
        <ListItemButton onClick={() => navigate("/home/scans")} sx={{ borderRadius: 2, mb: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <FolderIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Moje skany" primaryTypographyProps={{ variant: "body2", fontWeight: 500 }} />
        </ListItemButton>

        <ListItemButton onClick={() => navigate("/home/annotations")} sx={{ borderRadius: 2, mb: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <DescriptionIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Wszystkie adnotacje" primaryTypographyProps={{ variant: "body2", fontWeight: 500 }} />
        </ListItemButton>

        {isAdmin && (
          <ListItemButton
            onClick={() => navigate("/admin")}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              color: "primary.main",
              bgcolor: "rgba(37, 99, 235, 0.04)",
              "&:hover": { bgcolor: "rgba(37, 99, 235, 0.08)" },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <AdminPanelSettingsIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText primary="Panel Administratora" primaryTypographyProps={{ variant: "body2", fontWeight: 600 }} />
          </ListItemButton>
        )}

        <ListItemButton onClick={() => setOpenSettings(true)} sx={{ borderRadius: 2, mb: 0.5 }}>
          <ListItemIcon sx={{ minWidth: 40 }}>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Ustawienia" primaryTypographyProps={{ variant: "body2", fontWeight: 500 }} />
        </ListItemButton>

        <Divider sx={{ my: 2, mx: 1 }} />

        <ListItemButton
          onClick={() => logout()}
          sx={{
            borderRadius: 2,
            color: "error.main",
            "&:hover": { bgcolor: "rgba(239, 68, 68, 0.04)" },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40 }}>
            <LogoutIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primary="Wyloguj" primaryTypographyProps={{ variant: "body2", fontWeight: 500 }} />
        </ListItemButton>
      </List>

      <Dialog open={openSettings} onClose={() => setOpenSettings(false)}>
        <DialogTitle>Ustawienia profilu</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Tutaj możesz zarządzać swoim profilem. Twoje zdjęcie jest przechowywane w bezpiecznej chmurze Azure.
          </Typography>
          <Button variant="outlined" startIcon={<PhotoCameraIcon />} onClick={() => fileInputRef.current?.click()} fullWidth>
            Zmień zdjęcie profilowe
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenSettings(false)}>Zamknij</Button>
        </DialogActions>
      </Dialog>
    </Drawer>
  );
}
