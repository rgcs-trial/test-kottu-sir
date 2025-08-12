import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { ORDER_STATUS_CONFIG } from '@/lib/realtime/order-tracking'
import { Database } from '@/lib/supabase/types'

type OrderStatus = Database['public']['Enums']['order_status']

interface OrderStatusUpdateNotification {
  type: 'order_status_update'
  data: {
    orderId: string
    orderNumber: string
    status: OrderStatus
    previousStatus?: OrderStatus
    customerEmail?: string
    customerPhone?: string
    customerName: string
    orderTotal: number
    estimatedReadyTime?: string
    restaurantId: string
  }
}

interface NewOrderNotification {
  type: 'new_order'
  data: {
    orderId: string
    orderNumber: string
    customerName: string
    orderTotal: number
    orderType: string
    restaurantId: string
    staffEmails?: string[]
  }
}

interface OrderOverdueNotification {
  type: 'order_overdue'
  data: {
    orderId: string
    orderNumber: string
    customerName: string
    minutesOverdue: number
    restaurantId: string
    staffEmails?: string[]
  }
}

type NotificationRequest = 
  | OrderStatusUpdateNotification 
  | NewOrderNotification 
  | OrderOverdueNotification

interface EmailTemplate {
  subject: string
  html: string
  text: string
}

interface SMSTemplate {
  message: string
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient()
    
    // Get the current user (for audit logging)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // Allow unauthenticated requests for system notifications
    // but log them differently
    
    const body: NotificationRequest = await request.json()
    
    if (!body.type || !body.data) {
      return NextResponse.json(
        { error: 'Notification type and data are required' },
        { status: 400 }
      )
    }

