import { Box, Typography, Button, Paper, Grid, Card, CardContent, CardHeader, Avatar } from "@mui/material";
import React from "react";
import AutoGraphIcon from "@mui/icons-material/AutoGraph";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import SearchIcon from "@mui/icons-material/Search";
import { useNavigate } from "react-router-dom";

export default function Home() {
  const navigate = useNavigate();

  const features = [
    {
      title: "Analiza i Adnotacje",
      desc: "Przeglądaj skany warstwa po warstwie i dodawaj precyzyjne adnotacje medyczne.",
      icon: <SearchIcon sx={{ fontSize: 40, color: "secondary.main" }} />,
      action: () => navigate("/home/scans"),
    },
  ];

  return (
    <Box p={4} className="fade-in">
      <Box mb={6}>
        <Typography
          variant="h3"
          sx={{ fontWeight: 800, mb: 2, background: "linear-gradient(135deg, #1e293b 0%, #334155 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
        >
          Witaj w Brain View
        </Typography>
        <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 700 }}>
          Zaawansowane narzędzie do wizualizacji i adnotacji obrazów MRI wspierane przez cloud computing.
        </Typography>
      </Box>

      <Grid container spacing={4}>
        {features.map((f, i) => (
          <Grid size={{ xs: 12, md: 4 }} key={i}>
            <Card
              sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                transition: "transform 0.2s",
                "&:hover": { transform: "translateY(-8px)" },
              }}
            >
              <CardContent sx={{ flexGrow: 1, p: 4 }}>
                <Box mb={3}>{f.icon}</Box>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
                  {f.title}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={4}>
                  {f.desc}
                </Typography>
                <Button variant="outlined" onClick={f.action}>
                  Rozpocznij
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
