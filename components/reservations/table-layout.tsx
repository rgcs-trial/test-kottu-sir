"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { format, parseISO, isWithinInterval, addMinutes } from "date-fns"
import { 
  Square,
  Circle,
  Users,
  Settings,
  Edit3,
  Trash2,
  Plus,
  Save,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Move,
  Eye,
  EyeOff
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { cn } from "@/lib/utils"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"

interface Table {
  id: string
  table_number: string
  table_name?: string
  capacity: number
  table_type: 'standard' | 'booth' | 'outdoor' | 'bar' | 'private' | 'vip'
  position_x: number
  position_y: number
  width: number
  height: number
  is_active: boolean
  current_reservation?: {
    id: string
    customer_name: string
    party_size: number
    start_time: string
    end_time: string
    status: string
  }
  next_reservation?: {
    id: string
    customer_name: string
    start_time: string
  }
}

interface TableLayoutProps {
  restaurantId: string
  selectedDate?: Date
  selectedTime?: string
  editMode?: boolean
  onTableSelect?: (table: Table) => void
  onTableUpdate?: (tableId: string, updates: Partial<Table>) => void
  onTableCreate?: (table: Omit<Table, 'id'>) => void
  onTableDelete?: (tableId: string) => void
  className?: string
}

const tableFormSchema = z.object({
  table_number: z.string().min(1, "Table number is required"),
  table_name: z.string().optional(),
  capacity: z.number().min(1).max(20),
  table_type: z.enum(['standard', 'booth', 'outdoor', 'bar', 'private', 'vip']),
  is_active: z.boolean(),
})

type TableFormData = z.infer<typeof tableFormSchema>

const tableTypes = {
  standard: { icon: Square, color: 'bg-blue-100 border-blue-300 text-blue-800' },
  booth: { icon: Square, color: 'bg-purple-100 border-purple-300 text-purple-800' },
  outdoor: { icon: Circle, color: 'bg-green-100 border-green-300 text-green-800' },
  bar: { icon: Square, color: 'bg-orange-100 border-orange-300 text-orange-800' },
  private: { icon: Square, color: 'bg-pink-100 border-pink-300 text-pink-800' },
  vip: { icon: Square, color: 'bg-yellow-100 border-yellow-300 text-yellow-800' },
}

const tableStatuses = {
  available: { color: 'bg-green-500 border-green-600', textColor: 'text-green-800' },
  occupied: { color: 'bg-red-500 border-red-600', textColor: 'text-red-800' },
  reserved: { color: 'bg-blue-500 border-blue-600', textColor: 'text-blue-800' },
  maintenance: { color: 'bg-gray-500 border-gray-600', textColor: 'text-gray-800' },
}

export function TableLayout({
  restaurantId,
  selectedDate = new Date(),
  selectedTime,
  editMode = false,
  onTableSelect,
  onTableUpdate,
  onTableCreate,
  onTableDelete,
  className
}: TableLayoutProps) {
  const [tables, setTables] = useState<Table[]>([])
  const [loading, setLoading] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [selectedTable, setSelectedTable] = useState<Table | null>(null)
  const [editingTable, setEditingTable] = useState<Table | null>(null)
  const [showTableDialog, setShowTableDialog] = useState(false)
  const [dragTable, setDragTable] = useState<string | null>(null)
  const [showReservationInfo, setShowReservationInfo] = useState(true)
  
  const canvasRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Form for table editing
  const form = useForm<TableFormData>({
    resolver: zodResolver(tableFormSchema),
    defaultValues: {
      table_number: "",
      capacity: 4,
      table_type: "standard",
      is_active: true,
    },
  })

  // Fetch tables
  const fetchTables = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/tables?restaurant_id=${restaurantId}${selectedDate ? `&date=${format(selectedDate, 'yyyy-MM-dd')}` : ''}${selectedTime ? `&time=${selectedTime}` : ''}`)
      
      if (!response.ok) {
        throw new Error('Failed to fetch tables')
      }

      const data = await response.json()
      setTables(data.tables)
    } catch (err) {
      console.error('Error fetching tables:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTables()
  }, [restaurantId, selectedDate, selectedTime])

  // Calculate table status
  const getTableStatus = useCallback((table: Table) => {
    if (!table.is_active) return 'maintenance'
    if (table.current_reservation) return 'occupied'
    if (table.next_reservation) return 'reserved'
    return 'available'
  }, [])

  // Handle mouse events for panning
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (editMode) return
    setIsDragging(true)
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
  }, [editMode, panOffset])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging || editMode) return
    setPanOffset({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }, [isDragging, editMode, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Handle table dragging in edit mode
  const handleTableMouseDown = useCallback((e: React.MouseEvent, tableId: string) => {
    if (!editMode) return
    e.stopPropagation()
    setDragTable(tableId)
    setDragStart({ 
      x: e.clientX - tables.find(t => t.id === tableId)?.position_x! * zoom - panOffset.x, 
      y: e.clientY - tables.find(t => t.id === tableId)?.position_y! * zoom - panOffset.y 
    })
  }, [editMode, tables, zoom, panOffset])

  const handleTableMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragTable || !editMode) return
    
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = (e.clientX - rect.left - panOffset.x) / zoom
    const y = (e.clientY - rect.top - panOffset.y) / zoom

    setTables(prev => prev.map(table => 
      table.id === dragTable 
        ? { ...table, position_x: Math.max(0, x), position_y: Math.max(0, y) }
        : table
    ))
  }, [dragTable, editMode, zoom, panOffset])

  const handleTableMouseUp = useCallback(async () => {
    if (dragTable) {
      const table = tables.find(t => t.id === dragTable)
      if (table && onTableUpdate) {
        await onTableUpdate(table.id, {
          position_x: table.position_x,
          position_y: table.position_y
        })
      }
      setDragTable(null)
    }
  }, [dragTable, tables, onTableUpdate])

  // Handle table click
  const handleTableClick = useCallback((table: Table) => {
    if (editMode) {
      setEditingTable(table)
      form.reset({
        table_number: table.table_number,
        table_name: table.table_name || "",
        capacity: table.capacity,
        table_type: table.table_type,
        is_active: table.is_active,
      })
      setShowTableDialog(true)
    } else {
      setSelectedTable(table)
      onTableSelect?.(table)
    }
  }, [editMode, form, onTableSelect])

  // Handle zoom
  const handleZoom = useCallback((factor: number) => {
    setZoom(prev => Math.max(0.5, Math.min(3, prev * factor)))
  }, [])

  // Handle form submission
  const handleFormSubmit = async (data: TableFormData) => {
    try {
      if (editingTable) {
        // Update existing table
        await onTableUpdate?.(editingTable.id, data)
        setTables(prev => prev.map(table => 
          table.id === editingTable.id ? { ...table, ...data } : table
        ))
      } else {
        // Create new table
        const newTable = {
          ...data,
          position_x: 100,
          position_y: 100,
          width: 100,
          height: 100,
        }
        await onTableCreate?.(newTable)
        fetchTables() // Refresh to get the new table with ID
      }
      
      setShowTableDialog(false)
      setEditingTable(null)
      form.reset()
    } catch (err) {
      console.error('Error saving table:', err)
    }
  }

  // Handle table deletion
  const handleDeleteTable = async (tableId: string) => {
    if (window.confirm('Are you sure you want to delete this table?')) {
      try {
        await onTableDelete?.(tableId)
        setTables(prev => prev.filter(table => table.id !== tableId))
        setShowTableDialog(false)
        setEditingTable(null)
      } catch (err) {
        console.error('Error deleting table:', err)
      }
    }
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Square className="h-5 w-5" />
            Table Layout
            {selectedDate && (
              <span className="text-sm font-normal text-muted-foreground">
                - {format(selectedDate, 'PPP')}
                {selectedTime && ` at ${format(parseISO(`2000-01-01T${selectedTime}`), 'h:mm a')}`}
              </span>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReservationInfo(!showReservationInfo)}
            >
              {showReservationInfo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showReservationInfo ? 'Hide Info' : 'Show Info'}
            </Button>
            
            <Button variant="outline" size="sm" onClick={() => handleZoom(1.2)}>
              <ZoomIn className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={() => handleZoom(0.8)}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            
            <Button variant="outline" size="sm" onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }) }}>
              <RotateCcw className="h-4 w-4" />
              Reset View
            </Button>

            {editMode && (
              <Button 
                size="sm"
                onClick={() => {
                  setEditingTable(null)
                  form.reset()
                  setShowTableDialog(true)
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Table
              </Button>
            )}
          </div>
        </div>

        {editMode && (
          <CardDescription>
            <Alert>
              <Edit3 className="h-4 w-4" />
              <AlertDescription>
                Edit Mode: Click tables to edit, drag to move. Changes are saved automatically.
              </AlertDescription>
            </Alert>
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {/* Legend */}
        <div className="p-4 border-b bg-muted/20">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className={cn("w-4 h-4 rounded border-2", tableStatuses.available.color)}></div>
              <span>Available</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn("w-4 h-4 rounded border-2", tableStatuses.occupied.color)}></div>
              <span>Occupied</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn("w-4 h-4 rounded border-2", tableStatuses.reserved.color)}></div>
              <span>Reserved</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn("w-4 h-4 rounded border-2", tableStatuses.maintenance.color)}></div>
              <span>Maintenance</span>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div 
          ref={containerRef}
          className="relative overflow-hidden bg-gray-50"
          style={{ height: '600px' }}
          onMouseDown={handleMouseDown}
          onMouseMove={editMode ? handleTableMouseMove : handleMouseMove}
          onMouseUp={editMode ? handleTableMouseUp : handleMouseUp}
          onMouseLeave={() => { setIsDragging(false); setDragTable(null) }}
        >
          <div
            ref={canvasRef}
            className="absolute inset-0"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              cursor: isDragging ? 'grabbing' : editMode ? 'default' : 'grab'
            }}
          >
            {/* Grid lines */}
            <svg 
              className="absolute inset-0 pointer-events-none" 
              style={{ width: '2000px', height: '2000px' }}
            >
              <defs>
                <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                  <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#e5e7eb" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>

            {/* Tables */}
            {tables.map((table) => {
              const status = getTableStatus(table)
              const statusStyle = tableStatuses[status]
              const TableIcon = tableTypes[table.table_type].icon
              const isSelected = selectedTable?.id === table.id
              
              return (
                <div
                  key={table.id}
                  className={cn(
                    "absolute border-2 rounded-lg cursor-pointer transition-all duration-200",
                    "flex flex-col items-center justify-center text-center p-2",
                    statusStyle.color,
                    isSelected && "ring-2 ring-primary ring-offset-2",
                    !table.is_active && "opacity-50",
                    editMode && "hover:shadow-lg"
                  )}
                  style={{
                    left: `${table.position_x}px`,
                    top: `${table.position_y}px`,
                    width: `${table.width}px`,
                    height: `${table.height}px`,
                    zIndex: isSelected ? 10 : 1,
                  }}
                  onClick={() => handleTableClick(table)}
                  onMouseDown={(e) => handleTableMouseDown(e, table.id)}
                >
                  {/* Table Icon */}
                  <TableIcon className="h-4 w-4 mb-1" />
                  
                  {/* Table Number */}
                  <div className="font-bold text-xs">{table.table_number}</div>
                  
                  {/* Capacity */}
                  <div className="flex items-center gap-1 text-xs">
                    <Users className="h-2 w-2" />
                    {table.capacity}
                  </div>

                  {/* Table Name */}
                  {table.table_name && (
                    <div className="text-xs opacity-75 truncate max-w-full">
                      {table.table_name}
                    </div>
                  )}

                  {/* Reservation Info */}
                  {showReservationInfo && table.current_reservation && (
                    <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1 py-0.5 rounded transform rotate-12">
                      {table.current_reservation.customer_name.split(' ')[0]}
                    </div>
                  )}
                  
                  {showReservationInfo && !table.current_reservation && table.next_reservation && (
                    <div className="absolute -top-2 -right-2 bg-blue-500 text-white text-xs px-1 py-0.5 rounded">
                      {format(parseISO(`2000-01-01T${table.next_reservation.start_time}`), 'HH:mm')}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Table Details Panel */}
        {selectedTable && !editMode && (
          <div className="p-4 border-t bg-muted/20">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label>Table</Label>
                <div className="font-medium">
                  {selectedTable.table_name || `Table ${selectedTable.table_number}`}
                </div>
              </div>
              <div>
                <Label>Type</Label>
                <div className="font-medium capitalize">{selectedTable.table_type}</div>
              </div>
              <div>
                <Label>Capacity</Label>
                <div className="font-medium">{selectedTable.capacity} guests</div>
              </div>
              <div>
                <Label>Status</Label>
                <Badge className={cn("gap-1", tableStatuses[getTableStatus(selectedTable)].color)}>
                  {getTableStatus(selectedTable)}
                </Badge>
              </div>
            </div>

            {selectedTable.current_reservation && (
              <>
                <Separator className="my-3" />
                <div>
                  <Label>Current Reservation</Label>
                  <div className="mt-1">
                    <div className="font-medium">{selectedTable.current_reservation.customer_name}</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedTable.current_reservation.party_size} guests • 
                      {format(parseISO(`2000-01-01T${selectedTable.current_reservation.start_time}`), 'h:mm a')} - 
                      {format(parseISO(`2000-01-01T${selectedTable.current_reservation.end_time}`), 'h:mm a')}
                    </div>
                  </div>
                </div>
              </>
            )}

            {selectedTable.next_reservation && !selectedTable.current_reservation && (
              <>
                <Separator className="my-3" />
                <div>
                  <Label>Next Reservation</Label>
                  <div className="mt-1">
                    <div className="font-medium">{selectedTable.next_reservation.customer_name}</div>
                    <div className="text-sm text-muted-foreground">
                      at {format(parseISO(`2000-01-01T${selectedTable.next_reservation.start_time}`), 'h:mm a')}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Table Form Dialog */}
        <Dialog open={showTableDialog} onOpenChange={setShowTableDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingTable ? 'Edit Table' : 'Add New Table'}
              </DialogTitle>
              <DialogDescription>
                {editingTable ? 'Update table information and settings.' : 'Create a new table for your restaurant.'}
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="table_number"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Table Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="table_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Table Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Window Table" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="capacity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Capacity *</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value?.toString()}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select capacity" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((size) => (
                              <SelectItem key={size} value={size.toString()}>
                                {size} {size === 1 ? 'person' : 'people'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="table_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Table Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(tableTypes).map(([key, value]) => (
                              <SelectItem key={key} value={key}>
                                <div className="flex items-center gap-2">
                                  <value.icon className="h-4 w-4" />
                                  <span className="capitalize">{key}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between">
                      <div>
                        <FormLabel>Active Table</FormLabel>
                        <FormDescription className="text-sm text-muted-foreground">
                          Inactive tables won't be available for reservations
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <div className="flex justify-between pt-4">
                  <div>
                    {editingTable && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => handleDeleteTable(editingTable.id)}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Table
                      </Button>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowTableDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      <Save className="h-4 w-4 mr-2" />
                      {editingTable ? 'Update' : 'Create'} Table
                    </Button>
                  </div>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}