    switch (body.type) {
      case 'order_status_update':
        return await handleOrderStatusUpdateNotification(supabase, body, user?.id)
      
      case 'new_order':
        return await handleNewOrderNotification(supabase, body, user?.id)
      
      case 'order_overdue':
        return await handleOrderOverdueNotification(supabase, body, user?.id)
      
      default:
        return NextResponse.json(
          { error: 'Unknown notification type' },
          { status: 400 }
        )
    }

  } catch (error) {
    console.error('Notification sending error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handleOrderStatusUpdateNotification(
  supabase: any,
  notification: OrderStatusUpdateNotification,
  userId?: string
) {
  const { data } = notification

  try {
    // Get restaurant information
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('name, email, phone')
      .eq('id', data.restaurantId)
      .single()

    if (restaurantError) {
      console.error('Failed to fetch restaurant:', restaurantError)
    }

    // Get notification preferences (you'd implement this based on your needs)
    const preferences = await getNotificationPreferences(supabase, data.restaurantId)

    const results: any = {
      success: true,
      sent: [],
      failed: []
    }

    // Send customer email notification
    if (data.customerEmail && preferences.customerEmail) {
      try {
        const emailTemplate = generateOrderStatusEmailTemplate(data, restaurant?.name)
        await sendEmail({
          to: data.customerEmail,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text
        })
        results.sent.push({ type: 'email', recipient: data.customerEmail })
      } catch (error) {
        console.error('Failed to send customer email:', error)
        results.failed.push({ type: 'email', recipient: data.customerEmail, error: error.message })
      }
    }

    // Send customer SMS notification
    if (data.customerPhone && preferences.customerSMS) {
      try {
        const smsTemplate = generateOrderStatusSMSTemplate(data, restaurant?.name)
        await sendSMS({
          to: data.customerPhone,
          message: smsTemplate.message
        })
        results.sent.push({ type: 'sms', recipient: data.customerPhone })
      } catch (error) {
        console.error('Failed to send customer SMS:', error)
        results.failed.push({ type: 'sms', recipient: data.customerPhone, error: error.message })
      }
    }

    // Send push notification if customer has app (placeholder)
    if (preferences.customerPush) {
      try {
        await sendPushNotification({
          orderId: data.orderId,
          title: 'Order Update',
          body: `Your order #${data.orderNumber} is now ${ORDER_STATUS_CONFIG[data.status].label.toLowerCase()}`,
          data: {
            orderId: data.orderId,
            status: data.status,
            type: 'order_status_update'
          }
        })
        results.sent.push({ type: 'push', recipient: 'customer' })
      } catch (error) {
        console.error('Failed to send push notification:', error)
        results.failed.push({ type: 'push', recipient: 'customer', error: error.message })
      }
    }

    // Log notification
    await logNotification(supabase, {
      type: 'order_status_update',
      orderId: data.orderId,
      restaurantId: data.restaurantId,
      recipients: results.sent,
      status: 'completed',
      sentBy: userId,
      sentAt: new Date().toISOString()
    })

    return NextResponse.json(results)

  } catch (error) {
    console.error('Order status notification error:', error)
    return NextResponse.json(
      { error: 'Failed to send order status notifications' },
      { status: 500 }
    )
  }
}

async function handleNewOrderNotification(
  supabase: any,
  notification: NewOrderNotification,
  userId?: string
) {
  const { data } = notification

  try {
    // Get restaurant staff emails
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select(`
        name,
        email,
        owner_id,
        users!restaurants_owner_id_fkey(email)
      `)
      .eq('id', data.restaurantId)
      .single()

    if (restaurantError) {
      console.error('Failed to fetch restaurant:', restaurantError)
    }

    // Get additional staff members (you'd need to implement staff relationship)
    const staffEmails = data.staffEmails || []
    if (restaurant?.users?.email) {
      staffEmails.push(restaurant.users.email)
    }

    const results: any = {
      success: true,
      sent: [],
      failed: []
    }

    // Send notifications to staff
    for (const email of staffEmails) {
      try {
        const emailTemplate = generateNewOrderEmailTemplate(data, restaurant?.name)
        await sendEmail({
          to: email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text
        })
        results.sent.push({ type: 'email', recipient: email })
      } catch (error) {
        console.error(`Failed to send staff email to ${email}:`, error)
        results.failed.push({ type: 'email', recipient: email, error: error.message })
      }
    }

    // Send SMS to restaurant phone if configured
    if (restaurant?.phone) {
      try {
        const smsTemplate = generateNewOrderSMSTemplate(data)
        await sendSMS({
          to: restaurant.phone,
          message: smsTemplate.message
        })
        results.sent.push({ type: 'sms', recipient: restaurant.phone })
      } catch (error) {
        console.error('Failed to send restaurant SMS:', error)
        results.failed.push({ type: 'sms', recipient: restaurant.phone, error: error.message })
      }
    }

    // Log notification
    await logNotification(supabase, {
      type: 'new_order',
      orderId: data.orderId,
      restaurantId: data.restaurantId,
      recipients: results.sent,
      status: 'completed',
      sentBy: userId,
      sentAt: new Date().toISOString()
    })

    return NextResponse.json(results)

  } catch (error) {
    console.error('New order notification error:', error)
    return NextResponse.json(
      { error: 'Failed to send new order notifications' },
      { status: 500 }
    )
  }
}

async function handleOrderOverdueNotification(
  supabase: any,
  notification: OrderOverdueNotification,
  userId?: string
) {
  const { data } = notification

  try {
    // Get restaurant information
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select(`
        name,
        email,
        phone,
        owner_id,
        users!restaurants_owner_id_fkey(email)
      `)
      .eq('id', data.restaurantId)
      .single()

    if (restaurantError) {
      console.error('Failed to fetch restaurant:', restaurantError)
    }

    const staffEmails = data.staffEmails || []
    if (restaurant?.users?.email) {
      staffEmails.push(restaurant.users.email)
    }

    const results: any = {
      success: true,
      sent: [],
      failed: []
    }

    // Send urgent notifications to staff
    for (const email of staffEmails) {
      try {
        const emailTemplate = generateOrderOverdueEmailTemplate(data, restaurant?.name)
        await sendEmail({
          to: email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text,
          priority: 'high'
        })
        results.sent.push({ type: 'email', recipient: email })
      } catch (error) {
        console.error(`Failed to send overdue email to ${email}:`, error)
        results.failed.push({ type: 'email', recipient: email, error: error.message })
      }
    }

    // Send urgent SMS
    if (restaurant?.phone) {
      try {
        const smsTemplate = generateOrderOverdueSMSTemplate(data)
        await sendSMS({
          to: restaurant.phone,
          message: smsTemplate.message
        })
        results.sent.push({ type: 'sms', recipient: restaurant.phone })
      } catch (error) {
        console.error('Failed to send overdue SMS:', error)
        results.failed.push({ type: 'sms', recipient: restaurant.phone, error: error.message })
      }
    }

    // Log notification
    await logNotification(supabase, {
      type: 'order_overdue',
      orderId: data.orderId,
      restaurantId: data.restaurantId,
      recipients: results.sent,
      status: 'completed',
      sentBy: userId,
      sentAt: new Date().toISOString()
    })

    return NextResponse.json(results)

  } catch (error) {
    console.error('Order overdue notification error:', error)
    return NextResponse.json(
      { error: 'Failed to send order overdue notifications' },
      { status: 500 }
    )
  }
}

// Email template generators
function generateOrderStatusEmailTemplate(data: OrderStatusUpdateNotification['data'], restaurantName?: string): EmailTemplate {
  const statusConfig = ORDER_STATUS_CONFIG[data.status]
  const subject = `Order Update: ${statusConfig.label} - #${data.orderNumber}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Update</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; }
        .footer { margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 8px; font-size: 14px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Order Update</h1>
          <p>Hello ${data.customerName},</p>
        </div>
        
        <p>Your order <strong>#${data.orderNumber}</strong> from ${restaurantName || 'the restaurant'} has been updated.</p>
        
        <div class="status-badge" style="background: ${statusConfig.color.includes('green') ? '#d4edda' : statusConfig.color.includes('blue') ? '#d1ecf1' : statusConfig.color.includes('orange') ? '#fff3cd' : '#f8d7da'};">
          ${statusConfig.icon} ${statusConfig.label}
        </div>
        
        <p style="margin-top: 20px;">${statusConfig.description}</p>
        
        ${data.estimatedReadyTime ? `
          <p><strong>Estimated Ready Time:</strong> ${new Date(data.estimatedReadyTime).toLocaleString()}</p>
        ` : ''}
        
        <p><strong>Order Total:</strong> $${data.orderTotal.toFixed(2)}</p>
        
        <div class="footer">
          <p>Thank you for your order!</p>
          <p>If you have any questions, please contact the restaurant directly.</p>
        </div>
      </div>
    </body>
    </html>
  `
  
  const text = `
    Order Update - #${data.orderNumber}
    
    Hello ${data.customerName},
    
    Your order #${data.orderNumber} from ${restaurantName || 'the restaurant'} has been updated.
    
    Status: ${statusConfig.label}
    ${statusConfig.description}
    
    ${data.estimatedReadyTime ? `Estimated Ready Time: ${new Date(data.estimatedReadyTime).toLocaleString()}` : ''}
    Order Total: $${data.orderTotal.toFixed(2)}
    
    Thank you for your order!
  `
  
  return { subject, html, text }
}

function generateOrderStatusSMSTemplate(data: OrderStatusUpdateNotification['data'], restaurantName?: string): SMSTemplate {
  const statusConfig = ORDER_STATUS_CONFIG[data.status]
  const message = `${restaurantName || 'Restaurant'}: Your order #${data.orderNumber} is now ${statusConfig.label.toLowerCase()}. ${data.estimatedReadyTime ? `Ready by ${new Date(data.estimatedReadyTime).toLocaleTimeString()}` : ''}`
  
  return { message }
}

function generateNewOrderEmailTemplate(data: NewOrderNotification['data'], restaurantName?: string): EmailTemplate {
  const subject = `New Order Received - #${data.orderNumber}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>New Order</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .alert { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
        .order-details { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="alert">
          <h2>🔔 New Order Received!</h2>
        </div>
        
        <div class="order-details">
          <h3>Order #${data.orderNumber}</h3>
          <p><strong>Customer:</strong> ${data.customerName}</p>
          <p><strong>Type:</strong> ${data.orderType}</p>
          <p><strong>Total:</strong> $${data.orderTotal.toFixed(2)}</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
        </div>
        
        <p>Please check your kitchen display or restaurant dashboard for full order details.</p>
        
        <p style="color: #666; font-size: 14px;">
          This is an automated notification from your ${restaurantName || 'restaurant'} order management system.
        </p>
      </div>
    </body>
    </html>
  `
  
  const text = `
    New Order Received!
    
    Order #${data.orderNumber}
    Customer: ${data.customerName}
    Type: ${data.orderType}
    Total: $${data.orderTotal.toFixed(2)}
    Time: ${new Date().toLocaleString()}
    
    Please check your kitchen display for full details.
  `
  
  return { subject, html, text }
}

function generateNewOrderSMSTemplate(data: NewOrderNotification['data']): SMSTemplate {
  const message = `New order #${data.orderNumber} from ${data.customerName}. Total: $${data.orderTotal.toFixed(2)}. Check your kitchen display.`
  return { message }
}

function generateOrderOverdueEmailTemplate(data: OrderOverdueNotification['data'], restaurantName?: string): EmailTemplate {
  const subject = `🚨 URGENT: Order Overdue - #${data.orderNumber}`
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Order Overdue</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .urgent { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; padding: 15px; border-radius: 4px; margin-bottom: 20px; }
        .order-details { background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #ffeaa7; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="urgent">
          <h2>🚨 URGENT: Order Overdue</h2>
        </div>
        
        <div class="order-details">
          <h3>Order #${data.orderNumber}</h3>
          <p><strong>Customer:</strong> ${data.customerName}</p>
          <p><strong>Overdue by:</strong> ${data.minutesOverdue} minutes</p>
          <p><strong>Action Required:</strong> Please check order status immediately</p>
        </div>
        
        <p>This order requires immediate attention. Please check your kitchen display and update the order status.</p>
        
        <p style="color: #721c24; font-weight: bold;">
          Customer satisfaction may be affected. Please prioritize this order.
        </p>
      </div>
    </body>
    </html>
  `
  
  const text = `
    URGENT: Order Overdue
    
    Order #${data.orderNumber}
    Customer: ${data.customerName}
    Overdue by: ${data.minutesOverdue} minutes
    
    This order requires immediate attention.
    Please check your kitchen display and update the order status.
  `
  
  return { subject, html, text }
}

function generateOrderOverdueSMSTemplate(data: OrderOverdueNotification['data']): SMSTemplate {
  const message = `URGENT: Order #${data.orderNumber} is ${data.minutesOverdue} minutes overdue. Customer: ${data.customerName}. Please check immediately.`
  return { message }
}

// Notification service implementations (mock implementations)
async function sendEmail(options: {
  to: string
  subject: string
  html: string
  text: string
  priority?: 'high' | 'normal'
}) {
  // In a real implementation, you'd use a service like SendGrid, AWS SES, etc.
  console.log('Sending email:', options)
  
  // Mock implementation - replace with actual email service
  // Example with SendGrid:
  /*
  const sgMail = require('@sendgrid/mail')
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  
  await sgMail.send({
    to: options.to,
    from: process.env.FROM_EMAIL,
    subject: options.subject,
    html: options.html,
    text: options.text
  })
  */
  
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100))
}

