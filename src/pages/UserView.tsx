import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  UserRound,
  Share,
  Download,
} from "lucide-react";
import SharedHistorySection from "@/components/SharedHistory";
import DoctorComments from "@/components/DoctorComments";
import StudyViewer from "@/components/StudyViewer";
import type { Study, SharedHistory } from "@/types/study";
import { Card, CardContent } from "@/components/ui/card";
import { jsPDF } from "jspdf";

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
];

export default function UserView() {
  const { userId } = useParams();
  const [study, setStudy] = useState<Study | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFormat, setActiveFormat] = useState<"jpg" | "pdf">("jpg");
  const [shareOpen, setShareOpen] = useState(false);
  const [contact, setContact] = useState("");

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
              {
                text: "Gracias doctor. Tomaré en cuenta la recomendación.",
                date: "2024-03-21",
              },
            ],
            date: "2024-03-20",
          },
        ],
        files: {
          pdf: "https://neoradia.s3.us-east-2.amazonaws.com/reportes/estudio-1.pdf",
          jpg: [
            "https://neoradia.s3.us-east-2.amazonaws.com/jpgs/estudio1_1.jpg",
            "https://neoradia.s3.us-east-2.amazonaws.com/jpgs/estudio1_2.jpg",
          ],
        },
        images: [
          "https://neoradia.s3.us-east-2.amazonaws.com/IMG_20240402_1_1.dcm",
        ],
      };
      setStudy(mockStudy);
      setIsLoading(false);
    }, 1000);
  }, [userId]);

  const exportCanvas = (format: "png" | "pdf") => {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) return;

    const dataURL = canvas.toDataURL(
      format === "png" ? "image/png" : "image/jpeg",
      1.0
    );

    if (format === "png") {
      const link = document.createElement("a");
      link.href = dataURL;
      link.download = "estudio.png";
      link.click();
    } else {
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: [canvas.width, canvas.height],
      });
      pdf.addImage(dataURL, "JPEG", 0, 0, canvas.width, canvas.height);
      pdf.save("estudio.pdf");
    }

    toast({
      title: `Exportado como ${format.toUpperCase()}`,
      description: "El archivo se descargó correctamente.",
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
        <p className="text-muted-foreground">
          No se encontró ningún estudio para este ID.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border shadow-sm px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-primary">NeoRadia</h1>
          <div className="flex items-center gap-3">
            <Button variant="secondary" size="sm" onClick={() => setShareOpen(true)}>
              <UserRound className="mr-2 h-4 w-4" /> Compartir con médico
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportCanvas("png")}>
              <Download className="mr-2 h-4 w-4" /> Exportar PNG
            </Button>
            <Button variant="default" size="sm" onClick={() => exportCanvas("pdf")}>
              <Download className="mr-2 h-4 w-4" /> Exportar PDF
            </Button>
          </div>
        </div>
      </header>

      <div className="container max-w-6xl mx-auto p-4 space-y-6">
        <Card>
          <CardContent className="p-6 grid gap-6 md:grid-cols-2">
            <div>
              <h2 className="text-xl font-semibold mb-4">{study.description}</h2>
              <div className="space-y-2">
                <p>
                  <span className="font-medium">Paciente:</span> {study.patientName}
                </p>
                <p>
                  <span className="font-medium">ID:</span> {study.patientId}
                </p>
                <p>
                  <span className="font-medium">Fecha:</span>{" "}
                  {new Date(study.studyDate).toLocaleDateString("es-ES")}
                </p>
                <p>
                  <span className="font-medium">Modalidad:</span> {study.modality}
                </p>
              </div>
            </div>
            <DoctorComments
              comments={study.doctorComments}
              onReply={handleReply}
            />
          </CardContent>
        </Card>

        <StudyViewer
          study={study}
          activeFormat={activeFormat}
          setActiveFormat={(v) => setActiveFormat(v as "jpg" | "pdf")}
          onDownload={() => {}}
        />

        <SharedHistorySection history={mockSharedHistory} />
      </div>

      {/* Modal para compartir con médico */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartir estudio con médico</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Ingresa el correo o número telefónico del médico.
            </p>
            <Input
              placeholder="ej: doctor@email.com o +541112345678"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
            />
          </div>
          <DialogFooter className="mt-4">
            <Button
              onClick={() => {
                setShareOpen(false);
                toast({
                  title: "Estudio compartido",
                  description: `Se ha compartido con: ${contact}`,
                });
                setContact("");
              }}
            >
              Compartir ahora
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}