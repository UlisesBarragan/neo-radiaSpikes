import React, { useEffect, useRef } from "react";
import cornerstone from "cornerstone-core";
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader";
import dicomParser from "dicom-parser";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { Study } from "@/types/study";

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
  activeFormat,
  setActiveFormat,
  onDownload,
}: Props) {
  const cornerstoneElementRef = useRef<HTMLDivElement>(null);

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
      })
      .catch(console.error);

    return () => {
      cornerstone.disable(element);
    };
  }, [study.images]);

  const exportAsPNG = () => {
    const canvas = cornerstoneElementRef.current?.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) return;

    const imgData = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = "estudio.png";
    link.href = imgData;
    link.click();
  };

  const exportAsPDF = () => {
    const canvas = cornerstoneElementRef.current?.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) return;

    const imgData = canvas.toDataURL("image/jpeg", 1.0);
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "px",
      format: [canvas.width, canvas.height],
    });

    pdf.addImage(imgData, "JPEG", 0, 0, canvas.width, canvas.height);
    pdf.save("estudio.pdf");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Visualización del Estudio</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={exportAsPNG}
          >
            <Download className="mr-1 h-4 w-4" />
            Exportar como PNG
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={exportAsPDF}
          >
            <Download className="mr-1 h-4 w-4" />
            Exportar como PDF
          </Button>
        </div>
      </div>

      <div
        ref={cornerstoneElementRef}
        className="w-full max-w-[800px] mx-auto h-[800px] bg-black rounded shadow-md"
      />
    </div>
  );
}