async function sendSMS(options: {
  to: string
  message: string
}) {
  // In a real implementation, you'd use a service like Twilio, AWS SNS, etc.
  console.log('Sending SMS:', options)
  
  // Mock implementation - replace with actual SMS service
  // Example with Twilio:
  /*
  const twilio = require('twilio')
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  
  await client.messages.create({
    body: options.message,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: options.to
  })
  */
  
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100))
}

async function sendPushNotification(options: {
  orderId: string
  title: string
  body: string
  data: any
}) {
  // In a real implementation, you'd use Firebase Cloud Messaging, OneSignal, etc.
  console.log('Sending push notification:', options)
  
  // Mock implementation
  await new Promise(resolve => setTimeout(resolve, 100))
}

// Get notification preferences for a restaurant
async function getNotificationPreferences(supabase: any, restaurantId: string) {
  // In a real implementation, you'd fetch from a preferences table
  // For now, return default preferences
  return {
    customerEmail: true,
    customerSMS: true,
    customerPush: true,
    staffEmail: true,
    staffSMS: true
  }
}

// Log notification for audit trail
async function logNotification(supabase: any, logData: any) {
  try {
    // In a real implementation, you'd save to a notifications_log table
    console.log('Notification logged:', logData)
    
    // Example:
    // await supabase.from('notifications_log').insert({
    //   type: logData.type,
    //   order_id: logData.orderId,
    //   restaurant_id: logData.restaurantId,
    //   recipients: logData.recipients,
    //   status: logData.status,
    //   sent_by: logData.sentBy,
    //   sent_at: logData.sentAt
    // })
  } catch (error) {
    console.error('Failed to log notification:', error)
  }
}

// Health check
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    services: {
      email: 'available',
      sms: 'available',
      push: 'available'
    },
    timestamp: new Date().toISOString()
  })
}