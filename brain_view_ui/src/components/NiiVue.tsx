import React, { useRef, useEffect, useState, useCallback } from "react";
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
  onAnnotationCreated?: (points: number[][], sliceIndex: number, color: string, width: number) => void;
  onUpdateAnnotation?: (index: number, points: number[][]) => void;
  onDeleteAnnotation?: (index: number) => void;
  penColor?: string;
  penWidth?: number;
  showAnnotations?: boolean;
  pendingStrokes?: any[]; // Array<{ points: number[][], color: string, width: number }>
  pendingSlice?: number;
  pendingPlane?: string;
}

export interface NiiVueHandle {
  getScreenshot: () => Promise<Blob | null>;
  getViewerState: () => any;
  setViewerState: (state: any) => void;
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
    const [pendingPaths, setPendingPaths] = useState<string[]>([]);
    const [currentPath, setCurrentPath] = useState<string>("");

    // Refs needed to access latest props in callbacks without triggering re-initialization
    const onAnnotationCreatedRef = useRef(onAnnotationCreated);
    const onUpdateAnnotationRef = useRef(onUpdateAnnotation);
    const onDeleteAnnotationRef = useRef(onDeleteAnnotation);
    const annotationsRef = useRef(annotations);
    const pendingStrokesRef = useRef(pendingStrokes);
    const penColorRef = useRef(penColor);
    const penWidthRef = useRef(penWidth);
    const dragModeRef = useRef(dragMode);
    const showAnnotationsRef = useRef(showAnnotations);

    // 1. Definition of update functions (Must be before useEffect calls)

    const updatePendingPaths = useCallback((nv: Niivue) => {
      const strokes = pendingStrokesRef.current;
      if (!nv || !strokes || strokes.length === 0) {
        setPendingPaths([]);
        return;
      }

      const paths: any[] = [];
      const currentSlice = nv.scene.crosshairPos;
      const currentPlane = nv.opts.sliceType;

      // Get dimensions for coordinate conversion
      const dims = nv.volumes.length > 0 ? nv.volumes[0].dims : [1, 1, 1, 1];

      strokes.forEach((strokeObj: any) => {
        // Handle both old (flat points) and new (object with color/width)
        const pts = Array.isArray(strokeObj) ? strokeObj : strokeObj.points;
        const color = strokeObj.color || penColorRef.current || "#22c55e";
        const width = strokeObj.width || penWidthRef.current || 2;

        if (!pts || pts.length === 0) return;

        let pathData = "";
        pts.forEach((p: any, i: number) => {
          try {
            // Coordinate Detection Heuristic:
            // If any coord > 1.0, it's likely a VOXEL (legacy).
            const isVoxel = Math.abs(p[0]) > 1.0 || Math.abs(p[1]) > 1.0 || (p.length === 3 && Math.abs(p[2]) > 1.0);

            let frac: [number, number, number];
            if (isVoxel) {
              // Convert Voxel to Fraction
              const v = p.length === 3 ? [p[0], p[1], p[2]] : [p[0], p[1], currentSlice[2] * (dims[3] - 1)];
              const res = nv.vox2frac(v as any);
              frac = [res[0], res[1], res[2]];
            } else {
              // Use Fraction directly
              if (p.length === 3) {
                frac = [p[0], p[1], p[2]];
              } else {
                frac = [p[0], p[1], currentSlice[2]];
              }
            }

            // Filter by slice if not multiplanar
            if (currentPlane !== SLICE_TYPE.MULTIPLANAR && currentPlane !== SLICE_TYPE.RENDER) {
              let match = false;
              const threshold = 0.01;
              if (currentPlane === SLICE_TYPE.AXIAL && Math.abs(frac[2] - currentSlice[2]) < threshold) match = true;
              if (currentPlane === SLICE_TYPE.CORONAL && Math.abs(frac[1] - currentSlice[1]) < threshold) match = true;
              if (currentPlane === SLICE_TYPE.SAGITTAL && Math.abs(frac[0] - currentSlice[0]) < threshold) match = true;
              if (!match) return;
            }

            const screenPos = nv.frac2canvasPos(frac);
            if (screenPos) {
              if (pathData === "") pathData += `M ${screenPos[0]} ${screenPos[1]}`;
              else pathData += ` L ${screenPos[0]} ${screenPos[1]}`;
            }
          } catch (e) {
            console.warn("Error calculating annotation path:", e);
          }
        });
        if (pathData) paths.push({ path: pathData, color, width });
      });
      setPendingPaths(paths);
    }, []);

