
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function UserLogin() {
  const [userId, setUserId] = useState("");
  const navigate = useNavigate();

  const handleUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId.trim()) {
      toast({
        title: "Error",
        description: "Por favor ingrese un ID válido",
        variant: "destructive",
      });
      return;
    }
    
    // En una aplicación real, validaríamos el ID contra una base de datos
    // Por ahora, solo simulamos el acceso
    navigate(`/user-view/${userId}`);
  };

  const handleDoctorRedirect = () => {
    navigate('/doctor-login');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-[400px] shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl text-primary">NeoRadia</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="patient" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="patient">Paciente</TabsTrigger>
              <TabsTrigger value="doctor">Médico</TabsTrigger>
            </TabsList>
            
            <TabsContent value="patient" className="space-y-4">
              <form onSubmit={handleUserSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="userId" className="text-sm font-medium">
                    Ingrese su ID de paciente
                  </label>
                  <Input
                    id="userId"
                    type="text"
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="Ejemplo: P12345"
                  />
                </div>
                <Button type="submit" className="w-full">
                  Acceder como paciente
                </Button>
              </form>
              <p className="text-sm text-muted-foreground text-center">
                Acceda para ver sus estudios y resultados médicos
              </p>
            </TabsContent>
            
            <TabsContent value="doctor" className="space-y-4">
              <div className="space-y-4">
                <p className="text-sm">
                  Para acceder como médico, por favor ingrese sus credenciales en la página de acceso médico.
                </p>
                <Button onClick={handleDoctorRedirect} className="w-full">
                  Ir a acceso médico
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
