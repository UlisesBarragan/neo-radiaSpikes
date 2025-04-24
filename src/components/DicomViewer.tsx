import type React from "react"

import { useState, useRef, useEffect } from "react"
import cornerstone from "cornerstone-core"
import cornerstoneWADOImageLoader from "cornerstone-wado-image-loader"
import dicomParser from "dicom-parser"
import jsPDF from "jspdf"
import {
  ZoomIn,
  ZoomOut,
  RotateCw,
  Move,
  Pencil,
  Type,
  Ruler,
  Trash2,
  Info,
  MessageSquare,
  Download,
  Sun,
  Moon,
  RotateCcw,
  RefreshCw,
  Maximize,
  Minimize,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

// Configuración inicial de Cornerstone
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
  pixelSpacing?: number
}

interface DicomViewerProps {
  study: Study
}

interface Point {
  x: number
  y: number
}

interface Measurement {
  start: Point
  end: Point
  distance: number
  distanceMm: number
}

interface Annotation {
  type: "draw" | "text"
  points: Point[]
  text?: string
  color: string
}

interface PanelState {
  tools: boolean
  adjustments: boolean
  info: boolean
  comments: boolean
}

export default function DicomViewer({ study }: DicomViewerProps) {
  // Referencias
  const cornerstoneElementRef = useRef<HTMLDivElement>(null)
  const annotationCanvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Estados de la imagen
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [zoom, setZoom] = useState<number | null>(null)
  const [rotation, setRotation] = useState(0)
  const [brightness, setBrightness] = useState(0)
  const [contrast, setContrast] = useState(0)
  const [pixelSpacing, setPixelSpacing] = useState(0.2)
  const [defaultVOI, setDefaultVOI] = useState<{ windowWidth: number; windowCenter: number } | null>(null)
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 })
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [filters, setFilters] = useState({
    red: 0,       // Canal rojo (0-200%)
    green: 100,     // Canal verde (0-200%)
    blue: 0,      // Canal azul (0-200%)
  });

  // Estados de paneles plegables
  const [expandedPanels, setExpandedPanels] = useState<PanelState>({
    tools: true,
    adjustments: false,
    info: false,
    comments: false,
  })

  // Estados de herramientas
  const [activeTool, setActiveTool] = useState("move")
  const [isDrawing, setIsDrawing] = useState(false)
  const [lastPosition, setLastPosition] = useState<Point>({ x: 0, y: 0 })

  // Estados de anotaciones y mediciones
  const [measurements, setMeasurements] = useState<Measurement[]>([])
  const [currentMeasurement, setCurrentMeasurement] = useState<{ start: Point | null; end: Point | null }>({
    start: null,
    end: null,
  })
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [currentAnnotation, setCurrentAnnotation] = useState<Annotation | null>(null)

  // Estados de comentarios
  const [doctorComment, setDoctorComment] = useState("")
  const [comments, setComments] = useState<{ text: string; date: string }[]>([])

  // Función para alternar paneles
  const togglePanel = (panel: keyof PanelState) => {
    setExpandedPanels((prev) => ({
      ...prev,
      [panel]: !prev[panel],
    }))
  }

  useEffect(() => {
    drawAnnotations();
  }, [annotations, measurements, currentAnnotation, currentMeasurement]);

  // Configurar tamaño del canvas de anotaciones cuando cambia el tamaño del viewport
  useEffect(() => {
    const updateCanvasSize = () => {
      const element = cornerstoneElementRef.current
      const canvas = annotationCanvasRef.current
      if (!element || !canvas) return

      const dicomCanvas = element.querySelector("canvas")
      if (!dicomCanvas) return

      // Obtener dimensiones del canvas de cornerstone
      const width = dicomCanvas.width
      const height = dicomCanvas.height

      // Actualizar el canvas de anotaciones para que coincida
      canvas.width = width
      canvas.height = height
      setViewportSize({ width, height })

      // Redibujar anotaciones con el nuevo tamaño
      drawAnnotations()
    }

    // Establecer observador de mutación para detectar cambios en el canvas de cornerstone
    const observer = new MutationObserver(updateCanvasSize)
    const element = cornerstoneElementRef.current

    if (element) {
      observer.observe(element, {
        childList: true,
        subtree: true,
        attributes: true,
      })

      // Configuración inicial
      updateCanvasSize()
    }

    return () => {
      observer.disconnect()
    }
  }, [cornerstoneElementRef.current, annotationCanvasRef.current])

  // Cargar imagen DICOM con valores originales
  // 1. Primero, modifica el useEffect que controla el renderizado de la imagen DICOM

  useEffect(() => {
    if (!study || !cornerstoneElementRef.current) return

    const element = cornerstoneElementRef.current
    cornerstone.enable(element)

    const imageId = `wadouri:${study.images[currentImageIndex]}`

    cornerstone
      .loadImage(imageId)
      .then((image) => {
        const viewport = cornerstone.getDefaultViewportForImage(element, image)

        // Usar el zoom predeterminado de la imagen solo la primera vez
        if (zoom === null) {
          setZoom(viewport.scale)
        } else {
          viewport.scale = zoom
        }

        // Guardar los valores originales de la imagen
        if (!defaultVOI) {
          setDefaultVOI({
            windowWidth: viewport.voi.windowWidth,
            windowCenter: viewport.voi.windowCenter,
          })
        }

        // Aplicar transformaciones actuales
        viewport.rotation = rotation

        // Aplicar ajustes de brillo/contraste si existen
        if (brightness !== 0 || (contrast !== 0 && defaultVOI)) {
          viewport.voi.windowWidth = defaultVOI.windowWidth * (1 + contrast / 100)
          viewport.voi.windowCenter = defaultVOI.windowCenter + brightness
        }

        // AÑADIR ESTO: Aplicar filtros de color mediante la API de Cornerstone
        viewport.colormap = undefined; // Resetea cualquier mapa de color previo

        // Crear una función de renderizado personalizada para aplicar filtros CSS
        const enabledElement = cornerstone.getEnabledElement(element);
        if (enabledElement && enabledElement.canvas) {
          // Aplicar filtros CSS al canvas
          const filterString = `hue-rotate(${filters.red}deg) saturate(${filters.green}%) sepia(${filters.blue}%)`;
          enabledElement.canvas.style.filter = filterString;
        }

        cornerstone.displayImage(element, image, viewport)

        // Obtener espaciado de píxeles si está disponible
        const imageMetadata = cornerstone.metaData.get("imagePlaneModule", imageId)
        if (imageMetadata?.rowPixelSpacing) {
          setPixelSpacing(imageMetadata.rowPixelSpacing)
        } else if (study.pixelSpacing) {
          setPixelSpacing(study.pixelSpacing)
        }

        // Actualizar tamaño del canvas de anotaciones
        const canvas = annotationCanvasRef.current
        const dicomCanvas = element.querySelector("canvas")
        if (canvas && dicomCanvas) {
          canvas.width = dicomCanvas.width
          canvas.height = dicomCanvas.height
          setViewportSize({ width: dicomCanvas.width, height: dicomCanvas.height })
          drawAnnotations()
        }
      })
      .catch(console.error)

    return () => {
      cornerstone.disable(element)
    }
  }, [study, currentImageIndex, zoom, rotation, brightness, contrast, filters]) // Añadir filters a las dependencias

  // Redimensionar el canvas cuando cambie el tamaño de la ventana
  useEffect(() => {
    const handleResize = () => {
      if (cornerstoneElementRef.current) {
        cornerstone.resize(cornerstoneElementRef.current)
      }
    }

    window.addEventListener("resize", handleResize)
    return () => {
      window.removeEventListener("resize", handleResize)
    }
  }, [])

  // Dibujar anotaciones y mediciones
  const drawAnnotations = () => {
    const canvas = annotationCanvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!ctx || !canvas) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Calcular el factor de escala para que las anotaciones se adapten al zoom
    const scaleFactor = zoom || 1

    // Dibujar anotaciones persistentes
    annotations.forEach((annotation) => {
      if (annotation.type === "draw" && annotation.points.length > 1) {
        ctx.beginPath()
        ctx.strokeStyle = annotation.color
        ctx.lineWidth = 2 / scaleFactor // Ajustar grosor según zoom
        ctx.moveTo(annotation.points[0].x, annotation.points[0].y)

        for (let i = 1; i < annotation.points.length; i++) {
          ctx.lineTo(annotation.points[i].x, annotation.points[i].y)
        }

        ctx.stroke()
      } else if (annotation.type === "text" && annotation.text) {
        ctx.fillStyle = annotation.color
        // Ajustar tamaño de fuente según zoom
        const fontSize = Math.max(12, 16 / scaleFactor)
        ctx.font = `${fontSize}px Arial`
        ctx.fillText(annotation.text, annotation.points[0].x, annotation.points[0].y)
      }
    })

    // Dibujar anotación en curso
    if (currentAnnotation) {
      if (currentAnnotation.type === "draw" && currentAnnotation.points.length > 1) {
        ctx.beginPath()
        ctx.strokeStyle = currentAnnotation.color
        ctx.lineWidth = 2 / scaleFactor
        ctx.moveTo(currentAnnotation.points[0].x, currentAnnotation.points[0].y)

        for (let i = 1; i < currentAnnotation.points.length; i++) {
          ctx.lineTo(currentAnnotation.points[i].x, currentAnnotation.points[i].y)
        }

        ctx.stroke()
      }
    }

    // Dibujar mediciones existentes
    measurements.forEach((measure) => {
      ctx.beginPath()
      ctx.moveTo(measure.start.x, measure.start.y)
      ctx.lineTo(measure.end.x, measure.end.y)
      ctx.strokeStyle = "#00FF00"
      ctx.lineWidth = 2 / scaleFactor
      ctx.stroke()

      const midX = (measure.start.x + measure.end.x) / 2
      const midY = (measure.start.y + measure.end.y) / 2
      ctx.fillStyle = "#00FF00"
      const fontSize = Math.max(10, 14 / scaleFactor)
      ctx.font = `${fontSize}px Arial`
      ctx.fillText(`${measure.distanceMm.toFixed(2)} mm`, midX + 5 / scaleFactor, midY - 5 / scaleFactor)
    })

    // Dibujar medición en curso
    if (currentMeasurement.start && currentMeasurement.end) {
      ctx.beginPath()
      ctx.moveTo(currentMeasurement.start.x, currentMeasurement.start.y)
      ctx.lineTo(currentMeasurement.end.x, currentMeasurement.end.y)
      ctx.strokeStyle = "#00FF00"
      ctx.lineWidth = 2 / scaleFactor
      ctx.setLineDash([5, 5])
      ctx.stroke()
      ctx.setLineDash([])

      const distancePx = Math.sqrt(
        Math.pow(currentMeasurement.end.x - currentMeasurement.start.x, 2) +
        Math.pow(currentMeasurement.end.y - currentMeasurement.start.y, 2),
      )
      const distanceMm = distancePx * pixelSpacing

      const midX = (currentMeasurement.start.x + currentMeasurement.end.x) / 2
      const midY = (currentMeasurement.start.y + currentMeasurement.end.y) / 2
      const fontSize = Math.max(10, 14 / scaleFactor)
      ctx.font = `${fontSize}px Arial`
      ctx.fillText(`${distanceMm.toFixed(2)} mm`, midX + 5 / scaleFactor, midY - 5 / scaleFactor)
    }
  }

  // Manejadores de herramientas
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = annotationCanvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)

    if (activeTool === "measure") {
      if (!currentMeasurement.start) {
        setCurrentMeasurement({ start: { x, y }, end: { x, y } })
      } else {
        const distancePx = Math.sqrt(
          Math.pow(x - currentMeasurement.start.x, 2) + Math.pow(y - currentMeasurement.start.y, 2),
        )
        const distanceMm = distancePx * pixelSpacing

        setMeasurements([
          ...measurements,
          {
            start: currentMeasurement.start,
            end: { x, y },
            distance: distancePx,
            distanceMm: distanceMm,
          },
        ])
        setCurrentMeasurement({ start: null, end: null })
      }
      return
    }

    if (activeTool === "draw") {
      setIsDrawing(true)
      setCurrentAnnotation({
        type: "draw",
        points: [{ x, y }],
        color: "#FF0000",
      })
      setLastPosition({ x, y })
    }

    if (activeTool === "text") {
      const text = prompt("Ingrese el texto para la anotación:", "")
      if (text) {
        setAnnotations([
          ...annotations,
          {
            type: "text",
            points: [{ x, y }],
            text: text,
            color: "#FF0000",
          },
        ])
        drawAnnotations()
      }
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing && activeTool !== "measure") return

    const canvas = annotationCanvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = (e.clientX - rect.left) * (canvas.width / rect.width)
    const y = (e.clientY - rect.top) * (canvas.height / rect.height)

    if (activeTool === "measure" && currentMeasurement.start) {
      setCurrentMeasurement((prev) => ({ ...prev, end: { x, y } }))
      drawAnnotations()
      return
    }

    if (activeTool === "draw" && isDrawing && currentAnnotation) {
      setCurrentAnnotation({
        ...currentAnnotation,
        points: [...currentAnnotation.points, { x, y }],
      })
      setLastPosition({ x, y })
      drawAnnotations()
    }
  }

  const stopDrawing = () => {
    if (activeTool === "draw" && currentAnnotation) {
      if (currentAnnotation.points.length > 1) {
        setAnnotations([...annotations, currentAnnotation])
      }
      setCurrentAnnotation(null)
    }
    setIsDrawing(false)
  }

  // Funciones de manipulación de imagen
  const handleZoomIn = () => {
    if (zoom !== null) {
      const newZoom = Math.min(zoom + zoom * 0.1, zoom * 3)
      setZoom(newZoom)
    }
  }

  const handleZoomOut = () => {
    if (zoom !== null) {
      const newZoom = Math.max(zoom - zoom * 0.1, zoom * 0.5)
      setZoom(newZoom)
    }
  }

  const handleRotateClockwise = () => setRotation((prev) => prev + 90)
  const handleRotateCounterClockwise = () => setRotation((prev) => prev - 90)

  const handleResetView = () => {
    // Recargar la imagen para obtener los valores originales
    if (cornerstoneElementRef.current) {
      const element = cornerstoneElementRef.current
      const imageId = `wadouri:${study.images[currentImageIndex]}`

      cornerstone
        .loadImage(imageId)
        .then((image) => {
          const viewport = cornerstone.getDefaultViewportForImage(element, image)
          setZoom(viewport.scale)
          setRotation(0)
          setBrightness(0)
          setContrast(0)

          setFilters({
            red: 0,
            green: 100,
            blue: 0,
            // Otros filtros que tengas
          })

          viewport.translation = { x: 0, y: 0 }
          cornerstone.displayImage(element, image, viewport)
        })
        .catch(console.error)
    }
  }

  const handleClearAnnotations = () => {
    setAnnotations([])
    setCurrentAnnotation(null)
    drawAnnotations()
  }

  const handleClearMeasurements = () => {
    setMeasurements([])
    setCurrentMeasurement({ start: null, end: null })
    drawAnnotations()
  }

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

  // Toggle fullscreen
  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)

    if (!isFullscreen) {
      const element = containerRef.current
      if (element?.requestFullscreen) {
        element.requestFullscreen()
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen()
      }
    }
  }

  // Toggle dark mode
  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
  }

  // Reset values when changing images
  useEffect(() => {
    // Al cambiar de imagen, usar los valores predeterminados de la nueva imagen
    setZoom(null) // Esto forzará a usar el zoom predeterminado
    setBrightness(0)
    setContrast(0)
  }, [currentImageIndex])

  if (!study) return null

  return (
    <div
      className={`flex flex-col w-full h-full ${isDarkMode ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"}`}
      ref={containerRef}
    >
      {/* Header superior con información básica y botones de exportación */}
      <div
        className={`px-6 py-3 ${isDarkMode ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"} border-b shadow-sm flex justify-between items-center`}
      >
        <div>
          <h1 className={`text-xl font-semibold ${isDarkMode ? "text-blue-400" : "text-blue-700"}`}>NeoRadia</h1>
          <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
            {study.patientName} | {study.patientId} | {study.modality}: {study.description}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center space-x-2 mr-2">
            <Switch id="dark-mode" checked={isDarkMode} onCheckedChange={toggleDarkMode} />
            <Label htmlFor="dark-mode" className="cursor-pointer">
              {isDarkMode ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            </Label>
          </div>

          <TooltipProvider>
            {/* Botón de Reset */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className={isDarkMode ?
                    "border-gray-500 hover:border-gray-400 bg-gray-800 hover:bg-gray-700 text-gray-100" :
                    "border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-800"
                  }
                  onClick={handleResetView}
                >
                  <RefreshCw className={`h-4 w-4 ${isDarkMode ? "text-white" : ""}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent className={isDarkMode ? "bg-gray-800 text-white border-gray-600" : ""}>
                Restablecer vista
              </TooltipContent>
            </Tooltip>


            {/* Grupo de botones de exportación */}
            <div className="flex gap-1">
              {/* Botón JPG */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={isDarkMode ?
                      "border-gray-500 hover:border-gray-400 bg-gray-800 hover:bg-gray-700 text-gray-100" :
                      "border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-800"
                    }
                    onClick={() => exportAs("jpg")}
                  >
                    <Download className={`h-4 w-4 mr-1 ${isDarkMode ? "text-white" : ""}`} />
                    JPG
                  </Button>
                </TooltipTrigger>
                <TooltipContent className={isDarkMode ? "bg-gray-800 text-white border-gray-600" : ""}>
                  Exportar como JPG
                </TooltipContent>
              </Tooltip>

              {/* Botón PNG */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={isDarkMode ?
                      "border-gray-500 hover:border-gray-400 bg-gray-800 hover:bg-gray-700 text-gray-100" :
                      "border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-800"
                    }
                    onClick={() => exportAs("png")}
                  >
                    <Download className={`h-4 w-4 mr-1 ${isDarkMode ? "text-white" : ""}`} />
                    PNG
                  </Button>
                </TooltipTrigger>
                <TooltipContent className={isDarkMode ? "bg-gray-800 text-white border-gray-600" : ""}>
                  Exportar como PNG
                </TooltipContent>
              </Tooltip>

              {/* Botón PDF (destacado) */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className={isDarkMode ?
                      "border-gray-500 hover:border-gray-400 bg-gray-800 hover:bg-gray-700 text-gray-100" :
                      "border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 text-gray-800"
                    }
                    onClick={() => exportAs("pdf")}
                  >
                    <Download className={`h-4 w-4 mr-1 ${isDarkMode ? "text-white" : ""}`} />
                    PDF
                  </Button>
                </TooltipTrigger>
                <TooltipContent className={isDarkMode ? "bg-gray-800 text-white border-gray-600" : ""}>
                  Exportar como PDF
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-3 p-3 h-full">
        {/* Columna izquierda - Paneles con tabs */}
        <div className="col-span-3 flex flex-col h-full">
          <Card className={`shadow-sm h-full ${isDarkMode ? "bg-gray-800 border-gray-500" : ""}`}>
            <Tabs defaultValue="tools" className="h-full flex flex-col">
              <TabsList className={`w-full grid grid-cols-4 ${isDarkMode ? "bg-gray-700" : ""}`}>
                <TabsTrigger value="tools">
                  <span className="flex items-center">
                    <Pencil className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Herramientas</span>
                  </span>
                </TabsTrigger>
                <TabsTrigger value="adjustments">
                  <span className="flex items-center">
                    <ZoomIn className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Ajustes</span>
                  </span>
                </TabsTrigger>
                <TabsTrigger value="info">
                  <span className="flex items-center">
                    <Info className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Info</span>
                  </span>
                </TabsTrigger>
                <TabsTrigger value="comments">
                  <span className="flex items-center">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Notas</span>
                  </span>
                </TabsTrigger>
              </TabsList>

              {/* Contenido de las pestañas */}
              <TabsContent value="tools" className="flex-1 p-0 m-0 overflow-hidden">
                <div className={`p-3 ${isDarkMode ? "bg-gray-800" : "bg-gray-20"} rounded-md m-3`}>
                  <h3 className={`text-sm font-medium mb-2 ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
                    Herramientas de anotación
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant={activeTool === "move" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleToolChange("move")}
                      className={`flex flex-col items-center justify-center h-16 ${isDarkMode && activeTool !== "move" ? "bg-gray-400 hover:bg-gray-600 border-gray-600" : ""}`}
                    >
                      <Move className="h-5 w-5 mb-1" />
                      <span className="text-xs">Mover</span>
                    </Button>
                    <Button
                      variant={activeTool === "draw" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleToolChange("draw")}
                      className={`flex flex-col items-center justify-center h-16 ${isDarkMode && activeTool !== "draw" ? "bg-gray-400 hover:bg-gray-600 border-gray-600" : ""}`}
                    >
                      <Pencil className="h-5 w-5 mb-1" />
                      <span className="text-xs">Dibujar</span>
                    </Button>
                    <Button
                      variant={activeTool === "text" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleToolChange("text")}
                      className={`flex flex-col items-center justify-center h-16 ${isDarkMode && activeTool !== "text" ? "bg-gray-400 hover:bg-gray-600 border-gray-600" : ""}`}
                    >
                      <Type className="h-5 w-5 mb-1" />
                      <span className="text-xs">Texto</span>
                    </Button>
                    <Button
                      variant={activeTool === "measure" ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleToolChange("measure")}
                      className={`flex flex-col items-center justify-center h-16 ${isDarkMode && activeTool !== "measure" ? "bg-gray-400 hover:bg-gray-600 border-gray-600" : ""}`}
                    >
                      <Ruler className="h-5 w-5 mb-1" />
                      <span className="text-xs">Medir</span>
                    </Button>
                  </div>
                </div>

                <div className={`p-3 ${isDarkMode ? "bg-gray-800" : "bg-gray-50"} rounded-md m-3`}>
                  <h3 className={`text-sm font-medium mb-2 ${isDarkMode ? "text-gray-100" : "text-gray-800"}`}>
                    Manipulación de imagen
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleZoomIn}
                      className={`flex flex-col items-center justify-center h-16 ${isDarkMode ? "bg-gray-400 hover:bg-gray-600 border-gray-600" : ""}`}
                    >
                      <ZoomIn className="h-5 w-5 mb-1" />
                      <span className="text-xs">Ampliar</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleZoomOut}
                      className={`flex flex-col items-center justify-center h-16 ${isDarkMode ? "bg-gray-400 hover:bg-gray-600 border-gray-600" : ""}`}
                    >
                      <ZoomOut className="h-5 w-5 mb-1" />
                      <span className="text-xs">Reducir</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRotateClockwise}
                      className={`flex flex-col items-center justify-center h-16 ${isDarkMode ? "bg-gray-400 hover:bg-gray-600 border-gray-600" : ""}`}
                    >
                      <RotateCw className="h-5 w-5 mb-1" />
                      <span className="text-xs">Rotar</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRotateCounterClockwise}
                      className={`flex flex-col items-center justify-center h-16 ${isDarkMode ? "bg-gray-400 hover:bg-gray-600 border-gray-600" : ""}`}
                    >
                      <RotateCcw className="h-5 w-5 mb-1" />
                      <span className="text-xs">Rotar -</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearAnnotations}
                      className={`flex flex-col items-center justify-center h-16 ${isDarkMode ? "bg-gray-400 hover:bg-gray-600 border-gray-600" : ""}`}
                    >
                      <Trash2 className="h-5 w-5 mb-1" />
                      <span className="text-xs">Limpiar</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearMeasurements}
                      className={`flex flex-col items-center justify-center h-16 ${isDarkMode ? "bg-gray-400 hover:bg-gray-600 border-gray-600" : ""}`}
                    >
                      <Trash2 className="h-5 w-5 mb-1" />
                      <span className="text-xs">Medidas</span>
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="adjustments" className="flex-1 p-0 m-0 overflow-hidden">
                <div className={`p-4 ${isDarkMode ? "bg-gray-800" : ""}`}>
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : ""}`}>Brillo</label>
                        <Badge
                          variant={isDarkMode ? "outline" : "secondary"}
                          className={isDarkMode ? "border-gray-600 text-gray-300" : ""}
                        >
                          {brightness}
                        </Badge>
                      </div>
                      <Slider
                        value={[brightness]}
                        min={-100}
                        max={100}
                        step={1}
                        onValueChange={(v) => setBrightness(v[0])}
                        className={isDarkMode ? "cursor-pointer" : ""}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : ""}`}>Contraste</label>
                        <Badge
                          variant={isDarkMode ? "outline" : "secondary"}
                          className={isDarkMode ? "border-gray-600 text-gray-300" : ""}
                        >
                          {contrast}
                        </Badge>
                      </div>
                      <Slider
                        value={[contrast]}
                        min={-100}
                        max={100}
                        step={1}
                        onValueChange={(v) => setContrast(v[0])}
                        className={isDarkMode ? "cursor-pointer" : ""}
                      />
                    </div>

                    {/* --- NUEVO: Controles de Color --- */}
                    <div className="mt-6 space-y-4">
                      <h3 className={`text-sm font-medium ${isDarkMode ? "text-gray-200" : "text-gray-800"}`}>
                        Ajustes de Color
                      </h3>

                      {/* Control de Tono (Hue) */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-xs ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Tono</span>
                          <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{filters.red}%</span>
                        </div>
                        <Slider
                          value={[filters.red]}
                          min={0}
                          max={360}
                          step={1}
                          onValueChange={([v]) => setFilters({ ...filters, red: v })}
                        />
                      </div>

                      {/* Control de Saturación */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-xs ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Saturación</span>
                          <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{filters.green}%</span>
                        </div>
                        <Slider
                          value={[filters.green]}
                          min={0}
                          max={200}
                          step={5}
                          onValueChange={([v]) => setFilters({ ...filters, green: v })}
                        />
                      </div>

                      {/* Control de Sepia */}
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className={`text-xs ${isDarkMode ? "text-gray-300" : "text-gray-600"}`}>Sepia</span>
                          <span className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>{filters.blue}%</span>
                        </div>
                        <Slider
                          value={[filters.blue]}
                          min={0}
                          max={100}
                          step={5}
                          onValueChange={([v]) => setFilters({ ...filters, blue: v })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : ""}`}>Zoom</label>
                        <Badge
                          variant={isDarkMode ? "outline" : "secondary"}
                          className={isDarkMode ? "border-gray-600 text-gray-300" : ""}
                        >
                          {zoom ? (zoom * 100).toFixed(0) + "%" : "100%"}
                        </Badge>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleZoomOut}
                          className={`flex-1 ${isDarkMode ? "bg-gray-700 hover:bg-gray-600 border-gray-600" : ""}`}
                        >
                          <ZoomOut className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleZoomIn}
                          className={`flex-1 ${isDarkMode ? "bg-gray-700 hover:bg-gray-600 border-gray-600" : ""}`}
                        >
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleResetView}
                      className={`w-full ${isDarkMode ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Restablecer valores
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="info" className="flex-1 p-0 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className={`p-4 ${isDarkMode ? "bg-gray-800" : ""}`}>
                    <div className="space-y-3">
                      <div className={`p-3 rounded-md ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                        <h4 className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                          Paciente
                        </h4>
                        <p className="text-sm font-medium">{study.patientName}</p>
                      </div>
                      <div className={`p-3 rounded-md ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                        <h4 className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>ID</h4>
                        <p className="text-sm font-medium">{study.patientId}</p>
                      </div>
                      <div className={`p-3 rounded-md ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                        <h4 className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                          Modalidad
                        </h4>
                        <p className="text-sm font-medium">{study.modality}</p>
                      </div>
                      <div className={`p-3 rounded-md ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                        <h4 className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                          Descripción
                        </h4>
                        <p className="text-sm font-medium">{study.description}</p>
                      </div>
                      <div className={`p-3 rounded-md ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                        <h4 className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                          Fecha
                        </h4>
                        <p className="text-sm font-medium">{study.studyDate}</p>
                      </div>
                      <div className={`p-3 rounded-md ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                        <h4 className={`text-xs font-medium ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                          Imágenes
                        </h4>
                        <p className="text-sm font-medium">{study.images.length} disponibles</p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="comments" className="flex-1 p-0 m-0 overflow-hidden flex flex-col">
                <div className={`p-4 ${isDarkMode ? "bg-gray-800" : ""} flex-1 flex flex-col`}>
                  <ScrollArea className="flex-1 mb-3">
                    <div className="space-y-3">
                      {comments.length === 0 ? (
                        <p className={`text-sm ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}>
                          No hay comentarios todavía.
                        </p>
                      ) : (
                        comments.map((comment, index) => (
                          <div key={index} className={`p-3 rounded-md ${isDarkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                            <p className="text-sm">{comment.text}</p>
                            <p className={`text-xs ${isDarkMode ? "text-gray-400" : "text-gray-500"} mt-1`}>
                              Fecha: {comment.date}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                  <div className="mt-auto">
                    <Textarea
                      placeholder="Escribe tu comentario médico aquí..."
                      value={doctorComment}
                      onChange={(e) => setDoctorComment(e.target.value)}
                      className={`min-h-24 text-sm resize-none ${isDarkMode ? "bg-gray-700 border-gray-600" : ""}`}
                    />
                    <Button
                      className={`w-full mt-2 ${isDarkMode ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                      size="sm"
                      onClick={handleAddComment}
                      disabled={!doctorComment.trim()}
                    >
                      <MessageSquare className="h-4 w-4 mr-2" />
                      Guardar comentario
                    </Button>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </Card>
        </div>

        {/* Columna central y derecha - Imagen principal maximizada */}
        <div className="col-span-9 flex flex-col h-full">
          <div
            className={`relative rounded-lg border ${isDarkMode ? "border-gray-700" : ""} bg-black flex-1`}
            style={{ minHeight: "400px" }}
          >
            <div ref={cornerstoneElementRef} className="w-full h-full rounded-lg" />
            <canvas
              ref={annotationCanvasRef}
              className="absolute top-0 left-0 z-10 w-full h-full"
              style={{
                cursor:
                  activeTool === "draw"
                    ? "crosshair"
                    : activeTool === "text"
                      ? "text"
                      : activeTool === "measure"
                        ? "crosshair"
                        : activeTool === "move"
                          ? "move"
                          : "default",
              }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />

            {/* Información de estado superpuesta */}
            <div className="absolute bottom-3 left-3 bg-black bg-opacity-70 text-white p-2 rounded-md text-xs flex items-center gap-2">
              <Badge variant="outline" className="border-gray-600 bg-black bg-opacity-50">
                Zoom: {zoom ? zoom.toFixed(2) : "1.00"}x
              </Badge>
              <Badge variant="outline" className="border-gray-600 bg-black bg-opacity-50">
                Rot: {rotation}°
              </Badge>
              <Badge variant="outline" className="border-gray-600 bg-black bg-opacity-50">
                {activeTool === "move"
                  ? "Mover"
                  : activeTool === "draw"
                    ? "Dibujar"
                    : activeTool === "text"
                      ? "Texto"
                      : "Medir"}
              </Badge>
            </div>
          </div>

          {/* Slider para navegación entre imágenes */}
          {study.images.length > 1 && (
            <div className={`my-3 px-2 ${isDarkMode ? "bg-gray-800 p-3 rounded-md" : ""}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm font-medium ${isDarkMode ? "text-gray-300" : ""}`}>
                  Imagen {currentImageIndex + 1} de {study.images.length}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentImageIndex === 0}
                    onClick={() => setCurrentImageIndex((prev) => Math.max(0, prev - 1))}
                    className={`h-8 ${isDarkMode ? "bg-gray-700 hover:bg-gray-600 border-gray-600" : ""}`}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentImageIndex === study.images.length - 1}
                    onClick={() => setCurrentImageIndex((prev) => Math.min(study.images.length - 1, prev + 1))}
                    className={`h-8 ${isDarkMode ? "bg-gray-700 hover:bg-gray-600 border-gray-600" : ""}`}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
              <Slider
                value={[currentImageIndex]}
                min={0}
                max={study.images.length - 1}
                step={1}
                onValueChange={(v) => setCurrentImageIndex(v[0])}
                className={isDarkMode ? "cursor-pointer" : ""}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}