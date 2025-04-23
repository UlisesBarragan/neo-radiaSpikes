import React, { useState, useEffect } from "react";
import DicomViewer from "@/components/DicomViewer";
import { toast } from "@/hooks/use-toast";

interface Study {
  id: string;
  patientName: string;
  patientId: string;
  studyDate: string;
  modality: string;
  description: string;
  images: string[];
}

export default function Index() {
  const [currentStudy, setCurrentStudy] = useState<Study | null>(null);

  useEffect(() => {
    // Estudio real usando imagen DICOM desde S3
    const mockStudies = [
      {
        id: "1",
        patientName: "Juan Pérez",
        patientId: "P12345",
        studyDate: "2024-04-02",
        modality: "CT",
        description: "Tomografía desde S3",
        images: [
          "https://neoradia.s3.us-east-2.amazonaws.com/IMG_20240402_1_1.dcm"
        ],
      },
    ];

    setCurrentStudy(mockStudies[0]);
  }, []);

  const handleShareStudy = () => {
    const shareLink = `https://neoradia.com/share/${currentStudy?.id}?token=abc123`;

    navigator.clipboard
      .writeText(shareLink)
      .then(() => {
        toast({
          title: "Enlace copiado",
          description: "El enlace para compartir ha sido copiado al portapapeles",
        });
      })
      .catch(() => {
        toast({
          title: "Error",
          description: "No se pudo copiar el enlace",
          variant: "destructive",
        });
      });
  };

  const handleExportImage = (format: string) => {
    toast({
      title: `Exportando como ${format.toUpperCase()}`,
      description: "El archivo se descargará en breve",
    });
    // Lógica de exportación (a implementar si deseas)
  };

  return (
    <main className="flex flex-col h-screen bg-background">
<<<<<<< HEAD
      {/* Header */}

=======
>>>>>>> 381209d56be8821d70248d0c05b70b283619d88b
      <div className="flex-1 overflow-hidden flex">
        <div className="flex-1 overflow-hidden">
          {currentStudy ? (
            <DicomViewer study={currentStudy} />
          ) : (
            <div className="flex justify-center items-center h-full bg-accent/20">
              <p className="text-muted-foreground">{"Cargando estudio..."}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}