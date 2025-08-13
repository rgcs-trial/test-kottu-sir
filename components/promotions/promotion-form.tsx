'use client';

/**
 * Promotion Form Component
 * Comprehensive form for creating and editing promotions
 */

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Clock, Users, Percent, DollarSign, Gift, Tag, AlertCircle } from 'lucide-react';
import { createPromotion, updatePromotion } from '@/lib/promotions/actions';
import { toast } from 'sonner';

// Form validation schema
const promotionFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255, 'Name too long'),
  description: z.string().max(500, 'Description too long').optional(),
  internal_notes: z.string().max(1000, 'Notes too long').optional(),
  promotion_type: z.enum(['percentage', 'fixed_amount', 'buy_x_get_y', 'free_delivery', 'happy_hour', 'first_time_customer', 'category_discount']),
  discount_scope: z.enum(['order_total', 'subtotal', 'delivery_fee', 'category', 'item']),
  discount_percentage: z.number().min(0).max(100).optional(),
  discount_amount: z.number().min(0).optional(),
  max_discount_amount: z.number().min(0).optional(),
  buy_quantity: z.number().min(1).optional(),
  get_quantity: z.number().min(1).optional(),
  get_discount_percentage: z.number().min(0).max(100).optional(),
  min_order_amount: z.number().min(0).default(0),
  min_items_quantity: z.number().min(0).default(0),
  total_usage_limit: z.number().min(1).optional(),
  per_customer_limit: z.number().min(1).optional(),
  usage_frequency: z.enum(['once_per_customer', 'daily', 'weekly', 'monthly', 'unlimited']).default('unlimited'),
  valid_from: z.string().optional(),
  valid_until: z.string().optional(),
  valid_days: z.array(z.string()).default(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']),
  valid_hours_start: z.string().optional(),
  valid_hours_end: z.string().optional(),
  target_segment: z.enum(['all_customers', 'new_customers', 'returning_customers', 'vip_customers', 'inactive_customers']).default('all_customers'),
  can_stack_with_others: z.boolean().default(false),
  stack_priority: z.number().min(0).max(100).default(0),
  auto_apply: z.boolean().default(false),
  requires_code: z.boolean().default(true),
  is_featured: z.boolean().default(false),
  display_banner: z.boolean().default(false),
  banner_text: z.string().max(100, 'Banner text too long').optional(),
  banner_color: z.string().max(7, 'Invalid color').optional(),
}).refine((data) => {
  // Custom validation for promotion types
  if (data.promotion_type === 'percentage' && !data.discount_percentage) {
    return false;
  }
  if (data.promotion_type === 'fixed_amount' && !data.discount_amount) {
    return false;
  }
  if (data.promotion_type === 'buy_x_get_y' && (!data.buy_quantity || !data.get_quantity)) {
    return false;
  }
  return true;
}, {
  message: 'Invalid promotion configuration',
  path: ['promotion_type'],
});

type PromotionFormData = z.infer<typeof promotionFormSchema>;

interface PromotionFormProps {
  children: React.ReactNode;
  promotion?: any; // Existing promotion for editing
}

const PROMOTION_TYPES = [
  {
    value: 'percentage',
    label: 'Percentage Discount',
    description: 'Reduce order by percentage (e.g., 20% off)',
    icon: Percent,
  },
  {
    value: 'fixed_amount',
    label: 'Fixed Amount',
    description: 'Reduce order by fixed amount (e.g., $5 off)',
    icon: DollarSign,
  },
  {
    value: 'buy_x_get_y',
    label: 'Buy X Get Y',
    description: 'Buy certain quantity, get items free/discounted',
    icon: Gift,
  },
  {
    value: 'free_delivery',
    label: 'Free Delivery',
    description: 'Remove delivery charges',
    icon: Tag,
  },
  {
    value: 'happy_hour',
    label: 'Happy Hour',
    description: 'Time-based percentage discount',
    icon: Clock,
  },
  {
    value: 'first_time_customer',
    label: 'First Time Customer',
    description: 'Discount for new customers only',
    icon: Users,
  },
];

const CUSTOMER_SEGMENTS = [
  { value: 'all_customers', label: 'All Customers', description: 'Available to everyone' },
  { value: 'new_customers', label: 'New Customers', description: 'First-time customers only' },
  { value: 'returning_customers', label: 'Returning Customers', description: 'Customers with previous orders' },
  { value: 'vip_customers', label: 'VIP Customers', description: 'High-value customers ($1000+ spent)' },
  { value: 'inactive_customers', label: 'Inactive Customers', description: 'Haven\'t ordered in 30+ days' },
];

const DAYS_OF_WEEK = [
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
  { value: 'sunday', label: 'Sunday' },
];

