import React from "react";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Avatar,
  Box,
} from "@mui/material";
import FolderIcon from "@mui/icons-material/Folder";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import { useNavigate } from "react-router-dom";
import { logout } from "../services/api_user.ts";
export default function Navigator() {
  const drawerWidth = 240;
  const navigate = useNavigate();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: {
          width: drawerWidth,
          boxSizing: "border-box",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          py: 3,
        }}
      >
        <Avatar sx={{ width: 80, height: 80, mb: 2 }} />
      </Box>
      <Divider />
      <List>
        <ListItemButton onClick={() => navigate("/home/scans")}>
          <ListItemIcon>
            <FolderIcon />
          </ListItemIcon>
          <ListItemText primary="Moje skany" />
        </ListItemButton>
        <ListItemButton>
          <ListItemIcon>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary="Ustawienia" />
        </ListItemButton>
        <ListItemButton onClick={() => logout(navigate)}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Wyloguj" />
        </ListItemButton>
      </List>
    </Drawer>
  );
}
