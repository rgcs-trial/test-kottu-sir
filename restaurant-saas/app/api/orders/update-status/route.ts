import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { isValidStatusTransition, calculateEstimatedTime, validateOrderUpdate } from '@/lib/realtime/order-tracking'
import { Database } from '@/lib/supabase/types'

type OrderStatus = Database['public']['Enums']['order_status']
type OrderType = Database['public']['Enums']['order_type']

interface UpdateStatusRequest {
  orderId: string
  status: OrderStatus
  estimatedReadyTime?: string
  notes?: string
  actualReadyTime?: string
}

interface BulkUpdateStatusRequest {
  orderIds: string[]
  status: OrderStatus
  estimatedReadyTime?: string
  notes?: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    
    // Handle bulk updates
    if ('orderIds' in body) {
      return handleBulkStatusUpdate(supabase, user.id, body)
    }
    
    // Handle single order update
    return handleSingleStatusUpdate(supabase, user.id, body)

  } catch (error) {
    console.error('Order status update error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleSingleStatusUpdate(
  supabase: any,
  userId: string,
  { orderId, status, estimatedReadyTime, notes, actualReadyTime }: UpdateStatusRequest
) {
  // Validate request data
  if (!orderId || !status) {
    return NextResponse.json(
      { error: 'Order ID and status are required' },
      { status: 400 }
    )
  }

  // Validate the order update
  const validation = validateOrderUpdate({ status, estimated_ready_time: estimatedReadyTime })
  if (!validation.isValid) {
    return NextResponse.json(
      { error: validation.errors.join(', ') },
      { status: 400 }
    )
  }

  try {
    // Get current order to validate transition and permissions
    const { data: currentOrder, error: fetchError } = await supabase
      .from('orders')
      .select(`
        *,
        restaurants!inner(owner_id, id)
      `)
      .eq('id', orderId)
      .single()

    if (fetchError || !currentOrder) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to update this order
    const hasPermission = await checkOrderUpdatePermission(supabase, userId, currentOrder.restaurant_id)
    if (!hasPermission) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Validate status transition
    if (!isValidStatusTransition(currentOrder.status, status, currentOrder.type)) {
      return NextResponse.json(
        { error: `Invalid status transition from ${currentOrder.status} to ${status}` },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    // Add estimated ready time if provided or calculate it
    if (estimatedReadyTime) {
      updateData.estimated_ready_time = estimatedReadyTime
    } else if (status === 'confirmed' || status === 'preparing') {
      // Auto-calculate estimated time for these statuses
      const estimatedTime = calculateEstimatedTime(currentOrder)
      updateData.estimated_ready_time = estimatedTime.toISOString()
    }

    // Add actual ready time for completed statuses
    if ((status === 'ready' || status === 'completed' || status === 'delivered') && !currentOrder.actual_ready_time) {
      updateData.actual_ready_time = actualReadyTime || new Date().toISOString()
    }

    // Add delivery timestamp
    if (status === 'delivered' && !currentOrder.delivered_at) {
      updateData.delivered_at = new Date().toISOString()
    }

    // Add notes if provided
    if (notes !== undefined) {
      updateData.notes = notes
    }

    // Update the order
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select(`
        *,
        order_items (
          id,
          name,
          quantity,
          price,
          notes,
          customizations
        )
      `)
      .single()

    if (updateError) {
      console.error('Order update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update order status' },
        { status: 500 }
      )
    }

    // Log the status change for audit trail
    await logStatusChange(supabase, {
      orderId,
      fromStatus: currentOrder.status,
      toStatus: status,
      userId,
      timestamp: new Date().toISOString(),
      notes
    })

    // Send notifications if needed
    await sendStatusChangeNotifications(supabase, updatedOrder, currentOrder.status)

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: `Order status updated to ${status}`
    })

  } catch (error) {
    console.error('Order status update error:', error)
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    )
  }
}

