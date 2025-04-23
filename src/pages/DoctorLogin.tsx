
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";

export default function DoctorLogin() {
  const [doctorId, setDoctorId] = useState("");
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingrese un ID válido",
        variant: "destructive",
      });
      return;
    }
    
    // En una aplicación real, validaríamos el ID contra una base de datos
    // Por ahora, solo simulamos el acceso
    navigate(`/admin`);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[350px] shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-primary">NeoRadia - Acceso Médico</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="doctorId" className="text-sm font-medium">
                Ingrese su cédula o ID de médico
              </label>
              <Input
                id="doctorId"
                type="text"
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                placeholder="Ejemplo: M12345"
              />
            </div>
            <Button type="submit" className="w-full">
              Acceder como médico
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm text-muted-foreground">
          Acceda para ver y gestionar estudios médicos
        </CardFooter>
      </Card>
    </div>
  );
}
