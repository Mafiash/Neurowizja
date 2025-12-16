import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableContainer,
  Paper,
  Button,
  Box,
  Typography,
  Stack,
  CircularProgress,
} from "@mui/material";
import {
  uploadScan,
  ScanMetadataDTO,
  getUserScans,
  getScanUrl,
} from "../../services/api_files.ts";
import NiiVue from "../../components/NiiVue.tsx";

export const Scans: React.FC = () => {
  const [scans, setScans] = useState<ScanMetadataDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedScanUrl, setSelectedScanUrl] = useState<string | null>(null);
  const [selectedScanId, setSelectedScanId] = useState<number | null>(null);

  const fetchScans = async () => {
    try {
      setLoading(true);
      const res = await getUserScans();
      setScans(res.scans);
      // usunięte automatyczne wybieranie pierwszego skanu
      // if (!selectedScanId && res.scans.length > 0) {
      //   const first = res.scans[0];
      //   await handleSelectScan(first.scan_id);
      // }
    } catch (err) {
      console.error("Failed to fetch scans:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScans();
  }, []);

  const handleUpload = async (file: File) => {
    try {
      setLoading(true);
      await uploadScan(file, "FLAIR");
      await fetchScans();
    } catch (error) {
      console.error("Upload failed:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectScan = async (scanId: number) => {
    try {
      setLoading(true);
      setSelectedScanId(scanId);
      const res = await getScanUrl(scanId);
      if (!res.sas_url || typeof res.sas_url !== "string") {
        console.error("Invalid sas_url in response", res);
        return;
      }
      setSelectedScanUrl(res.sas_url);
    } catch (err) {
      console.error("Failed to get scan URL:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Górny pasek akcji */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
        spacing={2}
      >
        <Typography variant="h4" component="h1">
          Moje skany NIfTI
        </Typography>

        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            component="label"
            color="primary"
            disabled={loading}
          >
            Dodaj skan
            <input
              type="file"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (file) {
                  await handleUpload(file);
                  e.target.value = "";
                }
              }}
            />
          </Button>

          <Button
            variant="outlined"
            color="primary"
            disabled={loading}
            onClick={fetchScans}
          >
            Odśwież
          </Button>
        </Stack>
      </Stack>

      {/* Sekcja podglądu skanu */}
      <Paper
        elevation={3}
        sx={{
          p: 2,
          mb: 3,
          minHeight: 400,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Typography variant="h6" mb={2}>
          Podgląd skanu
        </Typography>

        {loading && !selectedScanUrl && (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CircularProgress />
          </Box>
        )}

        {!loading && !selectedScanUrl && (
          <Box
            sx={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "text.secondary",
              textAlign: "center",
            }}
          >
            <Typography variant="body1">
              Nie wybrano jeszcze skanu.
              <br />
              Wybierz skan z tabeli poniżej lub dodaj nowy plik.
            </Typography>
          </Box>
        )}

        {selectedScanUrl && (
          <Box sx={{ flex: 1, minHeight: 350 }}>
            <NiiVue imageUrl={selectedScanUrl} />
          </Box>
        )}
      </Paper>

      {/* Tabela pod podglądem */}
      <Paper elevation={2}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>ID</TableCell>
                <TableCell>Nazwa pliku</TableCell>
                <TableCell>Modalność</TableCell>
                <TableCell>Wymiary</TableCell>
                <TableCell>Rozdzielczość wokseli</TableCell>
                <TableCell>Orientacja</TableCell>
                <TableCell align="right">Akcje</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {scans.map((scan) => {
                const isSelected = scan.scan_id === selectedScanId;
                return (
                  <TableRow
                    key={scan.scan_id}
                    hover
                    selected={isSelected}
                    sx={{
                      cursor: "pointer",
                    }}
                    onClick={() => handleSelectScan(scan.scan_id)}
                  >
                    <TableCell>{scan.scan_id}</TableCell>
                    <TableCell>{scan.filename}</TableCell>
                    <TableCell>{scan.modality}</TableCell>
                    <TableCell>
                      {scan.shape && scan.shape.length > 0
                        ? scan.shape.join(" × ")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {scan.voxel_spacing && scan.voxel_spacing.length > 0
                        ? scan.voxel_spacing.join(" × ")
                        : "-"}
                    </TableCell>
                    <TableCell>{scan.orientation}</TableCell>
                    <TableCell align="right">
                      <Button
                        size="small"
                        variant={isSelected ? "contained" : "outlined"}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSelectScan(scan.scan_id);
                        }}
                      >
                        Podgląd
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {scans.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    Brak przesłanych skanów.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default Scans;
