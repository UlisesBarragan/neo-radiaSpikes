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
<<<<<<< HEAD
import { jsPDF } from "jspdf";
=======
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { uploadToS3 } from "@/lib/S3Uploader";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
>>>>>>> 8da7911 (intento de subida al bucket)

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
<<<<<<< HEAD
  const [shareOpen, setShareOpen] = useState(false);
  const [contact, setContact] = useState("");
=======
  const [sharedWithDoctor, setSharedWithDoctor] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [shareFormat, setShareFormat] = useState<"pdf" | "jpg">("pdf");
>>>>>>> 8da7911 (intento de subida al bucket)

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
<<<<<<< HEAD
          "https://neoradia.s3.us-east-2.amazonaws.com/IMG_20240402_1_1.dcm",
=======
          "https://neoradia.s3.us-east-2.amazonaws.com/IMG_20240402_1_1.dcm"
>>>>>>> 8da7911 (intento de subida al bucket)
        ],
      };
      setStudy(mockStudy);
      setIsLoading(false);
    }, 1000);
  }, [userId]);

<<<<<<< HEAD
  const exportCanvas = (format: "png" | "pdf") => {
    const canvas = document.querySelector("canvas") as HTMLCanvasElement;
    if (!canvas) return;

    const dataURL = canvas.toDataURL(
      format === "png" ? "image/png" : "image/jpeg",
      1.0
    );
=======
  const handleShareWithDoctor = () => {
    setSharedWithDoctor(true);
    toast({
      title: "Estudio compartido con el médico",
      description: "El médico ahora tiene acceso a tu estudio completo.",
    });
  };
>>>>>>> 8da7911 (intento de subida al bucket)

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
<<<<<<< HEAD
            <Button variant="outline" size="sm" onClick={() => exportCanvas("png")}>
              <Download className="mr-2 h-4 w-4" /> Exportar PNG
            </Button>
            <Button variant="default" size="sm" onClick={() => exportCanvas("pdf")}>
              <Download className="mr-2 h-4 w-4" /> Exportar PDF
=======
            <Button variant="outline" size="sm" onClick={() => setShowShareDialog(true)}>
              <Share className="mr-2 h-4 w-4" />
              Compartir público (PDF/JPG)
            </Button>
            <Button variant="default" size="sm" onClick={() => handleDownload("pdf")}> 
              <Download className="mr-2 h-4 w-4" />
              Descargar PDF
>>>>>>> 8da7911 (intento de subida al bucket)
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

<<<<<<< HEAD
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
=======
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartir por WhatsApp</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <Input
              type="tel"
              placeholder="Número a 10 dígitos (sin +52)"
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value)}
            />

            <div className="flex gap-2">
              <Button
                variant={shareFormat === "jpg" ? "default" : "outline"}
                onClick={() => setShareFormat("jpg")}
              >
                JPG
              </Button>
              <Button
                variant={shareFormat === "pdf" ? "default" : "outline"}
                onClick={() => setShareFormat("pdf")}
              >
                PDF
              </Button>
            </div>
          </div>

          <DialogFooter className="pt-4">
          <Button
  onClick={async () => {
    if (!whatsappNumber || whatsappNumber.length !== 10) {
      toast({
        title: "Número inválido",
        description: "Ingresa un número válido de 10 dígitos.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(
        shareFormat === "pdf" ? study?.files.pdf || "" : study?.files.jpg?.[0] || ""
      );
      const blob = await response.blob();

      const file = new File(
        [blob],
        `estudio-${study?.patientId}.${shareFormat}`,
        { type: blob.type }
      );

      // Sube a S3
      const uploadedUrl = await uploadToS3(file, file.name);

      // Prepara mensaje para WhatsApp
      const message = `Hola 👋, te comparto el estudio médico (${shareFormat.toUpperCase()}): ${uploadedUrl}`;
      const whatsappURL = `https://api.whatsapp.com/send?phone=52${whatsappNumber}&text=${encodeURIComponent(message)}`;
      window.open(whatsappURL, "_blank");

      toast({
        title: "Archivo compartido",
        description: `Se ha subido y enviado el estudio vía WhatsApp.`,
      });

      setShowShareDialog(false);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error al subir o enviar",
        description: "No se pudo compartir el archivo.",
        variant: "destructive",
      });
    }
  }}
>
  Enviar por WhatsApp
</Button>
>>>>>>> 8da7911 (intento de subida al bucket)
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}