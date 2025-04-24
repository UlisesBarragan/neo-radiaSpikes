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
import { uploadToS3 } from "@/lib/S3Uploader";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
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

import { jsPDF } from "jspdf";

const exportCanvas = (format: "png" | "pdf") => {
  const canvas = document.querySelector("canvas") as HTMLCanvasElement;
  if (!canvas) {
    toast({
      title: "Error",
      description: "No se encontró el canvas a exportar.",
      variant: "destructive",
    });
    return;
  }

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

export default function UserView() {
  const { userId } = useParams();
  const [study, setStudy] = useState<Study | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFormat, setActiveFormat] = useState<"jpg" | "pdf">("jpg");
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [shareFormat, setShareFormat] = useState<"pdf" | "jpg">("pdf");

  useEffect(() => {
    document.title = "NeoRadia - Vista del estudio";
  }, []);

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

  const handleDownload = (format: "jpg" | "pdf") => {
    toast({
      title: `Descargando en formato ${format.toUpperCase()}`,
      description: "El archivo se descargará en breve",
    });
    if (format === "pdf") {
      window.open(study?.files.pdf, "_blank");
    } else if (format === "jpg") {
      study?.files.jpg.forEach((url) => window.open(url, "_blank"));
    }
  };

  const [shareEmailDialog, setShareEmailDialog] = useState(false);
  const [emailFormat, setEmailFormat] = useState<"pdf" | "png">("pdf");
  const [doctorEmail, setDoctorEmail] = useState("");

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground dark:bg-zinc-900 dark:text-white">
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
          <ThemeToggle />
          <Button variant="outline" size="sm" onClick={() => setShowShareDialog(true)}>
            <Share className="mr-2 h-4 w-4" />
            Compartir público (PDF/JPG)
          </Button>
          <Button variant="default" size="sm" onClick={() => setShareEmailDialog(true)}>
            <UserRound className="mr-2 h-4 w-4" />
            Compartir con doctor
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportCanvas("png")}>
            <Download className="mr-2 h-4 w-4" />
            Descargar PNG
          </Button>
          <Button variant="default" size="sm" onClick={() => exportCanvas("pdf")}>
            <Download className="mr-2 h-4 w-4" />
            Descargar PDF
          </Button>
        </div>
        </div>
      </header>

      <main className="container max-w-6xl mx-auto p-4 space-y-6">
        <SharedHistorySection history={mockSharedHistory} />
        <Card className="shadow-md dark:bg-zinc-800">
  <CardContent className="p-6 md:flex md:gap-8 md:items-start">
    {/* Información del estudio */}
    <div className="md:w-1/2 w-full space-y-2 text-sm">
      <h2 className="text-xl font-semibold mb-4">{study.description}</h2>
      <p><strong>Paciente:</strong> {study.patientName}</p>
      <p><strong>ID:</strong> {study.patientId}</p>
      <p><strong>Fecha:</strong> {new Date(study.studyDate).toLocaleDateString("es-ES")}</p>
      <p><strong>Modalidad:</strong> {study.modality}</p>
    </div>

    {/* Comentarios del médico */}
    <div className="md:w-1/2 w-full mt-6 md:mt-0">
      <DoctorComments comments={study.doctorComments} onReply={handleReply} />
    </div>
  </CardContent>
</Card>

        <StudyViewer
          study={study}
          activeFormat={activeFormat}
          setActiveFormat={(v) => setActiveFormat(v as "jpg" | "pdf")}
          onDownload={() => {}}
        />
      </main>


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
  onClick={() => {
    if (!whatsappNumber || whatsappNumber.length !== 10) {
      toast({
        title: "Número inválido",
        description: "Ingresa un número válido de 10 dígitos.",
        variant: "destructive",
      });
      return;
    }

    const link =
      shareFormat === "pdf"
        ? study?.files.pdf
        : study?.files.jpg?.[0] || "";

    const message = `Hola 👋, te comparto el estudio médico (${shareFormat.toUpperCase()}): ${link}`;
    const whatsappURL = `https://api.whatsapp.com/send?phone=52${whatsappNumber}&text=${encodeURIComponent(message)}`;

    window.open(whatsappURL, "_blank");

    toast({
      title: "Compartiendo...",
      description: `Abriendo WhatsApp con el enlace en formato ${shareFormat.toUpperCase()}`,
    });

    setShowShareDialog(false);
  }}
>
  Enviar por WhatsApp
</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      <Dialog open={shareEmailDialog} onOpenChange={setShareEmailDialog}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Compartir estudio por correo</DialogTitle>
    </DialogHeader>

    <div className="space-y-3">
      <Input
        type="email"
        placeholder="Correo del doctor"
        value={doctorEmail}
        onChange={(e) => setDoctorEmail(e.target.value)}
      />
      <div className="space-y-3">
  
  <div className="flex gap-2">
    <Button
      variant={emailFormat === "png" ? "default" : "outline"}
      onClick={() => setEmailFormat("png")}
    >
      PNG
    </Button>
    <Button
      variant={emailFormat === "pdf" ? "default" : "outline"}
      onClick={() => setEmailFormat("pdf")}
    >
      PDF
    </Button>
  </div>
</div>
    </div>

    <DialogFooter className="pt-4">
    <Button
  onClick={() => {
    if (!doctorEmail.includes("@")) {
      toast({
        title: "Correo inválido",
        description: "Ingresa un correo electrónico válido.",
        variant: "destructive",
      });
      return;
    }

    const fileUrl =
      shareFormat === "pdf"
        ? study?.files.pdf
        : study?.files.jpg?.[0] || "";

    const mailSubject = `Estudio médico del paciente ${study?.patientName}`;
    const mailBody = `Hola doctor,\n\nAquí está el estudio médico del paciente ${study?.patientName} (${shareFormat.toUpperCase()}):\n\n${fileUrl}\n\nSaludos.`;

    const mailtoLink = `mailto:${doctorEmail}?subject=${encodeURIComponent(
      mailSubject
    )}&body=${encodeURIComponent(mailBody)}`;

    window.open(mailtoLink, "_blank");

    toast({
      title: "Correo preparado",
      description: "Se ha abierto tu app de correo con el estudio listo para enviar.",
    });

    setShareEmailDialog(false);
    setDoctorEmail("");
  }}
>
  Enviar estudio
</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
    </div>
  );
}
