// StudyViewer.tsx
import React, { useEffect, useRef, useState } from "react";
import cornerstone from "cornerstone-core";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import dicomParser from "dicom-parser";
import type { Study } from "@/types/study";
import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut } from "lucide-react";

cornerstoneWADOImageLoader.external.cornerstone = cornerstone;
cornerstoneWADOImageLoader.external.dicomParser = dicomParser;
cornerstoneWADOImageLoader.configure({ useWebWorkers: true });

interface Props {
  study: Study;
  activeFormat: string;
  setActiveFormat: (f: string) => void;
  onDownload: (format: string) => void;
}

export default function StudyViewer({
  study,
}: Props) {
  const cornerstoneElementRef = useRef<HTMLDivElement>(null);
  const [aspectRatio, setAspectRatio] = useState("1 / 1");
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    if (!study.images || study.images.length === 0) return;

    const element = cornerstoneElementRef.current;
    if (!element) return;

    cornerstone.enable(element);
    const imageId = `wadouri:${study.images[0]}`;

    cornerstone
      .loadImage(imageId)
      .then((image) => {
        const viewport = cornerstone.getDefaultViewportForImage(element, image);
        cornerstone.displayImage(element, image, viewport);
        const ratio = `${image.columns} / ${image.rows}`;
        setAspectRatio(ratio);

        cornerstone.mouseInput.enable(element);
        cornerstone.mouseWheelInput.enable(element);
        cornerstone.pan.activate(element, 2); // Right click
        cornerstone.zoom.activate(element, 4); // Mouse wheel
      })
      .catch(console.error);

    return () => {
      cornerstone.disable(element);
    };
  }, [study.images]);

  const handleZoom = (factor: number) => {
    const element = cornerstoneElementRef.current;
    if (!element) return;
    const viewport = cornerstone.getViewport(element);
    viewport.scale *= factor;
    setZoomLevel(viewport.scale);
    cornerstone.setViewport(element, viewport);
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden transition-all duration-300">
      <div className="flex justify-between items-center p-3 border-b">
        <h3 className="text-base font-semibold">Vista previa del estudio</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={() => handleZoom(1.1)}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={() => handleZoom(0.9)}>
            <ZoomOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="bg-neutral-950 flex justify-center items-center p-4">
        <div
          ref={cornerstoneElementRef}
          className="bg-black rounded-lg shadow-lg border border-gray-700 w-full max-w-[600px] cursor-grab"
          style={{ aspectRatio }}
        />
      </div>
    </div>
  );
}