async function handleBulkStatusUpdate(
  supabase: any,
  userId: string,
  { orderIds, status, estimatedReadyTime, notes }: BulkUpdateStatusRequest
) {
  if (!orderIds || orderIds.length === 0 || !status) {
    return NextResponse.json(
      { error: 'Order IDs and status are required' },
      { status: 400 }
    )
  }

  if (orderIds.length > 50) {
    return NextResponse.json(
      { error: 'Cannot update more than 50 orders at once' },
      { status: 400 }
    )
  }

  try {
    // Get all orders to validate permissions and transitions
    const { data: orders, error: fetchError } = await supabase
      .from('orders')
      .select(`
        *,
        restaurants!inner(owner_id, id)
      `)
      .in('id', orderIds)

    if (fetchError || !orders) {
      return NextResponse.json(
        { error: 'Failed to fetch orders' },
        { status: 500 }
      )
    }

    if (orders.length !== orderIds.length) {
      return NextResponse.json(
        { error: 'Some orders were not found' },
        { status: 404 }
      )
    }

    // Check permissions for all orders
    const restaurantIds = [...new Set(orders.map(o => o.restaurant_id))]
    const permissionChecks = await Promise.all(
      restaurantIds.map(id => checkOrderUpdatePermission(supabase, userId, id))
    )

    if (permissionChecks.some(hasPermission => !hasPermission)) {
      return NextResponse.json(
        { error: 'Insufficient permissions for some orders' },
        { status: 403 }
      )
    }

    // Validate all transitions
    const invalidTransitions = orders.filter(order => 
      !isValidStatusTransition(order.status, status, order.type)
    )

    if (invalidTransitions.length > 0) {
      return NextResponse.json(
        { 
          error: 'Invalid status transitions detected',
          invalidOrders: invalidTransitions.map(o => ({
            id: o.id,
            orderNumber: o.order_number,
            currentStatus: o.status
          }))
        },
        { status: 400 }
      )
    }

    // Prepare bulk update
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (estimatedReadyTime) {
      updateData.estimated_ready_time = estimatedReadyTime
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    // Special handling for completion statuses
    if (status === 'ready' || status === 'completed' || status === 'delivered') {
      updateData.actual_ready_time = new Date().toISOString()
    }

    if (status === 'delivered') {
      updateData.delivered_at = new Date().toISOString()
    }

    // Perform bulk update
    const { data: updatedOrders, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .in('id', orderIds)
      .select(`
        *,
        order_items (
          id,
          name,
          quantity,
          price,
          notes,
          customizations
        )
      `)

    if (updateError) {
      console.error('Bulk order update error:', updateError)
      return NextResponse.json(
        { error: 'Failed to update order statuses' },
        { status: 500 }
      )
    }

    // Log all status changes
    const logPromises = orders.map(order => 
      logStatusChange(supabase, {
        orderId: order.id,
        fromStatus: order.status,
        toStatus: status,
        userId,
        timestamp: new Date().toISOString(),
        notes: `Bulk update: ${notes || ''}`
      })
    )

    await Promise.all(logPromises)

    // Send notifications for each updated order
    const notificationPromises = updatedOrders.map(updatedOrder => {
      const originalOrder = orders.find(o => o.id === updatedOrder.id)
      return sendStatusChangeNotifications(supabase, updatedOrder, originalOrder?.status)
    })

    await Promise.allSettled(notificationPromises)

    return NextResponse.json({
      success: true,
      updatedCount: updatedOrders.length,
      orders: updatedOrders,
      message: `${updatedOrders.length} orders updated to ${status}`
    })

  } catch (error) {
    console.error('Bulk order status update error:', error)
    return NextResponse.json(
      { error: 'Failed to update order statuses' },
      { status: 500 }
    )
  }
}

// Check if user has permission to update orders for a restaurant
async function checkOrderUpdatePermission(supabase: any, userId: string, restaurantId: string): Promise<boolean> {
  try {
    // Check if user is the restaurant owner
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('owner_id')
      .eq('id', restaurantId)
      .single()

    if (restaurantError || !restaurant) {
      return false
    }

    if (restaurant.owner_id === userId) {
      return true
    }

    // Check if user is staff member with appropriate permissions
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (userError || !userProfile) {
      return false
    }

    // Allow platform admins and restaurant staff
    const allowedRoles = ['super_admin', 'platform_admin', 'restaurant_admin', 'staff']
    return allowedRoles.includes(userProfile.role)

  } catch (error) {
    console.error('Permission check error:', error)
    return false
  }
}

// Log status changes for audit trail
async function logStatusChange(supabase: any, logData: {
  orderId: string
  fromStatus: OrderStatus
  toStatus: OrderStatus
  userId: string
  timestamp: string
  notes?: string
}) {
  try {
    // This would typically go to an audit log table
    // For now, we'll just console.log for demonstration
    console.log('Order status change logged:', logData)
    
    // In a real implementation, you might do:
    // await supabase.from('order_status_logs').insert({
    //   order_id: logData.orderId,
    //   from_status: logData.fromStatus,
    //   to_status: logData.toStatus,
    //   changed_by: logData.userId,
    //   changed_at: logData.timestamp,
    //   notes: logData.notes
    // })
  } catch (error) {
    console.error('Failed to log status change:', error)
    // Don't fail the main operation if logging fails
  }
}

// Send notifications for status changes
async function sendStatusChangeNotifications(supabase: any, order: any, previousStatus?: OrderStatus) {
  try {
    // Parse customer info
    const customerInfo = typeof order.customer_info === 'string' 
      ? JSON.parse(order.customer_info) 
      : order.customer_info || {}

    // Prepare notification data
    const notificationData = {
      orderId: order.id,
      orderNumber: order.order_number,
      status: order.status,
      previousStatus,
      customerEmail: customerInfo.email,
      customerPhone: customerInfo.phone,
      customerName: customerInfo.name || 'Customer',
      orderTotal: order.total,
      estimatedReadyTime: order.estimated_ready_time,
      restaurantId: order.restaurant_id
    }

    // Send notification via API
    await fetch('/api/notifications/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'order_status_update',
        data: notificationData
      })
    })

  } catch (error) {
    console.error('Failed to send status change notifications:', error)
    // Don't fail the main operation if notifications fail
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString()
  })
}