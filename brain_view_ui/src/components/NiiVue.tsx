import React, { useRef, useEffect, useState } from "react";
import { Niivue, SLICE_TYPE } from "@niivue/niivue";
import { Box, Typography } from "@mui/material";

interface NiiVueProps {
  imageUrl: string;
  viewMode?: "2d" | "3d" | "multi";
  slicePlane?: "axial" | "coronal" | "sagittal";
  dragMode?: number; // Niivue drag modes + 4: Pen, 5: Circle, 6: Move
  colormap?: string;
  brightness?: number;
  contrast?: number;
  annotations?: any[]; // AnnotationDTO[]
  onAnnotationCreated?: (points: number[][], sliceIndex: number) => void;
  onUpdateAnnotation?: (index: number, points: number[][]) => void;
  onDeleteAnnotation?: (index: number) => void;
  penColor?: string;
  penWidth?: number;
  showAnnotations?: boolean;
  pendingStrokes?: number[][][]; // Now in VOXEL indices
  pendingSlice?: number;
  pendingPlane?: string;
}

export interface NiiVueHandle {
  getScreenshot: () => Promise<Blob | null>;
}

export const NiiVue = React.forwardRef<NiiVueHandle, NiiVueProps>(
  (
    {
      imageUrl,
      viewMode = "multi",
      slicePlane = "axial",
      dragMode = 1,
      colormap = "gray",
      brightness = 1.0,
      contrast = 1.0,
      annotations = [],
      onAnnotationCreated,
      onUpdateAnnotation,
      onDeleteAnnotation,
      penColor = "#22c55e",
      penWidth = 2,
      showAnnotations = true,
      pendingStrokes = [],
      pendingSlice = 0,
      pendingPlane = "axial",
    },
    ref,
  ) => {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const nvRef = useRef<Niivue | null>(null);
    const [internalLoading, setInternalLoading] = useState(false);
    const [outlinePaths, setOutlinePaths] = useState<string[]>([]);
    const [currentPath, setCurrentPath] = useState<string>("");

    // Calculate generic paths for pending strokes
    // Returns an array of path strings
    // Generic path calculation for preview
    const pendingObjects = React.useMemo(() => {
      if (!pendingStrokes || pendingStrokes.length === 0) return [];

      return pendingStrokes.map((pts) => {
        if (!pts.length) return { type: "none", d: "" };

        // Detection hack: if it's exactly 2 points and captured in mode 5, it's a circle
        // But the current Scans.tsx just passes number[][][].
        // To properly support this, we should ideally have a more structured prop.
        // For now, let's assume if it's 2 points and we are in Circle mode? No.
        // Let's just treat all as paths for now, but I will add support for circle rendering if I change the data structure.
        const path = pts.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(" ");
        return { type: "path", d: path, pts };
      });
    }, [pendingStrokes]);

    // Expose methods via ref
    // Expose methods via ref
    React.useImperativeHandle(ref, () => ({
      getScreenshot: async () => {
        if (!canvasRef.current || !nvRef.current) return null;

        // 1. Force redraw WebGL
        nvRef.current.drawScene();

        // 2. Create offscreen canvas
        const width = canvasRef.current.width;
        const height = canvasRef.current.height;
        const offscreen = document.createElement("canvas");
        offscreen.width = width;
        offscreen.height = height;
        const ctx = offscreen.getContext("2d");
        if (!ctx) return null;

        // 3. Draw WebGL content
        ctx.drawImage(canvasRef.current, 0, 0, width, height);

        const rect = canvasRef.current.getBoundingClientRect();
        const scaleX = width / rect.width;
        const scaleY = height / rect.height;

        // 4. Draw Pending Strokes (SVG paths)
        if (pendingObjects && pendingObjects.length > 0) {
          ctx.save();
          ctx.scale(scaleX, scaleY); // Scale context to match CSS coordinates of strokes
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = penColorRef.current || "#22c55e";
          ctx.lineWidth = penWidthRef.current || 2;

          pendingObjects.forEach((obj) => {
            if (obj.d) {
              const p = new Path2D(obj.d);
              ctx.stroke(p);
            }
          });
          ctx.restore();
        }

        // 5. Draw Existing Annotations
        if (showAnnotations && outlinePaths && outlinePaths.length > 0) {
          ctx.strokeStyle = "#22c55e"; // Green for saved
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 2]);
          outlinePaths.forEach((pathStr) => {
            if (pathStr) {
              const p = new Path2D(pathStr);
              ctx.stroke(p);
            }
          });
          ctx.setLineDash([]);
        }

        return new Promise<Blob | null>((resolve) => {
          offscreen.toBlob((blob) => {
            resolve(blob);
          });
        });
      },
    }));

    // Refs needed to access latest props in callbacks without triggering re-initialization
    const onAnnotationCreatedRef = useRef(onAnnotationCreated);
    const onUpdateAnnotationRef = useRef(onUpdateAnnotation);
    const onDeleteAnnotationRef = useRef(onDeleteAnnotation);
    const annotationsRef = useRef(annotations);
    const pendingStrokesRef = useRef(pendingStrokes);
    const penColorRef = useRef(penColor);
    const penWidthRef = useRef(penWidth);
    const dragModeRef = useRef(dragMode);

    // Update refs when props change
    useEffect(() => {
      onAnnotationCreatedRef.current = onAnnotationCreated;
    }, [onAnnotationCreated]);

    useEffect(() => {
      onUpdateAnnotationRef.current = onUpdateAnnotation;
    }, [onUpdateAnnotation]);

    useEffect(() => {
      onDeleteAnnotationRef.current = onDeleteAnnotation;
    }, [onDeleteAnnotation]);

    useEffect(() => {
      pendingStrokesRef.current = pendingStrokes;
    }, [pendingStrokes]);

    useEffect(() => {
      penColorRef.current = penColor;
      penWidthRef.current = penWidth;
      dragModeRef.current = dragMode;

      // Locking logic: If drawing mode (4), ensure native interaction is minimized if possible.
      // Niivue doesn't have a simple 'disable all' but setting dragMode to a non-interactive one depends on NiiVue version.
      // We will handle the "blocking" via the event listeners interception if needed,
      // but primarily we rely on NiiVue respecting the passed dragMode -
      // HOWEVER, dragMode=4 is CUSTOM. We need to tell NiiVue to be in a mode that doesn't conflict.
      // mode 3 is Pan. 1 is Contrast. 2 is Measurement.
      // We probably want NiiVue to sit idle.
      // We will set nv.opts.dragMode to something safe in the sync effect.
    }, [penColor, penWidth, dragMode]);

    useEffect(() => {
      annotationsRef.current = annotations;
      if (nvRef.current) {
        updateOutlines(nvRef.current);
      }
    }, [annotations]);

    // Defined outside initialization to be accessible
    const updateOutlines = (nv: Niivue) => {
      const currentAnnotations = annotationsRef.current;

      if (!nv || !showAnnotations || !currentAnnotations || currentAnnotations.length === 0) {
        setOutlinePaths([]);
        return;
      }

      const paths: string[] = [];
      const currentSlice = nv.scene.crosshairPos; // [fX, fY, fZ] in frac
      const currentPlane = nv.opts.sliceType;

      currentAnnotations.forEach((ann) => {
        if (!ann.points || ann.points.length === 0) return;

        // Filtering by plane
        const annPlane = ann.plane.toLowerCase();
        let isCorrectPlane = false;
        if (currentPlane === SLICE_TYPE.AXIAL && (annPlane === "axial" || annPlane === "poprzeczna")) isCorrectPlane = true;
        if (currentPlane === SLICE_TYPE.CORONAL && (annPlane === "coronal" || annPlane === "czolowa")) isCorrectPlane = true;
        if (currentPlane === SLICE_TYPE.SAGITTAL && (annPlane === "sagittal" || annPlane === "strzalkowa")) isCorrectPlane = true;
        if (currentPlane === SLICE_TYPE.MULTIPLANAR) isCorrectPlane = true;

        if (!isCorrectPlane) return;

        // Filtering by slice (within 1mm or same index)
        // This is tricky in multiplanar. For now, let's just project everything if Multiplanar
        // But for 2D views, let's be strict.

        let pathData = "";
        ann.points.forEach((pt: number[], i: number) => {
          // pt is [voxX, voxY]
          try {
            // Convert [voxX, voxY, ann.slice_index] to canvas coordinates
            const vox = [pt[0], pt[1], ann.slice_index];

            // Check if slice is visible
            // nv.vox2frac(vox) gives [fX, fY, fZ]
            const frac = (nv as any).vox2frac(vox);

            // In 2D view, we only show if the Z-index (or whatever index matches the plane) is near the current crosshair
            if (currentPlane !== SLICE_TYPE.MULTIPLANAR && currentPlane !== SLICE_TYPE.RENDER) {
              let match = false;
              if (currentPlane === SLICE_TYPE.AXIAL && Math.abs(frac[2] - currentSlice[2]) < 0.01) match = true;
              if (currentPlane === SLICE_TYPE.CORONAL && Math.abs(frac[1] - currentSlice[1]) < 0.01) match = true;
              if (currentPlane === SLICE_TYPE.SAGITTAL && Math.abs(frac[0] - currentSlice[0]) < 0.01) match = true;
              if (!match) return;
            }

            const canvas = (nv as any).canvas;
            let canvasPos: [number, number] | null = null;

            // NiiVue's internal projection to canvas depends on current view
            // Using nv.mm2canvas or similar would be better but NiiVue API varies.
            // Let's use the native method if available or our frac calculation

            // Simplified: only show on correct plane view
            const screenPos = (nv as any).frac2canvas(frac);
            if (screenPos) {
              if (i === 0) pathData += `M ${screenPos[0]} ${screenPos[1]}`;
              else pathData += ` L ${screenPos[0]} ${screenPos[1]}`;
            }
          } catch (e) {
            console.warn("Error calculating annotation path:", e);
          }
        });
        if (pathData) paths.push(pathData);
      });
      setOutlinePaths(paths);
    };

    // 1. Inicjalizacja Niivue (Run ONCE)
    useEffect(() => {
      const nv = new Niivue({
        show3Dcrosshair: true,
        dragAndDropEnabled: false,
        backColor: [0, 0, 0, 1],
        preserveDrawingBuffer: true,
      } as any);
      if (canvasRef.current) {
        nv.attachToCanvas(canvasRef.current);
      }

      let isDrawing = false;
      let isMoving = false;
      let selectedObjectIndex = -1;
      let localPoints: number[][] = [];
      let currentDrawPath = "";
      let startMoveCoord: [number, number] | null = null;
      let originalObjectPoints: number[][] = [];

      const handleMouseUp = () => {
        if (isDrawing) {
          isDrawing = false;
          setCurrentPath(""); // Clear current drawing
          if (onAnnotationCreatedRef.current && localPoints.length > 0) {
            // Find current slice index from NiiVue
            const frac = nv.scene.crosshairPos;
            const vox = nv.frac2vox(frac);
            // Index depends on plane. If Axial, slice is vox[2]
            let sliceIdx = vox[2];
            if (nv.opts.sliceType === SLICE_TYPE.CORONAL) sliceIdx = vox[1];
            if (nv.opts.sliceType === SLICE_TYPE.SAGITTAL) sliceIdx = vox[0];

            onAnnotationCreatedRef.current(localPoints, sliceIdx);
          }
        }
        if (isMoving) {
          isMoving = false;
          startMoveCoord = null;
          // When move is finished, we should ideally notify the parent to update the permanent state
          // For now, we update localPoints and the parent's capturedStrokes will update if we handle it correctly.
          // BUT capturedStrokes is a prop. Moving objects requires parent state update.
          // I will add a callback for object mutation if needed, but for now let's just implement the UI and I'll update Scans.tsx later.
        }
      };

      const handleMouseDown = (e: MouseEvent) => {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // MODE 4: Pen or MODE 5: Circle
        if ((dragModeRef.current === 4 || dragModeRef.current === 5) && e.button === 0) {
          e.stopImmediatePropagation();
          e.preventDefault();

          isDrawing = true;
          // IMPORTANT: Convert canvas (x,y) to VOXEL coordinates
          const frac = (nv as any).canvas2frac([x, y]);
          const vox = nv.frac2vox(frac);
          // We only store [voxX, voxY] because sliceIdx is passed separately
          // But wait, NiiVue's canvas2frac is view-dependent.
          // If we are in Axial view, frac[0,1] correspond to X,Y

          localPoints = [[vox[0], vox[1]]];
          currentDrawPath = `M ${x} ${y}`;
          setCurrentPath(currentDrawPath);
        }

        // MODE 6: Move or MODE 7: Eraser
        if ((dragModeRef.current === 6 || dragModeRef.current === 7) && e.button === 0) {
          // Find if we clicked on any object
          // Simple proximity check for path points
          const searchDist = 15;
          let bestIdx = -1;
          let minD = Infinity;

          pendingStrokesRef.current.forEach((pts, objIdx) => {
            pts.forEach((p) => {
              const d = Math.sqrt((p[0] - x) ** 2 + (p[1] - y) ** 2);
              if (d < searchDist && d < minD) {
                minD = d;
                bestIdx = objIdx;
              }
            });
          });

          if (bestIdx !== -1) {
            if (dragModeRef.current === 6) {
              isMoving = true;
              selectedObjectIndex = bestIdx;
              startMoveCoord = [x, y];
              originalObjectPoints = JSON.parse(JSON.stringify(pendingStrokesRef.current[bestIdx]));
            } else {
              // MODE 7: Eraser
              if (onDeleteAnnotationRef.current) {
                onDeleteAnnotationRef.current(bestIdx);
              }
            }
            e.stopImmediatePropagation();
            e.preventDefault();
          }
        }
      };

      const handleMouseMove = (e: MouseEvent) => {
        const dMode = dragModeRef.current;
        if (dMode < 4) return;

        if ((isDrawing || isMoving) && (e.buttons & 1) === 0) {
          handleMouseUp();
          return;
        }

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (isDrawing) {
          e.stopImmediatePropagation();
          e.preventDefault();

          if (dMode === 4) {
            // Pen path
            const frac = (nv as any).canvas2frac([x, y]);
            const vox = nv.frac2vox(frac);
            localPoints.push([vox[0], vox[1]]);

            currentDrawPath += ` L ${x} ${y}`;
            setCurrentPath(currentDrawPath);
          } else if (dMode === 5) {
            // Circle preview: localPoints[0] is center, [x,y] is perimeter point
            // We need to store center in canvas coordinates for preview
            // But localPoints[0] is voxels. We need to convert it back or store it.
            // Let's use a simpler approach: get center from first click.
            // We need to keep center in canvas coords for the preview path string.

            const startFrac = (nv as any).vox2frac([localPoints[0][0], localPoints[0][1], 0]); // dummy slice
            const startCanvas = (nv as any).frac2canvas(startFrac);
            if (!startCanvas) return;

            const centerX = startCanvas[0];
            const centerY = startCanvas[1];
            const radius = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

            let circlePath = "";
            const segments = 32;
            localPoints = [];
            for (let i = 0; i <= segments; i++) {
              const angle = (i / segments) * Math.PI * 2;
              const px = centerX + radius * Math.cos(angle);
              const py = centerY + radius * Math.sin(angle);

              circlePath += (i === 0 ? "M " : " L ") + `${px} ${py}`;

              // Store as VOXEL coordinates
              const cFrac = (nv as any).canvas2frac([px, py]);
              const cVox = nv.frac2vox(cFrac);
              localPoints.push([cVox[0], cVox[1]]);
            }
            setCurrentPath(circlePath);
          }
        }

        if (isMoving && startMoveCoord) {
          const dx = x - startMoveCoord[0];
          const dy = y - startMoveCoord[1];

          // Update the object in parent's state via a hook if possible, or just local shadow update
          // Since we can't easily update props, we'll use a hack: call onAnnotationCreated with the updated points
          // BUT onAnnotationCreated usually appends. We need an onUpdateAnnotation.
          // For now, let's just update localPoints and "fake" it till we update Scans.tsx.
          // Actually, I'll modify Scans.tsx to support onUpdateAnnotation.

          const movedPoints = originalObjectPoints.map((p) => [p[0] + dx, p[1] + dy]);
          if (onUpdateAnnotationRef.current) {
            onUpdateAnnotationRef.current(selectedObjectIndex, movedPoints);
          }
        }
      };

      if (canvasRef.current) {
        // Use capture phase to intercept before NiiVue if possible
        canvasRef.current.addEventListener("mousedown", handleMouseDown, { capture: true });
        canvasRef.current.addEventListener("mousemove", handleMouseMove, { capture: true });
        window.addEventListener("mouseup", handleMouseUp);
      }

      nvRef.current = nv;
      nv.onLocationChange = () => updateOutlines(nv);

      return () => {
        if (canvasRef.current) {
          canvasRef.current.removeEventListener("mousedown", handleMouseDown, { capture: true });
          canvasRef.current.removeEventListener("mousemove", handleMouseMove, { capture: true });
        }
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }, []);

    // 2. Ładowanie Wolumenu i View Settings
    // Combined interactions to avoid race conditions
    useEffect(() => {
      const nv = nvRef.current;
      if (!nv || !imageUrl) return;

      const updateView = () => {
        if (viewMode === "3d") nv.setSliceType(SLICE_TYPE.RENDER);
        else if (viewMode === "2d") {
          if (slicePlane === "axial") nv.setSliceType(SLICE_TYPE.AXIAL);
          else if (slicePlane === "coronal") nv.setSliceType(SLICE_TYPE.CORONAL);
          else if (slicePlane === "sagittal") nv.setSliceType(SLICE_TYPE.SAGITTAL);
        } else nv.setSliceType(SLICE_TYPE.MULTIPLANAR);

        // IMPORTANT: If in DRAW mode (4), set NiiVue to a neutral mode (e.g. 3=Pan) but
        // relying on our propagation stopping. Or set it to none if supported.
        // Using 1 (contrast) as default fallback, but if dragMode is 4 we set 1 internally
        // but block events via listeners.
        if (dragMode !== 4) {
          nv.opts.dragMode = dragMode;
        } else {
          // Set to pan key or contrast to keep it valid, but we block input
          nv.opts.dragMode = 1;
        }

        if (nv.volumes.length > 0) {
          nv.setColormap(nv.volumes[0].id, colormap);
        }
        updateOutlines(nv);
      };

      // If volume not loaded, load it
      if (!nv.volumes.length || nv.volumes[0].url !== imageUrl) {
        setInternalLoading(true);
        nv.addVolumeFromUrl({
          url: imageUrl,
          name: "scan",
          colormap: colormap,
        })
          .then(() => {
            updateView();
            setInternalLoading(false);
          })
          .catch((e) => {
            console.error(e);
            setInternalLoading(false);
          });
      } else {
        updateView();
      }
    }, [imageUrl, viewMode, slicePlane, dragMode, colormap, brightness, contrast]);

    return (
      <Box sx={{ position: "relative", width: "100%", height: "100%", bgcolor: "black", overflow: "hidden" }}>
        <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />

        {/* SVG Overlay for Outlines */}
        <svg
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 5,
          }}
        >
          {/* Existing annotations */}
          {outlinePaths.map((path, idx) => (
            <path key={idx} d={path} fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="4 2" />
          ))}

          {/* Pending Drawing (Completed but not saved) */}
          {pendingObjects.map((obj, i) => (
            <path key={`pending-${i}`} d={obj.d} fill="none" stroke={penColor} strokeWidth={penWidth} strokeLinecap="round" strokeLinejoin="round" />
          ))}

          {/* Current Drawing Path (In progress) */}
          {currentPath && <path d={currentPath} fill="none" stroke={penColor} strokeWidth={penWidth} strokeLinecap="round" strokeLinejoin="round" />}
        </svg>

        {internalLoading && (
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: "rgba(0,0,0,0.5)",
              color: "white",
              zIndex: 10,
            }}
          >
            <Typography variant="h6">Pobieranie wolumenu...</Typography>
          </Box>
        )}
      </Box>
    );
  },
);

export default NiiVue;
