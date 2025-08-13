'use client';

/**
 * Promotion Code Manager Component
 * Comprehensive management interface for promotion codes
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  QrCode, 
  Copy, 
  Download, 
  Eye, 
  Edit, 
  Trash2,
  Search,
  Filter,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { usePromotions, usePromotionCodes } from '@/hooks/use-promotions';
import { format } from 'date-fns';

interface PromotionCodeManagerProps {
  tenantId: string;
  className?: string;
}

// Form schemas
const singleCodeSchema = z.object({
  promotion_id: z.string().min(1, 'Please select a promotion'),
  code: z.string().optional(),
  description: z.string().optional(),
  usage_limit: z.number().min(1).optional(),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
  is_single_use: z.boolean().default(false),
  generate_qr: z.boolean().default(false),
});

const bulkCodeSchema = z.object({
  promotion_id: z.string().min(1, 'Please select a promotion'),
  count: z.number().min(1, 'Must generate at least 1 code').max(1000, 'Maximum 1000 codes at once'),
  prefix: z.string().max(10, 'Prefix too long').optional(),
  usage_limit: z.number().min(1).optional(),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
  is_single_use: z.boolean().default(false),
  generate_qr: z.boolean().default(false),
});

type SingleCodeForm = z.infer<typeof singleCodeSchema>;
type BulkCodeForm = z.infer<typeof bulkCodeSchema>;

export function PromotionCodeManager({ tenantId, className = '' }: PromotionCodeManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPromotion, setSelectedPromotion] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  
  // Hooks
  const { promotions } = usePromotions({ tenantId, autoFetch: true });
  
  // Mock codes data - would be replaced with actual API
  const [codes, setCodes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Mock data
  useEffect(() => {
    setCodes([
      {
        id: '1',
        promotion_id: 'promo-1',
        promotion_name: 'Summer Sale 20%',
        code: 'SUMMER20',
        description: 'Summer promotion code',
        usage_limit: 100,
        current_usage: 45,
        is_active: true,
        is_single_use: false,
        qr_code_url: null,
        valid_from: '2024-06-01',
        valid_until: '2024-08-31',
        created_at: '2024-06-01T00:00:00Z',
      },
      {
        id: '2',
        promotion_id: 'promo-2',
        promotion_name: 'Free Delivery',
        code: 'FREEDEL',
        description: 'Free delivery promotion',
        usage_limit: null,
        current_usage: 123,
        is_active: true,
        is_single_use: false,
        qr_code_url: 'data:image/png;base64,iVBORw0KGgoAAAANSU...',
        created_at: '2024-05-15T00:00:00Z',
      },
    ]);
  }, []);

  const filteredCodes = codes.filter(code => {
    if (searchTerm && !code.code.toLowerCase().includes(searchTerm.toLowerCase()) && 
        !code.promotion_name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    if (selectedPromotion !== 'all' && code.promotion_id !== selectedPromotion) {
      return false;
    }
    if (statusFilter === 'active' && !code.is_active) return false;
    if (statusFilter === 'inactive' && code.is_active) return false;
    return true;
  });

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Code copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  const exportCodes = () => {
    // Mock export functionality
    const csvContent = [
      'Code,Promotion,Usage,Limit,Status,Created',
      ...filteredCodes.map(code => 
        `${code.code},${code.promotion_name},${code.current_usage},${code.usage_limit || 'Unlimited'},${code.is_active ? 'Active' : 'Inactive'},${format(new Date(code.created_at), 'yyyy-MM-dd')}`
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `promotion-codes-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('Codes exported successfully');
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Promotion Codes</h2>
          <p className="text-muted-foreground">
            Manage and track your promotion codes
          </p>
        </div>
        <div className="flex gap-2">
          <CreateCodeDialog promotions={promotions}>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Create Code
            </Button>
          </CreateCodeDialog>
          <BulkGenerateDialog promotions={promotions}>
            <Button variant="outline">
              <QrCode className="w-4 h-4 mr-2" />
              Bulk Generate
            </Button>
          </BulkGenerateDialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search codes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedPromotion} onValueChange={setSelectedPromotion}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All promotions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Promotions</SelectItem>
                {promotions.map((promo) => (
                  <SelectItem key={promo.id} value={promo.id}>
                    {promo.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={exportCodes}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Codes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Promotion Codes ({filteredCodes.length})</CardTitle>
          <CardDescription>
            Manage individual promotion codes and track their usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between p-4 border rounded">
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-32" />
                    <div className="h-3 bg-muted rounded w-48" />
                  </div>
                  <div className="flex gap-2">
                    <div className="h-8 w-16 bg-muted rounded" />
                    <div className="h-8 w-8 bg-muted rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCodes.length === 0 ? (
            <div className="text-center py-12">
              <QrCode className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No promotion codes found</h3>
              <p className="text-muted-foreground mb-4">
                Create your first promotion code to get started
              </p>
              <CreateCodeDialog promotions={promotions}>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Code
                </Button>
              </CreateCodeDialog>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCodes.map((code) => (
                <CodeCard key={code.id} code={code} onCopy={copyToClipboard} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

interface CodeCardProps {
  code: any;
  onCopy: (text: string) => void;
}

function CodeCard({ code, onCopy }: CodeCardProps) {
  const getStatusIcon = (isActive: boolean) => {
    return isActive ? (
      <CheckCircle className="w-4 h-4 text-green-500" />
    ) : (
      <XCircle className="w-4 h-4 text-red-500" />
    );
  };

  const getUsageColor = (current: number, limit: number | null) => {
    if (!limit) return 'text-blue-600'; // Unlimited
    const percentage = (current / limit) * 100;
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-orange-600';
    return 'text-green-600';
  };

  const isExpired = code.valid_until && new Date(code.valid_until) < new Date();
  const isExpiringSoon = code.valid_until && 
    new Date(code.valid_until) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  return (
    <Card className={`${isExpired ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {getStatusIcon(code.is_active && !isExpired)}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-mono font-bold text-lg">{code.code}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onCopy(code.code)}
                    className="p-1 h-auto"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {code.promotion_name}
                  {code.description && ` • ${code.description}`}
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className={`font-medium ${getUsageColor(code.current_usage, code.usage_limit)}`}>
                {code.current_usage} {code.usage_limit ? `/ ${code.usage_limit}` : ''} uses
              </p>
              <p className="text-xs text-muted-foreground">
                {code.usage_limit ? 
                  `${Math.round((code.current_usage / code.usage_limit) * 100)}% used` : 
                  'Unlimited'
                }
              </p>
            </div>

            {code.valid_until && (
              <div className="text-right">
                <p className={`text-sm ${isExpired ? 'text-red-600' : isExpiringSoon ? 'text-orange-600' : 'text-muted-foreground'}`}>
                  {isExpired ? 'Expired' : 'Expires'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {format(new Date(code.valid_until), 'MMM dd, yyyy')}
                </p>
              </div>
            )}

            <div className="flex items-center gap-2">
              {code.qr_code_url && (
                <Button variant="ghost" size="sm" className="p-2">
                  <QrCode className="w-4 h-4" />
                </Button>
              )}
              
              <Badge variant={code.is_active && !isExpired ? "default" : "secondary"}>
                {isExpired ? 'Expired' : code.is_active ? 'Active' : 'Inactive'}
              </Badge>

              <Button variant="ghost" size="sm" className="p-2">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CreateCodeDialog({ promotions, children }: { promotions: any[]; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<SingleCodeForm>({
    resolver: zodResolver(singleCodeSchema),
    defaultValues: {
      is_single_use: false,
      generate_qr: false,
    },
  });

  const onSubmit = async (data: SingleCodeForm) => {
    setLoading(true);
    try {
      // Mock creation
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Promotion code created successfully');
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error('Failed to create promotion code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Promotion Code</DialogTitle>
          <DialogDescription>
            Create a new promotion code for customers to use
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="promotion_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Promotion *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select promotion" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {promotions.map((promo) => (
                        <SelectItem key={promo.id} value={promo.id}>
                          {promo.name}
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
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code</FormLabel>
                  <FormControl>
                    <Input placeholder="Leave empty to auto-generate" {...field} />
                  </FormControl>
                  <FormDescription>
                    Custom code or leave empty for automatic generation
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Optional description..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="valid_from"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid From</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="valid_until"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valid Until</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="usage_limit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Usage Limit</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="Leave empty for unlimited"
                      {...field}
                      onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <FormField
                control={form.control}
                name="is_single_use"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Single Use Code</FormLabel>
                      <FormDescription>
                        Code can only be used once per customer
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="generate_qr"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Generate QR Code</FormLabel>
                      <FormDescription>
                        Create a QR code for easy scanning
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Code'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function BulkGenerateDialog({ promotions, children }: { promotions: any[]; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<BulkCodeForm>({
    resolver: zodResolver(bulkCodeSchema),
    defaultValues: {
      count: 10,
      is_single_use: false,
      generate_qr: false,
    },
  });

  const onSubmit = async (data: BulkCodeForm) => {
    setLoading(true);
    try {
      // Mock bulk generation
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success(`${data.count} promotion codes generated successfully`);
      setOpen(false);
      form.reset();
    } catch (error) {
      toast.error('Failed to generate promotion codes');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bulk Generate Codes</DialogTitle>
          <DialogDescription>
            Generate multiple promotion codes at once
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="promotion_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Promotion *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select promotion" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {promotions.map((promo) => (
                        <SelectItem key={promo.id} value={promo.id}>
                          {promo.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Codes *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="1"
                        max="1000"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="prefix"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code Prefix</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., SUMMER" {...field} />
                    </FormControl>
                    <FormDescription>Optional prefix for all codes</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-3">
              <FormField
                control={form.control}
                name="is_single_use"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Single Use Codes</FormLabel>
                      <FormDescription>
                        Each code can only be used once per customer
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="generate_qr"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Generate QR Codes</FormLabel>
                      <FormDescription>
                        Create QR codes for all generated codes
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Generating...' : 'Generate Codes'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}