export function PromotionForm({ children, promotion }: PromotionFormProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<PromotionFormData>({
    resolver: zodResolver(promotionFormSchema),
    defaultValues: {
      name: '',
      description: '',
      internal_notes: '',
      promotion_type: 'percentage',
      discount_scope: 'order_total',
      min_order_amount: 0,
      min_items_quantity: 0,
      usage_frequency: 'unlimited',
      valid_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
      target_segment: 'all_customers',
      can_stack_with_others: false,
      stack_priority: 0,
      auto_apply: false,
      requires_code: true,
      is_featured: false,
      display_banner: false,
      get_discount_percentage: 100, // Default for buy_x_get_y
    },
  });

  const watchedPromotionType = form.watch('promotion_type');
  const watchedRequiresCode = form.watch('requires_code');
  const watchedDisplayBanner = form.watch('display_banner');

  // Populate form when editing
  useEffect(() => {
    if (promotion && open) {
      form.reset({
        name: promotion.name || '',
        description: promotion.description || '',
        internal_notes: promotion.internal_notes || '',
        promotion_type: promotion.promotion_type,
        discount_scope: promotion.discount_scope,
        discount_percentage: promotion.discount_percentage || 0,
        discount_amount: promotion.discount_amount || 0,
        max_discount_amount: promotion.max_discount_amount || 0,
        buy_quantity: promotion.buy_quantity || 1,
        get_quantity: promotion.get_quantity || 1,
        get_discount_percentage: promotion.get_discount_percentage || 100,
        min_order_amount: promotion.min_order_amount || 0,
        min_items_quantity: promotion.min_items_quantity || 0,
        total_usage_limit: promotion.total_usage_limit || undefined,
        per_customer_limit: promotion.per_customer_limit || undefined,
        usage_frequency: promotion.usage_frequency || 'unlimited',
        valid_from: promotion.valid_from?.split('T')[0] || '',
        valid_until: promotion.valid_until?.split('T')[0] || '',
        valid_days: promotion.valid_days || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        valid_hours_start: promotion.valid_hours_start || '',
        valid_hours_end: promotion.valid_hours_end || '',
        target_segment: promotion.target_segment || 'all_customers',
        can_stack_with_others: promotion.can_stack_with_others || false,
        stack_priority: promotion.stack_priority || 0,
        auto_apply: promotion.auto_apply || false,
        requires_code: promotion.requires_code ?? true,
        is_featured: promotion.is_featured || false,
        display_banner: promotion.display_banner || false,
        banner_text: promotion.banner_text || '',
        banner_color: promotion.banner_color || '#000000',
      });
    }
  }, [promotion, open, form]);

  const onSubmit = async (data: PromotionFormData) => {
    setLoading(true);
    try {
      let result;
      
      if (promotion) {
        result = await updatePromotion(promotion.id, data);
      } else {
        result = await createPromotion(data);
      }

      if (result.success) {
        toast.success(
          promotion 
            ? 'Promotion updated successfully' 
            : 'Promotion created successfully'
        );
        setOpen(false);
        form.reset();
      } else {
        toast.error(result.error || 'Failed to save promotion');
      }
    } catch (error) {
      console.error('Form submission error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getDaysDisplay = (days: string[]) => {
    if (days.length === 7) return 'All days';
    if (days.length === 5 && !days.includes('saturday') && !days.includes('sunday')) return 'Weekdays';
    if (days.length === 2 && days.includes('saturday') && days.includes('sunday')) return 'Weekends';
    return days.map(day => day.charAt(0).toUpperCase() + day.slice(1)).join(', ');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {promotion ? 'Edit Promotion' : 'Create New Promotion'}
          </DialogTitle>
          <DialogDescription>
            {promotion 
              ? 'Update your promotion settings and configuration'
              : 'Set up a new promotional campaign to attract customers'
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs defaultValue="basic" className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="discount">Discount Rules</TabsTrigger>
                <TabsTrigger value="targeting">Targeting</TabsTrigger>
                <TabsTrigger value="display">Display Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                    <CardDescription>
                      Configure the basic details of your promotion
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Promotion Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Summer Sale 2024"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Internal name for this promotion (visible to staff)
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
                            <Textarea
                              placeholder="Describe what this promotion offers..."
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Customer-facing description of the promotion
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="internal_notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Internal Notes</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Staff notes, campaign goals, etc..."
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Private notes for staff only
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="discount" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Discount Configuration</CardTitle>
                    <CardDescription>
                      Set up how the discount will be calculated and applied
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="promotion_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Promotion Type *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select promotion type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {PROMOTION_TYPES.map((type) => {
                                const Icon = type.icon;
                                return (
                                  <SelectItem key={type.value} value={type.value}>
                                    <div className="flex items-center space-x-2">
                                      <Icon className="w-4 h-4" />
                                      <div>
                                        <div className="font-medium">{type.label}</div>
                                        <div className="text-xs text-muted-foreground">{type.description}</div>
                                      </div>
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Conditional discount fields based on promotion type */}
                    {watchedPromotionType === 'percentage' && (
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="discount_percentage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Discount Percentage *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  max="100"
                                  placeholder="20"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormDescription>Percentage to discount (1-100%)</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="max_discount_amount"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Maximum Discount ($)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="50.00"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                              </FormControl>
                              <FormDescription>Cap the discount amount (optional)</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    {watchedPromotionType === 'fixed_amount' && (
                      <FormField
                        control={form.control}
                        name="discount_amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Discount Amount ($) *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="10.00"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription>Fixed dollar amount to discount</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {watchedPromotionType === 'buy_x_get_y' && (
                      <div className="grid grid-cols-3 gap-4">
                        <FormField
                          control={form.control}
                          name="buy_quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Buy Quantity *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="2"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                />
                              </FormControl>
                              <FormDescription>Items to buy</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="get_quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Get Quantity *</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  placeholder="1"
                                  {...field}
                                  onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                />
                              </FormControl>
                              <FormDescription>Items to get</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="get_discount_percentage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Get Discount %</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="1"
                                  max="100"
                                  placeholder="100"
                                  {...field}
                                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 100)}
                                />
                              </FormControl>
                              <FormDescription>100% = free</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="min_order_amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Order Amount ($)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="25.00"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription>Minimum order value required</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="min_items_quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Minimum Items Quantity</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder="2"
                                {...field}
                                onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                              />
                            </FormControl>
                            <FormDescription>Minimum number of items required</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="targeting" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Time & Usage Limits</CardTitle>
                    <CardDescription>
                      Configure when and how often this promotion can be used
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
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
                            <FormDescription>Start date (leave empty for immediate)</FormDescription>
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
                            <FormDescription>End date (leave empty for no expiry)</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="valid_days"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valid Days</FormLabel>
                          <FormDescription>
                            Select which days of the week this promotion is active
                          </FormDescription>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {DAYS_OF_WEEK.map((day) => (
                              <Badge
                                key={day.value}
                                variant={field.value.includes(day.value) ? "default" : "outline"}
                                className="cursor-pointer"
                                onClick={() => {
                                  const newDays = field.value.includes(day.value)
                                    ? field.value.filter(d => d !== day.value)
                                    : [...field.value, day.value];
                                  field.onChange(newDays);
                                }}
                              >
                                {day.label}
                              </Badge>
                            ))}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Active: {getDaysDisplay(field.value)}
                          </p>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="valid_hours_start"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valid From Time</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormDescription>Start time each day (optional)</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="valid_hours_end"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Valid Until Time</FormLabel>
                            <FormControl>
                              <Input type="time" {...field} />
                            </FormControl>
                            <FormDescription>End time each day (optional)</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="total_usage_limit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Usage Limit</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                placeholder="100"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormDescription>Maximum total uses (leave empty for unlimited)</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="per_customer_limit"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Per Customer Limit</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                placeholder="3"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormDescription>Uses per individual customer</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="usage_frequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Usage Frequency</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select frequency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="once_per_customer">Once per customer</SelectItem>
                              <SelectItem value="daily">Once per day per customer</SelectItem>
                              <SelectItem value="weekly">Once per week per customer</SelectItem>
                              <SelectItem value="monthly">Once per month per customer</SelectItem>
                              <SelectItem value="unlimited">Unlimited</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription>How often each customer can use this promotion</FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Customer Targeting</CardTitle>
                    <CardDescription>
                      Choose which customers can use this promotion
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="target_segment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Target Customer Segment</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select target segment" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CUSTOMER_SEGMENTS.map((segment) => (
                                <SelectItem key={segment.value} value={segment.value}>
                                  <div>
                                    <div className="font-medium">{segment.label}</div>
                                    <div className="text-xs text-muted-foreground">{segment.description}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="display" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Application Settings</CardTitle>
                    <CardDescription>
                      Configure how customers access this promotion
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="requires_code"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Requires Promotion Code</FormLabel>
                            <FormDescription>
                              Customers must enter a code to use this promotion
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

                    <FormField
                      control={form.control}
                      name="auto_apply"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Auto-Apply</FormLabel>
                            <FormDescription>
                              Automatically apply if conditions are met (overrides code requirement)
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

                    <FormField
                      control={form.control}
                      name="can_stack_with_others"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Can Stack with Other Promotions</FormLabel>
                            <FormDescription>
                              Allow this promotion to be combined with others
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

                    <FormField
                      control={form.control}
                      name="stack_priority"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Stack Priority</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              placeholder="0"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormDescription>
                            Higher priority promotions are applied first (0-100)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Display Options</CardTitle>
                    <CardDescription>
                      Control how this promotion appears to customers
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="is_featured"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Featured Promotion</FormLabel>
                            <FormDescription>
                              Highlight this promotion in special sections
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

                    <FormField
                      control={form.control}
                      name="display_banner"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Display Banner</FormLabel>
                            <FormDescription>
                              Show promotional banner on the restaurant page
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

                    {watchedDisplayBanner && (
                      <div className="space-y-4 border-l-4 border-primary pl-4">
                        <FormField
                          control={form.control}
                          name="banner_text"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Banner Text</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="🎉 20% OFF your entire order today!"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Text to display in the promotional banner (max 100 characters)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="banner_color"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Banner Color</FormLabel>
                              <FormControl>
                                <Input
                                  type="color"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Background color for the banner
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>

                {!watchedRequiresCode && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Since this promotion doesn't require a code, it will be automatically evaluated for all eligible customers.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading 
                  ? 'Saving...' 
                  : promotion 
                    ? 'Update Promotion' 
                    : 'Create Promotion'
                }
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}