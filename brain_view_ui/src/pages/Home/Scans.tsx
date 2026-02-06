import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Button,
  Box,
  Typography,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Paper,
  IconButton,
  Tooltip,
  Slider,
  Collapse,
} from "@mui/material";

import UploadIcon from "@mui/icons-material/CloudUpload";
import RefreshIcon from "@mui/icons-material/Refresh";
import ContrastIcon from "@mui/icons-material/Contrast";
import PanIcon from "@mui/icons-material/OpenWith";
import ZoomIcon from "@mui/icons-material/ZoomIn";
import DrawIcon from "@mui/icons-material/Create";
import HistoryIcon from "@mui/icons-material/History";
import CloseIcon from "@mui/icons-material/Close";
import CircleIcon from "@mui/icons-material/RadioButtonUnchecked";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import EraserIcon from "@mui/icons-material/CleaningServices";
import UndoIcon from "@mui/icons-material/Undo";
import DescriptionIcon from "@mui/icons-material/Description";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import { uploadScan, getUserScans, getScanUrl, saveAnnotation, getScanAnnotations, deleteAnnotation, generateOutline, addComment } from "../../services/api_files.ts";
import type { ScanMetadataDTO, AnnotationDTO } from "../../services/api_files.ts";
import NiiVue, { NiiVueHandle } from "../../components/NiiVue.tsx"; // Import Interface
import React from "react";
export const Scans: React.FC = () => {
  const [scans, setScans] = useState<ScanMetadataDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedScanUrl, setSelectedScanUrl] = useState<string | null>(null);
  const [selectedScanId, setSelectedScanId] = useState<number | null>(null);

  // Visualization params
  const [viewMode, setViewMode] = useState<"2d" | "3d" | "multi">("multi");
  const [slicePlane, setSlicePlane] = useState<"axial" | "coronal" | "sagittal">("axial");
  const [dragMode, setDragMode] = useState<number>(1);
  const [colormap, setColormap] = useState<string>("gray");

  // Drawing params
  const [penColor, setPenColor] = useState<string>("#22c55e");
  const [penWidth, setPenWidth] = useState<number>(2);

  // Notes & History
  const [note, setNote] = useState("");
  const [capturedStrokes, setCapturedStrokes] = useState<number[][][]>([]);
  const [capturedSlice, setCapturedSlice] = useState<number>(0);
  const [annotations, setAnnotations] = useState<AnnotationDTO[]>([]);

  // Layout
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showAnnotations, setShowAnnotations] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const niiVueRef = useRef<NiiVueHandle>(null);

  const fetchScans = async () => {
    setLoading(true);
    try {
      const data = await getUserScans();
      setScans(data.scans);
    } catch (err) {
      console.error("Failed to fetch scans:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScans();
  }, []);

  // Handle URL Params for deep linking
  useEffect(() => {
    const scanId = searchParams.get("scan_id");
    const plane = searchParams.get("plane") as "axial" | "coronal" | "sagittal";

    if (scanId) {
      handleSelectScan(parseInt(scanId));
    }
    if (plane) {
      setSlicePlane(plane);
      setViewMode("2d");
    }
  }, [searchParams]);

  const handleUpload = async (file: File) => {
    setLoading(true);
    try {
      await uploadScan(file);
      await fetchScans();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectScan = async (scanId: number) => {
    setLoading(true);
    setPreviewImage(null); // Reset preview
    try {
      const { sas_url } = await getScanUrl(scanId);
      setSelectedScanUrl(sas_url);
      setSelectedScanId(scanId);
      const anns = await getScanAnnotations(scanId);
      setAnnotations(anns);
    } catch (err) {
      console.error("Failed to select scan:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAnnotation = async () => {
    if (!selectedScanId) return;
    try {
      // 1. Capture screenshot
      const screenshotElem = await niiVueRef.current?.getScreenshot();

      const newAnn = await saveAnnotation(
        {
          scan_id: selectedScanId,
          slice: capturedSlice,
          plane: slicePlane,
          points: capturedStrokes.length > 0 ? capturedStrokes.flat() : [],
          note: note,
        },
        screenshotElem,
      ); // Pass screenshot blob

      setCapturedStrokes([]);
      setCapturedSlice(0);

      setNote("");
      // Add new annotation to the top of the list
      setAnnotations((prev) => [newAnn, ...prev]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateAnnotation = (index: number, points: number[][]) => {
    setCapturedStrokes((prev) => {
      const next = [...prev];
      next[index] = points;
      return next;
    });
  };

  const handleDeleteCapturedStroke = (index: number) => {
    setCapturedStrokes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUndo = () => {
    setCapturedStrokes((prev) => {
      if (prev.length === 0) return prev;
      return prev.slice(0, -1);
    });
  };

  // Obsługa Ctrl + Z
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleDeleteAnnotation = async (annId: number) => {
    if (!window.confirm("Czy na pewno chcesz usunąć tę adnotację?")) return;
    try {
      await deleteAnnotation(annId);
      // Remove from local state immediately
      setAnnotations((prev) => prev.filter((a) => a.id !== annId));
    } catch (err) {
      console.error("Failed to delete annotation:", err);
    }
  };

  const handleGenerateOutline = async () => {
    if (!selectedScanId) return;
    setLoading(true);
    try {
      const newAnn = await generateOutline(selectedScanId, 0, slicePlane);
      // Add to local state immediately at the top
      setAnnotations((prev) => [newAnn, ...prev]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", bgcolor: "background.default" }} className="fade-in">
      {/* Action Bar */}
      <Box sx={{ p: 1.5, display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #e2e8f0", bgcolor: "#fff", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2, minWidth: "fit-content" }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "primary.main", lineHeight: 1 }}>
              BRAIN VIEW
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              STACJA DIAGNOSTYCZNA
            </Typography>
          </Box>
        </Box>

        {/* TOP TOOLBAR - Relocated from left sidebar */}
        {selectedScanUrl && !previewImage && (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              bgcolor: "rgba(241, 245, 249, 0.8)",
              p: 0.5,
              px: 1.5,
              borderRadius: 3,
              border: "1px solid #e2e8f0",
            }}
          >
            {/* View Modes */}
            <ToggleButtonGroup value={viewMode} exclusive onChange={(_, v) => v && setViewMode(v)} size="small" color="primary">
              <ToggleButton value="2d" title="Widok 2D">
                2D
              </ToggleButton>
              <ToggleButton value="3d" title="Widok 3D">
                3D
              </ToggleButton>
              <ToggleButton value="multi" title="Multi">
                MLT
              </ToggleButton>
            </ToggleButtonGroup>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            {/* Navigation & Tools */}
            <ToggleButtonGroup value={dragMode} exclusive onChange={(_, v) => v !== null && setDragMode(v)} size="small" color="primary">
              <Tooltip title="Kontrast">
                <ToggleButton value={1}>
                  <ContrastIcon fontSize="small" />
                </ToggleButton>
              </Tooltip>
              <Tooltip title="Przesuń">
                <ToggleButton value={2}>
                  <PanIcon fontSize="small" />
                </ToggleButton>
              </Tooltip>
              <Tooltip title="Zoom">
                <ToggleButton value={3}>
                  <ZoomIcon fontSize="small" />
                </ToggleButton>
              </Tooltip>
              <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
              <Tooltip title="Pędzel">
                <ToggleButton value={4}>
                  <DrawIcon fontSize="small" />
                </ToggleButton>
              </Tooltip>
              <Tooltip title="Okrąg">
                <ToggleButton value={5}>
                  <CircleIcon fontSize="small" />
                </ToggleButton>
              </Tooltip>
              <Tooltip title="Przesuń obiekt">
                <ToggleButton value={6}>
                  <DragIndicatorIcon fontSize="small" />
                </ToggleButton>
              </Tooltip>
              <Tooltip title="Gumka">
                <ToggleButton value={7}>
                  <EraserIcon fontSize="small" />
                </ToggleButton>
              </Tooltip>
            </ToggleButtonGroup>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            <Box sx={{ display: "flex", gap: 0.5 }}>
              <Tooltip title="Cofnij (Ctrl+Z)">
                <IconButton onClick={handleUndo} size="small" disabled={capturedStrokes.length === 0}>
                  <UndoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Resetuj">
                <IconButton onClick={() => setCapturedStrokes([])} size="small" disabled={capturedStrokes.length === 0} color="error">
                  <HistoryIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

            {/* Colormap */}
            <Select value={colormap} onChange={(e) => setColormap(e.target.value)} variant="standard" disableUnderline sx={{ width: 50 }}>
              {[
                { value: "gray", label: "Szary", colors: ["#000", "#fff"] },
                { value: "iron", label: "Iron", colors: ["#000", "#f00", "#ff0", "#fff"] },
                { value: "hot", label: "Hot", colors: ["#000", "#f00", "#ff0"] },
                { value: "jet", label: "Jet", colors: ["#00f", "#0ff", "#ff0", "#f00"] },
              ].map((cmap) => (
                <MenuItem key={cmap.value} value={cmap.value} title={cmap.label} sx={{ px: 1, py: 1 }}>
                  <Box
                    sx={{
                      width: 24,
                      height: 10,
                      borderRadius: 0.5,
                      background: `linear-gradient(to right, ${cmap.colors.join(", ")})`,
                      border: "1px solid #ccc",
                      display: "inline-block",
                    }}
                  />
                </MenuItem>
              ))}
            </Select>
            {/* Brush Settings Inline */}
            {(dragMode === 4 || dragMode === 5 || dragMode === 7) && (
              <>
                <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                  <Box sx={{ width: 40, height: 20, borderRadius: 0.5, bgcolor: penColor, border: "2px solid #ccc", cursor: "pointer", position: "relative" }}>
                    <input
                      type="color"
                      value={penColor}
                      onChange={(e) => setPenColor(e.target.value)}
                      style={{ opacity: 0, position: "absolute", inset: 0, width: "100%", height: "100%", cursor: "pointer" }}
                    />
                  </Box>
                  <Box sx={{ width: 60, display: "flex", alignItems: "center", gap: 1.5 }}>
                    <Slider size="small" min={1} max={15} value={penWidth} onChange={(_, v) => setPenWidth(v as number)} valueLabelDisplay="auto" sx={{ color: "black" }} />
                  </Box>
                </Box>
              </>
            )}
          </Box>
        )}

        <Box sx={{ display: "flex", gap: 1, ml: "auto" }}>
          <Tooltip title="Odśwież listę">
            <IconButton onClick={fetchScans} disabled={loading} size="small">
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Workspace */}
      <Box sx={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Sidebar: Scans */}
        <Box sx={{ width: 280, bgcolor: "#fff", borderRight: "1px solid #e2e8f0", overflowY: "auto" }}>
          <Typography variant="overline" sx={{ px: 2, pt: 2, display: "block", color: "text.secondary", fontWeight: 700 }}>
            Twoje Badania
          </Typography>
          <List sx={{ px: 1 }}>
            {scans.map((scan) => (
              <ListItemButton
                key={scan.scan_id}
                selected={selectedScanId === scan.scan_id}
                onClick={() => handleSelectScan(scan.scan_id)}
                sx={{ borderRadius: 2, mb: 0.5, "&.Mui-selected": { bgcolor: "rgba(37, 99, 235, 0.08)", color: "primary.main" } }}
              >
                <ListItemText primary={scan.filename} secondary={scan.shape?.join("x")} primaryTypographyProps={{ variant: "body2", fontWeight: 600, noWrap: true }} />
              </ListItemButton>
            ))}
          </List>
          <Box sx={{ p: 2, pt: 1 }}>
            <Button
              variant="outlined"
              fullWidth
              component="label"
              startIcon={<UploadIcon />}
              disabled={loading}
              size="small"
              sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600, borderStyle: "dashed" }}
            >
              Prześlij NIfTI
              <input type="file" hidden accept=".nii,.gz" onChange={(e) => e.target.files && handleUpload(e.target.files[0])} />
            </Button>
          </Box>
        </Box>

        {/* Viewer Area */}
        <Box sx={{ flex: 1, display: "flex", m: 1.5, gap: 1.5, position: "relative" }}>
          <Box
            sx={{
              flex: 1,
              position: "relative",
              bgcolor: "#111",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 3,
              overflow: "hidden",
              boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
            }}
          >
            {previewImage ? (
              <Box sx={{ position: "relative", width: "100%", height: "100%", bgcolor: "black" }}>
                <img src={previewImage} alt="Snapshot Preview" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                <Button
                  variant="contained"
                  startIcon={<CloseIcon />}
                  onClick={() => setPreviewImage(null)}
                  sx={{ position: "absolute", top: 16, right: 16, bgcolor: "rgba(255,255,255,0.9)", color: "black", "&:hover": { bgcolor: "white" } }}
                >
                  Zamknij Podgląd
                </Button>
              </Box>
            ) : selectedScanUrl ? (
              <NiiVue
                ref={niiVueRef}
                imageUrl={selectedScanUrl}
                viewMode={viewMode}
                slicePlane={slicePlane}
                dragMode={dragMode}
                colormap={colormap}
                annotations={annotations}
                showAnnotations={showAnnotations}
                penColor={penColor}
                penWidth={penWidth}
                pendingStrokes={capturedStrokes}
                onAnnotationCreated={(pts, sliceIdx) => {
                  setCapturedStrokes((prev) => [...prev, pts]);
                  setCapturedSlice(sliceIdx);
                }}
                onUpdateAnnotation={handleUpdateAnnotation}
                onDeleteAnnotation={handleDeleteCapturedStroke}
              />
            ) : (
              <Typography color="#555">Wybierz skan z listy po lewej</Typography>
            )}
          </Box>
        </Box>

        {/* Sidebar Toggle Button */}
        <IconButton
          onClick={() => setSidebarOpen(!sidebarOpen)}
          sx={{
            position: "absolute",
            right: sidebarOpen ? 300 : 0,
            top: "50%",
            transform: "translateY(-50%)",
            bgcolor: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "50% 0 0 50%",
            boxShadow: "-4px 0 10px rgba(0,0,0,0.1)",
            zIndex: 100,
            width: 32,
            height: 48,
            "&:hover": { bgcolor: "#f8fafc" },
            transition: "right 0.3s ease",
          }}
        >
          {sidebarOpen ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>

        {/* Sidebar: Analysis */}
        <Collapse orientation="horizontal" in={sidebarOpen}>
          <Box sx={{ width: 300, height: "100%", bgcolor: "#fff", borderLeft: "1px solid #e2e8f0", p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Analiza
            </Typography>
            <TextField label="Notatka medyczna" multiline rows={4} fullWidth value={note} onChange={(e) => setNote(e.target.value)} />

            <Button variant="contained" fullWidth onClick={handleSaveAnnotation} disabled={!selectedScanId} sx={{ py: 1.5 }}>
              Zapisz Analizę
            </Button>

            <Button variant="outlined" fullWidth onClick={handleGenerateOutline} disabled={!selectedScanId} sx={{ py: 1, borderColor: "secondary.main", color: "secondary.main" }}>
              Generuj Obrys
            </Button>

            <Button variant={showAnnotations ? "contained" : "outlined"} color="info" fullWidth onClick={() => setShowAnnotations(!showAnnotations)} sx={{ py: 1 }}>
              {showAnnotations ? "Ukryj Adnotacje" : "Pokaż Adnotacje"}
            </Button>

            <Divider />

            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <DescriptionIcon fontSize="small" color="action" />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Adnotacje
              </Typography>
            </Box>

            <Box sx={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 1.5 }}>
              {annotations.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ p: 2, textAlign: "center" }}>
                  Brak zapisanych analiz
                </Typography>
              ) : (
                annotations.map((ann) => (
                  <Paper
                    key={ann.id}
                    variant="outlined"
                    onClick={() => ann.snapshot_url && setPreviewImage(ann.snapshot_url)} // Click to preview
                    sx={{
                      p: 1.5,
                      position: "relative",
                      borderLeft: "4px solid",
                      borderLeftColor: ann.points && ann.points.length > 0 ? "secondary.main" : "primary.main",
                      transition: "all 0.2s",
                      cursor: ann.snapshot_url ? "pointer" : "default", // Pointer if clickable
                      "&:hover": { borderColor: "primary.main", transform: "translateY(-2px)", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
                    }}
                  >
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", mb: 0.5 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "text.primary" }}>
                        {ann.author_name || "Anonim"}
                      </Typography>
                      {ann.points && ann.points.length > 0 && (
                        <Tooltip title="Zawiera obrys graficzny">
                          <DrawIcon sx={{ fontSize: 16, color: "secondary.main" }} />
                        </Tooltip>
                      )}
                    </Box>

                    {ann.note_text && (
                      <Typography variant="body2" sx={{ mb: 1, color: "text.secondary", lineBreak: "anywhere" }}>
                        {ann.note_text}
                      </Typography>
                    )}

                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <Typography variant="caption" color="text.disabled">
                        {new Date(ann.created_at).toLocaleString()}
                      </Typography>
                      <Button
                        size="small"
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent preview click
                          handleDeleteAnnotation(ann.id);
                        }}
                        sx={{ minWidth: 0, p: 0.5 }}
                      >
                        Usuń
                      </Button>
                    </Box>

                    {/* Sekcja komentarzy */}
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, mb: 1, display: "block" }}>
                        Komentarze ({ann.comments?.length || 0})
                      </Typography>
                      <List sx={{ p: 0 }}>
                        {ann.comments?.map((comment) => (
                          <Box key={comment.id} sx={{ mb: 1, bgcolor: "#f8fafc", p: 1, borderRadius: 1 }}>
                            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
                              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                                {comment.author_name}
                              </Typography>
                              <Typography variant="caption" color="text.disabled" sx={{ fontSize: "10px" }}>
                                {new Date(comment.created_at).toLocaleString()}
                              </Typography>
                            </Box>
                            <Typography variant="body2" sx={{ fontSize: "12px" }}>
                              {comment.text}
                            </Typography>
                          </Box>
                        ))}
                      </List>
                      <Box sx={{ display: "flex", gap: 1, mt: 1 }} onClick={(e) => e.stopPropagation()}>
                        <TextField
                          size="small"
                          placeholder="Dodaj komentarz..."
                          fullWidth
                          sx={{ "& .MuiInputBase-input": { fontSize: "12px", py: 0.5 } }}
                          onKeyDown={async (e) => {
                            if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                              const text = (e.target as HTMLInputElement).value;
                              (e.target as HTMLInputElement).value = "";
                              try {
                                const newComment = await addComment(ann.id, text);
                                setAnnotations((prev) => prev.map((a) => (a.id === ann.id ? { ...a, comments: [...(a.comments || []), newComment] } : a)));
                              } catch (err) {
                                console.error("Failed to add comment:", err);
                              }
                            }
                          }}
                        />
                      </Box>
                    </Box>
                  </Paper>
                ))
              )}
            </Box>
          </Box>
        </Collapse>
      </Box>

      {loading && (
        <Box
          sx={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: "rgba(255,255,255,0.7)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <CircularProgress />
        </Box>
      )}
    </Box>
  );
};

export default Scans;
