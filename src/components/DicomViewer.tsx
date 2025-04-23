"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import cornerstone from "cornerstone-core"
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader"
import dicomParser from "dicom-parser"
import jsPDF from "jspdf"
import { ZoomIn, ZoomOut, RotateCw, Move, Pencil, Type, Maximize, Minimize, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent } from "@/components/ui/card"

cornerstoneWADOImageLoader.external.cornerstone = cornerstone
cornerstoneWADOImageLoader.external.dicomParser = dicomParser
cornerstoneWADOImageLoader.configure({ useWebWorkers: true })

interface Study {
  id: string
  patientName: string
  patientId: string
  modality: string
  description: string
  studyDate: string
  images: string[]
}

interface DicomViewerProps {
  study: Study
}

export default function DicomViewer({ study }: DicomViewerProps) {
  const cornerstoneElementRef = useRef<HTMLDivElement>(null)
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [windowLevel, setWindowLevel] = useState(50)
  const [windowWidth, setWindowWidth] = useState(50)
  const [doctorComment, setDoctorComment] = useState("")
  const [comments, setComments] = useState<{ text: string; date: string }[]>([])
  const [activeTool, setActiveTool] = useState("move")
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Inicializar Cornerstone
  useEffect(() => {
    if (!study || !cornerstoneElementRef.current) return

    const element = cornerstoneElementRef.current
    cornerstone.enable(element)

    const imageId = `wadouri:${study.images[currentImageIndex]}`
    cornerstone
      .loadImage(imageId)
      .then((image) => {
        const viewport = cornerstone.getDefaultViewportForImage(element, image)
        viewport.scale = zoom
        viewport.rotation = rotation
        viewport.voi = {
          windowWidth: windowWidth * 2,
          windowCenter: windowLevel * 2 - 100,
        }

        cornerstone.displayImage(element, image, viewport)
      })
      .catch(console.error)

    return () => {
      cornerstone.disable(element)
    }
  }, [study, currentImageIndex, zoom, rotation, windowLevel, windowWidth])

  // Ajustar el tamaño del canvas de anotaciones al tamaño del canvas de Cornerstone
  useEffect(() => {
    const resizeCanvas = () => {
      const baseCanvas = cornerstoneElementRef.current?.querySelector("canvas")
      const annotationCanvas = annotationCanvasRef.current

      if (baseCanvas && annotationCanvas) {
        annotationCanvas.width = baseCanvas.width
        annotationCanvas.height = baseCanvas.height
      }
    }

    // Ejecutar una vez al inicio
    setTimeout(resizeCanvas, 500)

    // Configurar un observador de mutaciones para detectar cambios en el canvas
    const observer = new MutationObserver(resizeCanvas)
    const element = cornerstoneElementRef.current

    if (element) {
      observer.observe(element, { childList: true, subtree: true })
    }

    // Manejar cambios de tamaño de ventana
    const handleResize = () => {
      setTimeout(resizeCanvas, 100)
    }
    window.addEventListener("resize", handleResize)

    return () => {
      observer.disconnect()
      window.removeEventListener("resize", handleResize)
    }
  }, [cornerstoneElementRef.current, isFullscreen])

  // Funciones de dibujo
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== "draw" && activeTool !== "text") return

    const canvas = annotationCanvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)
    setIsDrawing(true)
    setLastPosition({ x, y })

    if (activeTool === "text") {
      const ctx = canvas.getContext("2d")
      if (ctx) {
        const text = prompt("Ingrese el texto para la anotación:", "")
        if (text) {
          ctx.font = "16px Arial"
          ctx.fillStyle = "#FF0000"
          ctx.fillText(text, x, y)
        }
      }
      setIsDrawing(false)
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTool !== "draw") return

    const canvas = annotationCanvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!ctx) return
    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)
    ctx.beginPath()
    ctx.strokeStyle = "#FF0000"
    ctx.lineWidth = 2
    ctx.moveTo(lastPosition.x, lastPosition.y)
    ctx.lineTo(x, y)
    ctx.stroke()
    setLastPosition({ x, y })
  }

  const stopDrawing = () => setIsDrawing(false)

  // Funciones de manipulación de imagen
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.1, 3))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.1, 0.5))
  const handleRotateClockwise = () => setRotation((prev) => prev + 90)
  const handleRotateCounterClockwise = () => setRotation((prev) => prev - 90)

  const handleResetView = () => {
    setZoom(1)
    setRotation(0)
    setWindowLevel(50)
    setWindowWidth(50)
  }

  const handleClearAnnotations = () => {
    const canvas = annotationCanvasRef.current
    const ctx = canvas?.getContext("2d")
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  // Función para alternar pantalla completa
  const toggleFullscreen = () => {
    if (!containerRef.current) return

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
    setIsFullscreen(!isFullscreen)
  }

  // Detectar cambios en el estado de pantalla completa
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange)
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [])

  // Exportación de imágenes
  const exportCanvas = () => {
    const baseCanvas = cornerstoneElementRef.current?.querySelector("canvas")
    const annotationCanvas = annotationCanvasRef.current
    if (!baseCanvas || !annotationCanvas) return null
    const merged = document.createElement("canvas")
    merged.width = baseCanvas.width
    merged.height = baseCanvas.height
    const ctx = merged.getContext("2d")
    if (!ctx) return null
    ctx.drawImage(baseCanvas, 0, 0)
    ctx.drawImage(annotationCanvas, 0, 0)
    return merged
  }

  const exportAs = (format: "jpg" | "png" | "pdf") => {
    const merged = exportCanvas()
    if (!merged) return alert("No se pudo generar la imagen.")
    const dataUrl = merged.toDataURL(format === "pdf" ? "image/jpeg" : `image/${format}`)
    if (format === "pdf") {
      const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: [merged.width, merged.height] })
      pdf.addImage(dataUrl, "JPEG", 0, 0, merged.width, merged.height)
      pdf.save("imagen_dicom.pdf")
    } else {
      const link = document.createElement("a")
      link.href = dataUrl
      link.download = `imagen_dicom.${format}`
      link.click()
    }
  }

  // Manejo de comentarios
  const handleAddComment = () => {
    if (doctorComment.trim()) {
      setComments([
        ...comments,
        {
          text: doctorComment,
          date: new Date().toLocaleDateString(),
        },
      ])
      setDoctorComment("")
    }
  }

  // Cambiar herramienta activa
  const handleToolChange = (tool: string) => {
    setActiveTool(tool)
  }

  if (!study) return null

  return (
    <div className="flex flex-col w-full h-full bg-white" ref={containerRef}>
      {/* Contenido principal con diseño de tres columnas */}
      {/* Header superior con botones de exportación */}
      <div className="px-6 py-4 bg-white border-b shadow-sm flex justify-between items-center">
        <div>
          <h1 className="text-xl font-semibold text-blue-700">NeoRadia</h1>
          <p className="text-sm text-gray-500">
            {study.patientName} | {study.patientId} | {study.modality}: {study.description}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleClearAnnotations}>🧹 Limpiar</Button>
          <Button variant="outline" size="sm" onClick={() => exportAs("jpg")}>🖼 JPG</Button>
          <Button variant="outline" size="sm" onClick={() => exportAs("png")}>📷 PNG</Button>
          <Button variant="default" size="sm" onClick={() => exportAs("pdf")}>📄 PDF</Button>
        </div>
      </div>
      <div className={`grid grid-cols-1 md:grid-cols-12 gap-4 p-4 h-full ${isFullscreen ? "fullscreen-mode" : ""}`}>
        {/* Columna izquierda - Miniaturas (una sola columna) */}
        <div className="md:col-span-2 bg-white border rounded-lg p-4 flex flex-col h-full">
          <h3 className="text-sm font-medium mb-4">Imágenes del estudio</h3>
          <div className="space-y-2">
            {/* Solo mostramos una miniatura como solicitaste */}
            <div
              className="relative cursor-pointer rounded-md overflow-hidden border-2 border-blue-500"
              onClick={() => setCurrentImageIndex(0)}
            >
              <div className="absolute top-1 left-1 bg-white/80 rounded-full w-5 h-5 flex items-center justify-center text-xs font-medium">
                1
              </div>
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                <img
                  src="/placeholder.svg?height=150&width=150"
                  alt="Imagen 1"
                  className="w-full h-auto object-contain"
                />
              </div>
            </div>
          </div>

          <div className="mt-auto pt-4">
            <div className="space-y-2">
              <label className="flex justify-between text-sm">
                <span>Nivel de ventana</span>
                <span className="font-medium">{windowLevel}%</span>
              </label>
              <Slider value={[windowLevel]} min={0} max={100} step={1} onValueChange={(v) => setWindowLevel(v[0])} />
            </div>
            <div className="space-y-2 mt-2">
              <label className="flex justify-between text-sm">
                <span>Ancho de ventana</span>
                <span className="font-medium">{windowWidth}%</span>
              </label>
              <Slider value={[windowWidth]} min={0} max={100} step={1} onValueChange={(v) => setWindowWidth(v[0])} />
            </div>
          </div>
        </div>

        {/* Columna central - Imagen principal */}
        <div className="md:col-span-6 flex flex-col h-full">
          <div className="relative rounded-lg border bg-black flex-1" style={{ minHeight: "400px" }}>
            <div ref={cornerstoneElementRef} className="w-full h-full rounded-lg" />
            <canvas
              ref={annotationCanvasRef}
              className="absolute top-0 left-0 z-10 w-full h-full"
              style={{ cursor: activeTool === "draw" ? "crosshair" : activeTool === "text" ? "text" : "default" }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </div>
        </div>

        {/* Columna derecha - Herramientas y comentarios */}
        <div className="md:col-span-4 flex flex-col h-full">
          {/* Herramientas del médico */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <h3 className="text-sm font-medium mb-3">Herramientas</h3>
              <div className="grid grid-cols-4 gap-2 mb-4">
                <Button
                  variant={activeTool === "move" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToolChange("move")}
                  className="flex flex-col items-center justify-center h-16 px-1"
                >
                  <Move className="h-4 w-4 mb-1" />
                  <span className="text-xs">Mover</span>
                </Button>
                <Button
                  variant={activeTool === "draw" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToolChange("draw")}
                  className="flex flex-col items-center justify-center h-16 px-1"
                >
                  <Pencil className="h-4 w-4 mb-1" />
                  <span className="text-xs">Dibujar</span>
                </Button>
                <Button
                  variant={activeTool === "text" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleToolChange("text")}
                  className="flex flex-col items-center justify-center h-16 px-1"
                >
                  <Type className="h-4 w-4 mb-1" />
                  <span className="text-xs">Texto</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAnnotations}
                  className="flex flex-col items-center justify-center h-16 px-1"
                >
                  <Save className="h-4 w-4 mb-1" />
                  <span className="text-xs">Limpiar</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomIn}
                  className="flex flex-col items-center justify-center h-16 px-1"
                >
                  <ZoomIn className="h-4 w-4 mb-1" />
                  <span className="text-xs">Ampliar</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleZoomOut}
                  className="flex flex-col items-center justify-center h-16 px-1"
                >
                  <ZoomOut className="h-4 w-4 mb-1" />
                  <span className="text-xs">Reducir</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRotateClockwise}
                  className="flex flex-col items-center justify-center h-16 px-1"
                >
                  <RotateCw className="h-4 w-4 mb-1" />
                  <span className="text-xs">Rotar</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleFullscreen}
                  className="flex flex-col items-center justify-center h-16 px-1"
                >
                  {isFullscreen ? (
                    <>
                      <Minimize className="h-4 w-4 mb-1" />
                      <span className="text-xs">Salir</span>
                    </>
                  ) : (
                    <>
                      <Maximize className="h-4 w-4 mb-1" />
                      <span className="text-xs">Ampliar</span>
                    </>
                  )}
                </Button>
              </div>
              <div className="flex justify-between">
                <Button variant="outline" size="sm" onClick={() => exportAs("jpg")}>
                  JPG
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportAs("png")}>
                  PNG
                </Button>
                <Button variant="outline" size="sm" onClick={() => exportAs("pdf")}>
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={handleResetView}>
                  Restablecer
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Comentarios del médico */}
          <Card className="flex-1 flex flex-col">
            <CardContent className="p-4 flex flex-col h-full">
              <h3 className="text-lg font-medium mb-3">Comentarios del médico</h3>

              <div className="max-h-[200px] overflow-y-auto space-y-3 mb-4">
                {comments.length === 0 ? (
                  <p className="text-sm text-gray-500">No hay comentarios todavía.</p>
                ) : (
                  comments.map((comment, index) => (
                    <div key={index} className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm">{comment.text}</p>
                      <p className="text-xs text-gray-500 mt-1">Fecha: {comment.date}</p>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-2 mt-auto">
                <Textarea
                  placeholder="Escribe tu comentario médico aquí..."
                  value={doctorComment}
                  onChange={(e) => setDoctorComment(e.target.value)}
                  className="min-h-[100px] resize-none"
                />
                <Button className="w-full" onClick={handleAddComment} disabled={!doctorComment.trim()}>
                  Guardar comentario
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Información del paciente - Visible solo en modo pantalla completa */}
      {isFullscreen && (
        <div className="absolute bottom-4 right-4 bg-white/90 p-3 rounded-lg shadow-lg z-20">
          <h4 className="text-sm font-medium mb-2">Información del paciente</h4>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
            <span className="font-medium">Paciente:</span>
            <span>{study.patientName}</span>
            <span className="font-medium">ID:</span>
            <span>{study.patientId}</span>
            <span className="font-medium">Modalidad:</span>
            <span>{study.modality}</span>
            <span className="font-medium">Fecha:</span>
            <span>{study.studyDate}</span>
          </div>
        </div>
      )}

      <style>{`
        .fullscreen-mode {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 9999;
          background: white;
          padding: 20px;
        }
      `}</style>
    </div>
  )
}