    const updateOutlines = useCallback(
      (nv: Niivue) => {
        const currentAnnotations = annotationsRef.current;

        if (!nv || !showAnnotationsRef.current || !currentAnnotations || currentAnnotations.length === 0) {
          setOutlinePaths([]);
          return;
        }

        const paths: string[] = [];
        const currentSlice = nv.scene.crosshairPos;
        const currentPlane = nv.opts.sliceType;
        const dims = nv.volumes.length > 0 ? nv.volumes[0].dims : [1, 1, 1, 1];

        currentAnnotations.forEach((ann) => {
          if (!ann.points || ann.points.length === 0) return;

          const annPlane = ann.plane.toLowerCase();
          let isCorrectPlane = false;
          if (currentPlane === SLICE_TYPE.AXIAL && (annPlane === "axial" || annPlane === "poprzeczna")) isCorrectPlane = true;
          if (currentPlane === SLICE_TYPE.CORONAL && (annPlane === "coronal" || annPlane === "czolowa")) isCorrectPlane = true;
          if (currentPlane === SLICE_TYPE.SAGITTAL && (annPlane === "sagittal" || annPlane === "strzalkowa")) isCorrectPlane = true;
          if (currentPlane === SLICE_TYPE.MULTIPLANAR) isCorrectPlane = true;

          if (!isCorrectPlane) return;

          let pathData = "";
          ann.points.forEach((pt: number[], i: number) => {
            try {
              // pt detection
              const isVoxel = Math.abs(pt[0]) > 1.0 || Math.abs(pt[1]) > 1.0;
              let frac: [number, number, number];

              if (isVoxel) {
                const v = pt.length === 3 ? [pt[0], pt[1], pt[2]] : [pt[0], pt[1], ann.slice || 0];
                const res = nv.vox2frac(v as any);
                frac = [res[0], res[1], res[2]];
              } else {
                if (pt.length === 3) {
                  frac = [pt[0], pt[1], pt[2]];
                } else {
                  // Legacy 2D fraction + fraction slice index
                  frac = [pt[0], pt[1], ann.slice || 0.5];
                }
              }

              if (currentPlane !== SLICE_TYPE.MULTIPLANAR && currentPlane !== SLICE_TYPE.RENDER) {
                let match = false;
                const threshold = 0.01;
                if (currentPlane === SLICE_TYPE.AXIAL && Math.abs(frac[2] - currentSlice[2]) < threshold) match = true;
                if (currentPlane === SLICE_TYPE.CORONAL && Math.abs(frac[1] - currentSlice[1]) < threshold) match = true;
                if (currentPlane === SLICE_TYPE.SAGITTAL && Math.abs(frac[0] - currentSlice[0]) < threshold) match = true;
                if (!match) return;
              }

              const screenPos = nv.frac2canvasPos(frac);
              if (screenPos) {
                if (pathData === "") pathData += `M ${screenPos[0]} ${screenPos[1]}`;
                else pathData += ` L ${screenPos[0]} ${screenPos[1]}`;
              }
            } catch (e) {
              console.warn("Error calculating annotation path:", e);
            }
          });
          if (pathData) paths.push(pathData);
        });
        setOutlinePaths(paths);
      },
      [], // showAnnotationsRef.current is used inside, so no need to list showAnnotations as dependency
    );

    const updateAll = useCallback(
      (nv: Niivue) => {
        updateOutlines(nv);
        updatePendingPaths(nv);
      },
      [updateOutlines, updatePendingPaths],
    );

    // 2. Expose methods via ref
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
        if (pendingPaths && pendingPaths.length > 0) {
          ctx.save();
          ctx.scale(scaleX, scaleY); // Scale context to match CSS coordinates of strokes
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.strokeStyle = penColorRef.current || "#22c55e";
          ctx.lineWidth = penWidthRef.current || 2;

          pendingPaths.forEach((pathStr) => {
            if (pathStr) {
              const p = new Path2D(pathStr);
              ctx.stroke(p);
            }
          });
          ctx.restore();
        }

