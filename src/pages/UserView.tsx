import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { UserRound, Share, Download } from "lucide-react";
import SharedHistorySection from "@/components/SharedHistory";
import DoctorComments from "@/components/DoctorComments";
import StudyViewer from "@/components/StudyViewer";
import type { Study, SharedHistory } from "@/types/study";
import { Card, CardContent } from "@/components/ui/card";

// Historial compartido de ejemplo
const mockSharedHistory: SharedHistory[] = [
  {
    id: "1",
    sharedWith: [
      { name: "Dr. Martín Díaz", email: "m.diazm@hospital.com" },
      { name: "Dra. María Pérez", email: "m.perez@mediclinic.com" },
    ],
    date: "2024-04-14",
    description: "Tomografía de tórax compartida con médico",
  },
  {
    id: "2",
    sharedWith: [
      { name: "Dr. Álvaro Castro", email: "dr.castro@hospital.com" },
    ],
    date: "2023-10-10",
    description: "Estudio MRI compartido con médico",
  },
];

export default function UserView() {
  const { userId } = useParams();
  const [study, setStudy] = useState<Study | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFormat, setActiveFormat] = useState<"jpg" | "pdf">("jpg");
  const [sharedWithDoctor, setSharedWithDoctor] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    setTimeout(() => {
      const mockStudy: Study = {
        id: "1",
        patientName: "Juan Pérez",
        patientId: userId || "P12345",
        studyDate: "2023-10-15",
        modality: "CT",
        description: "Tomografía de tórax",
        doctorComments: [
          {
            text: "El paciente muestra mejoría respecto al estudio anterior.",
            replies: [
              { text: "Gracias doctor. Tomaré en cuenta la recomendación.", date: "2024-03-21" },
            ],
            date: "2024-03-20",
          },
          {
            text: "No hay hallazgos significativos que requieran atención inmediata.",
            replies: [],
            date: "2024-03-20",
          },
          {
            text: "Recomiendo seguimiento en 6 meses.",
            replies: [],
            date: "2024-03-20",
          },
        ],
        files: {
          pdf: "/sample-report.pdf",
          jpg: ["/sample-image-1.jpg", "/sample-image-2.jpg"],
        },
      };
      setStudy(mockStudy);
      setIsLoading(false);
    }, 1000);
  }, [userId]);

  // Compartir general (solo PDF/JPG)
  const handleShare = () => {
    toast({
      title: "Solo puedes compartir imágenes o PDF al público general",
      description: "Selecciona si deseas compartir JPG o PDF",
    });
  };

  // Compartir con médico (aparece especial y solo el paciente puede hacerlo)
  const handleShareWithDoctor = () => {
    setSharedWithDoctor(true);
    toast({
      title: "Estudio compartido con el médico",
      description: "El médico ahora tiene acceso a tu estudio completo.",
    });
  };

  const handleDownload = (format: "jpg" | "pdf") => {
    toast({
      title: `Descargando en formato ${format.toUpperCase()}`,
      description: "El archivo se descargará en breve",
    });
  };

  const handleReply = (index: number, replyText: string) => {
    setStudy((prev) => {
      if (!prev) return prev;
      const updatedComments = [...prev.doctorComments];
      updatedComments[index].replies.push({
        text: replyText,
        date: new Date().toISOString().split("T")[0],
      });
      return { ...prev, doctorComments: updatedComments };
    });
    toast({
      title: "Respuesta enviada",
      description: "Tu respuesta ha sido enviada al médico",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">Cargando su estudio...</p>
      </div>
    );
  }

  if (!study) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <p className="text-muted-foreground">No se encontró ningún estudio para este ID.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">NeoRadia</h1>
          <div className="flex items-center gap-3">
            <Button
              variant={sharedWithDoctor ? "secondary" : "default"}
              size="sm"
              onClick={handleShareWithDoctor}
              disabled={sharedWithDoctor}
            >
              <UserRound className="mr-2 h-4 w-4" />
              {sharedWithDoctor ? "Compartido con médico" : "Compartir con médico"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share className="mr-2 h-4 w-4" />
              Compartir público (PDF/JPG)
            </Button>
            <Button variant="default" size="sm" onClick={() => handleDownload("pdf")}>
              <Download className="mr-2 h-4 w-4" />
              Descargar PDF
            </Button>
          </div>
        </div>
      </header>
      <div className="container max-w-6xl mx-auto p-4 space-y-6">
        <SharedHistorySection history={mockSharedHistory} />
        <Card>
          <CardContent className="p-6 grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-xl font-semibold mb-4">{study.description}</h2>
              <div className="space-y-2">
                <p><span className="font-medium">Paciente:</span> {study.patientName}</p>
                <p><span className="font-medium">ID:</span> {study.patientId}</p>
                <p><span className="font-medium">Fecha:</span> {new Date(study.studyDate).toLocaleDateString("es-ES")}</p>
                <p><span className="font-medium">Modalidad:</span> {study.modality}</p>
              </div>
            </div>
            <DoctorComments comments={study.doctorComments} onReply={handleReply} />
          </CardContent>
        </Card>
        <StudyViewer
          study={study}
          activeFormat={activeFormat}
          setActiveFormat={(v) => setActiveFormat(v as "jpg" | "pdf")}
          onDownload={handleDownload}
        />
      </div>
    </div>
  );
}
