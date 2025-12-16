import React, { useRef, useEffect } from "react";
import { Niivue } from "@niivue/niivue";

interface NiiVueProps {
  imageUrl: string;
}

export const NiiVue: React.FC<NiiVueProps> = ({ imageUrl }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nvRef = useRef<Niivue | null>(null);

  useEffect(() => {
    async function setupAndLoad() {
      if (!imageUrl) return;

      // TEST: sprawdź fetch zanim dotkniemy Niivue
      try {
        console.log("[NiiVue] Test fetch start:", imageUrl);
        const resp = await fetch(imageUrl);
        console.log(
          "[NiiVue] Test fetch result:",
          resp.status,
          resp.statusText,
          resp.headers.get("content-type")
        );
        if (!resp.ok) {
          console.error("[NiiVue] Fetch NOT OK, body:", await resp.text());
          return;
        }
      } catch (e) {
        console.error("[NiiVue] Fetch error (CORS / sieć):", e);
        return;
      }

      if (!nvRef.current) {
        const nv = new Niivue({
          show3Dcrosshair: true,
          dragAndDropEnabled: false,
        });
        if (!canvasRef.current) return;
        nv.attachToCanvas(canvasRef.current);
        nvRef.current = nv;
      }

      const nv = nvRef.current;

      if (nv.volumes && nv.volumes.length > 0) {
        for (const v of [...nv.volumes]) {
          nv.removeVolume(v);
        }
      }

      console.log("Ładowanie NIfTI w Niivue", imageUrl);

      await nv.addVolumeFromUrl({
        url: imageUrl,
        name: "scan",
        colormap: "gray",
      });
    }

    setupAndLoad().catch((e) =>
      console.error("Błąd ładowania w NiiVue:", e, "dla URL:", imageUrl)
    );
  }, [imageUrl]);

  return <canvas ref={canvasRef} height={480} width={640} />;
};

export default NiiVue;