        // 5. Draw Existing Annotations
        if (showAnnotationsRef.current && outlinePaths && outlinePaths.length > 0) {
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
      getViewerState: () => {
        if (!nvRef.current) return null;
        return {
          crosshairPos: nvRef.current.scene.crosshairPos,
          // You could add other things here like zoom, pan, etc if needed
        };
      },
      setViewerState: (state: any) => {
        if (!nvRef.current || !state) return;
        if (state.crosshairPos) {
          nvRef.current.scene.crosshairPos = state.crosshairPos;
          nvRef.current.drawScene();
          updateAll(nvRef.current);
        }
      },
    }));

    // 3. Effects
    useEffect(() => {
      showAnnotationsRef.current = showAnnotations;
      if (nvRef.current) {
        updateAll(nvRef.current);
      }
    }, [showAnnotations, updateAll]);

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
      if (nvRef.current) {
        updatePendingPaths(nvRef.current);
      }
    }, [pendingStrokes, updatePendingPaths]);

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
    }, [annotations, updateOutlines]);

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
      let isResizing = false;
      let selectedObjectIndex = -1;
      let localPoints: number[][] = [];
      let currentDrawPath = "";
      let startMoveCoord: [number, number] | null = null;
      let startDrawCoord: [number, number] | null = null;
      let originalObjectPoints: number[][] = [];

      const handleMouseUp = () => {
        if (isDrawing) {
          isDrawing = false;
          setCurrentPath(""); // Clear current drawing
          if (onAnnotationCreatedRef.current && localPoints.length > 0) {
            // Find current slice index from NiiVue (fractional Z-component of crosshair)
            const frac = nv.scene.crosshairPos;
            let sliceFrac = frac[2]; // Default to axial Z-fraction
            if (nv.opts.sliceType === SLICE_TYPE.CORONAL) sliceFrac = frac[1];
            if (nv.opts.sliceType === SLICE_TYPE.SAGITTAL) sliceFrac = frac[0];

            onAnnotationCreatedRef.current(localPoints, sliceFrac, penColorRef.current || "#22c55e", penWidthRef.current || 2);
          }
        }
        if (isMoving || isResizing) {
          isMoving = false;
          isResizing = false;
          startMoveCoord = null;
        }
        startDrawCoord = null;
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
          startDrawCoord = [x, y];

          if (dragModeRef.current === 5) {
            // Mode 5: Circle - Start with center
            setCurrentPath("");
          } else {
            // Mode 4: Pen - Start points in fractional coords
            const frac = nv.canvasPos2frac([x, y]);
            localPoints = [[frac[0], frac[1], frac[2]]];
            currentDrawPath = `M ${x} ${y}`;
            setCurrentPath(currentDrawPath);
          }
        }

        // MODE 6: Move or MODE 7: Eraser
        if ((dragModeRef.current === 6 || dragModeRef.current === 7) && e.button === 0) {
          // Find if we clicked on any object
          const searchDist = 15;
          let bestIdx = -1;
          let minD = Infinity;
          let hitEdge = false;

          const currentStrokes = pendingStrokesRef.current;
          if (currentStrokes) {
            currentStrokes.forEach((pts, objIdx) => {
              const isCircle = pts.length === 33; // Heuristic for circle

              try {
                // pts are fractional coords
                const firstFrac: [number, number, number] = [pts[0][0], pts[0][1], pts[0][2]];
                const firstCanvas = nv.frac2canvasPos(firstFrac);

                if (firstCanvas) {
                  if (isCircle) {
                    // For circles, we check distance to center
                    const sumX = pts.reduce((acc: number, p: number[]) => acc + p[0], 0);
                    const sumY = pts.reduce((acc: number, p: number[]) => acc + p[1], 0);
                    const sumZ = pts.reduce((acc: number, p: number[]) => acc + p[2], 0);
                    const avgFrac: [number, number, number] = [sumX / pts.length, sumY / pts.length, sumZ / pts.length];
                    const avgCanvas = nv.frac2canvasPos(avgFrac);

                    if (avgCanvas) {
                      const distToCenter = Math.sqrt((avgCanvas[0] - x) ** 2 + (avgCanvas[1] - y) ** 2);
                      const radius = Math.sqrt((firstCanvas[0] - avgCanvas[0]) ** 2 + (firstCanvas[1] - avgCanvas[1]) ** 2);

                      // Resize near edge (within 15 pixels of radius)
                      if (Math.abs(distToCenter - radius) < 15) {
                        if (Math.abs(distToCenter - radius) < minD) {
                          minD = Math.abs(distToCenter - radius);
                          bestIdx = objIdx;
                          hitEdge = true;
                        }
                      }
                      // Move if inside the circle
                      else if (distToCenter < radius) {
                        if (distToCenter < minD) {
                          minD = distToCenter;
                          bestIdx = objIdx;
                          hitEdge = false;
                        }
                      }
                    }
                  } else {
                    // For lines, check distance to any point
                    pts.forEach((p: number[]) => {
                      const f: [number, number, number] = [p[0], p[1], p[2]];
                      const c = nv.frac2canvasPos(f);
                      if (c) {
                        const d = Math.sqrt((c[0] - x) ** 2 + (c[1] - y) ** 2);
                        if (d < searchDist && d < minD) {
                          minD = d;
                          bestIdx = objIdx;
                          hitEdge = false;
                        }
                      }
                    });
                  }
                }
              } catch (err) {
                console.warn("Error checking object distance:", err);
              }
            });
          }

          if (bestIdx !== -1) {
            if (dragModeRef.current === 6) {
              selectedObjectIndex = bestIdx;
              startMoveCoord = [x, y];
              originalObjectPoints = JSON.parse(JSON.stringify(Array.isArray(currentStrokes[bestIdx]) ? currentStrokes[bestIdx] : currentStrokes[bestIdx].points));

              if (hitEdge) {
                isResizing = true;
              } else {
                isMoving = true;
              }
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

        if ((isDrawing || isMoving || isResizing) && (e.buttons & 1) === 0) {
          handleMouseUp();
          return;
        }

        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (isDrawing && startDrawCoord) {
          e.stopImmediatePropagation();
          e.preventDefault();

          if (dMode === 4) {
            // Pen path in fractional coords
            const frac = nv.canvasPos2frac([x, y]);
            localPoints.push([frac[0], frac[1], frac[2]]);

            currentDrawPath += ` L ${x} ${y}`;
            setCurrentPath(currentDrawPath);
          } else if (dMode === 5) {
            // Circle preview: Dynamic radius based on distance from start
            const centerX = startDrawCoord[0];
            const centerY = startDrawCoord[1];
            const radius = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

            let circlePath = "";
            const segments = 32;
            localPoints = []; // Clear and rebuild for circle
            for (let i = 0; i <= segments; i++) {
              const angle = (i / segments) * Math.PI * 2;
              const px = centerX + radius * Math.cos(angle);
              const py = centerY + radius * Math.sin(angle);

              const cFrac = nv.canvasPos2frac([px, py]);
              localPoints.push([cFrac[0], cFrac[1], cFrac[2]]);

              // For display, use the canvas coordinates directly
              circlePath += (i === 0 ? "M " : " L ") + `${px} ${py}`;
            }
            setCurrentPath(circlePath);
          }
        }

        if ((isMoving || isResizing) && startMoveCoord) {
          e.stopImmediatePropagation();
          e.preventDefault();

          if (isResizing) {
            // Recalculate radius based on center of original object
            const sumX = originalObjectPoints.reduce((acc, p) => acc + p[0], 0);
            const sumY = originalObjectPoints.reduce((acc, p) => acc + p[1], 0);
            const sumZ = originalObjectPoints.reduce((acc, p) => acc + p[2], 0);
            const centerFrac: [number, number, number] = [sumX / originalObjectPoints.length, sumY / originalObjectPoints.length, sumZ / originalObjectPoints.length];

            const centerCanvas = nv.frac2canvasPos(centerFrac);

            if (centerCanvas) {
              const newRadius = Math.sqrt((x - centerCanvas[0]) ** 2 + (y - centerCanvas[1]) ** 2);

              const segments = 32;
              const movedPoints: number[][] = [];
              for (let i = 0; i <= segments; i++) {
                const angle = (i / segments) * Math.PI * 2;
                const px = centerCanvas[0] + newRadius * Math.cos(angle);
                const py = centerCanvas[1] + newRadius * Math.sin(angle);
                const cFrac = nv.canvasPos2frac([px, py]);
                movedPoints.push([cFrac[0], cFrac[1], cFrac[2]]);
              }
              if (onUpdateAnnotationRef.current) {
                onUpdateAnnotationRef.current(selectedObjectIndex, movedPoints);
              }
            }
          } else if (isMoving) {
            // Convert canvas move to fractional move
            const currentFrac = nv.canvasPos2frac([x, y]);
            const startFrac = nv.canvasPos2frac([startMoveCoord[0], startMoveCoord[1]]);

            const dFracX = currentFrac[0] - startFrac[0];
            const dFracY = currentFrac[1] - startFrac[1];
            const dFracZ = currentFrac[2] - startFrac[2];

            const movedPoints = originalObjectPoints.map((p) => {
              if (p.length === 3) {
                return [p[0] + dFracX, p[1] + dFracY, p[2] + dFracZ];
              }
              return [p[0] + dFracX, p[1] + dFracY]; // Fallback for 2D points, though we aim for 3D fractional
            });

            if (onUpdateAnnotationRef.current) {
              onUpdateAnnotationRef.current(selectedObjectIndex, movedPoints);
            }
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
      nv.onLocationChange = () => updateAll(nv);

      return () => {
        const currentCanvas = canvasRef.current;
        if (currentCanvas) {
          currentCanvas.removeEventListener("mousedown", handleMouseDown, { capture: true });
          currentCanvas.removeEventListener("mousemove", handleMouseMove, { capture: true });
        }
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }, [updateAll]);

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
        updateAll(nv);
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
    }, [imageUrl, viewMode, slicePlane, dragMode, colormap, brightness, contrast, updateAll]);

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
          {pendingPaths.map((pObj: any, i) => (
            <path key={`pending-${i}`} d={pObj.path} fill="none" stroke={pObj.color} strokeWidth={pObj.width} strokeLinecap="round" strokeLinejoin="round" />
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
