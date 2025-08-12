/**
 * Cloudflare Durable Objects for Real-time Features
 * Handles order tracking and notification management with WebSocket connections
 */

import type { CloudflareEnv } from '../../env';

/**
 * Order Tracker Durable Object
 * Manages real-time order status updates and WebSocket connections
 */
export class OrderTracker {
  private state: DurableObjectState;
  private env: CloudflareEnv;
  private sessions: Map<string, WebSocket> = new Map();
  private orderData: Map<string, any> = new Map();

  constructor(state: DurableObjectState, env: CloudflareEnv) {
    this.state = state;
    this.env = env;
    
    // Initialize from storage on startup
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.list();
      for (const [key, value] of stored) {
        if (key.startsWith('order:')) {
          this.orderData.set(key.replace('order:', ''), value);
        }
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    switch (url.pathname) {
      case '/websocket':
        return this.handleWebSocket(request);
      case '/order':
        return this.handleOrderUpdate(request);
      case '/status':
        return this.handleStatusRequest(request);
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  /**
   * Handle WebSocket connection for real-time updates
   */
  private async handleWebSocket(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected websocket', { status: 400 });
    }

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('sessionId');
    const restaurantId = url.searchParams.get('restaurantId');

    if (!sessionId || !restaurantId) {
      return new Response('Missing sessionId or restaurantId', { status: 400 });
    }

    const [client, server] = Object.values(new WebSocketPair());

    // Accept the WebSocket connection
    await this.handleWebSocketConnection(server, sessionId, restaurantId);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Handle new WebSocket connection
   */
  private async handleWebSocketConnection(
    webSocket: WebSocket,
    sessionId: string,
    restaurantId: string
  ): Promise<void> {
    webSocket.accept();
    
    // Store the session
    this.sessions.set(sessionId, webSocket);

    // Send current order status if available
    const userOrders = await this.getUserOrders(sessionId, restaurantId);
    if (userOrders.length > 0) {
      webSocket.send(JSON.stringify({
        type: 'initial_orders',
        orders: userOrders,
      }));
    }

    // Handle incoming messages
    webSocket.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data as string);
        await this.handleWebSocketMessage(sessionId, restaurantId, data);
      } catch (error) {
        console.error('Error handling WebSocket message:', error);
      }
    });

    // Handle connection close
    webSocket.addEventListener('close', () => {
      this.sessions.delete(sessionId);
    });
  }

  /**
   * Handle WebSocket messages
   */
  private async handleWebSocketMessage(
    sessionId: string,
    restaurantId: string,
    message: any
  ): Promise<void> {
    switch (message.type) {
      case 'subscribe_order':
        await this.subscribeToOrder(sessionId, message.orderId);
        break;
      case 'unsubscribe_order':
        await this.unsubscribeFromOrder(sessionId, message.orderId);
        break;
      case 'ping':
        const ws = this.sessions.get(sessionId);
        if (ws) {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
        break;
    }
  }

  /**
   * Handle order status updates via HTTP
   */
  private async handleOrderUpdate(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const data = await request.json();
      const { orderId, status, restaurantId, userId } = data;

      if (!orderId || !status || !restaurantId) {
        return new Response('Missing required fields', { status: 400 });
      }

      await this.updateOrderStatus(orderId, status, restaurantId, userId, data);

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error updating order:', error);
      return new Response('Internal error', { status: 500 });
    }
  }

  /**
   * Update order status and notify connected clients
   */
  private async updateOrderStatus(
    orderId: string,
    status: string,
    restaurantId: string,
    userId?: string,
    additionalData?: any
  ): Promise<void> {
    const orderKey = `order:${orderId}`;
    const orderData = {
      id: orderId,
      status,
      restaurantId,
      userId,
      updatedAt: new Date().toISOString(),
      ...additionalData,
    };

    // Store in Durable Object storage
    await this.state.storage.put(orderKey, orderData);
    this.orderData.set(orderId, orderData);

    // Notify all connected sessions
    const message = JSON.stringify({
      type: 'order_update',
      order: orderData,
    });

    for (const [sessionId, ws] of this.sessions) {
      try {
        ws.send(message);
      } catch (error) {
        // Remove dead connections
        this.sessions.delete(sessionId);
      }
    }

    // Send to notification queue for additional processing
    if (this.env.EMAIL_QUEUE) {
      await this.env.EMAIL_QUEUE.send({
        type: 'order_status_change',
        orderId,
        status,
        restaurantId,
        userId,
      });
    }
  }

  /**
   * Get user's orders
   */
  private async getUserOrders(sessionId: string, restaurantId: string): Promise<any[]> {
    const orders = [];
    for (const [orderId, orderData] of this.orderData) {
      if (orderData.restaurantId === restaurantId) {
        orders.push(orderData);
      }
    }
    return orders;
  }

  /**
   * Subscribe to order updates
   */
  private async subscribeToOrder(sessionId: string, orderId: string): Promise<void> {
    // Implementation for order-specific subscriptions
    const orderData = this.orderData.get(orderId);
    if (orderData) {
      const ws = this.sessions.get(sessionId);
      if (ws) {
        ws.send(JSON.stringify({
          type: 'order_subscribed',
          order: orderData,
        }));
      }
    }
  }

  /**
   * Unsubscribe from order updates
   */
  private async unsubscribeFromOrder(sessionId: string, orderId: string): Promise<void> {
    const ws = this.sessions.get(sessionId);
    if (ws) {
      ws.send(JSON.stringify({
        type: 'order_unsubscribed',
        orderId,
      }));
    }
  }

  /**
   * Handle status requests
   */
  private async handleStatusRequest(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const orderId = url.searchParams.get('orderId');

    if (!orderId) {
      return new Response('Missing orderId', { status: 400 });
    }

    const orderData = this.orderData.get(orderId);
    if (!orderData) {
      return new Response('Order not found', { status: 404 });
    }

    return new Response(JSON.stringify(orderData), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Notification Manager Durable Object
 * Manages system-wide notifications and announcements
 */
export class NotificationManager {
  private state: DurableObjectState;
  private env: CloudflareEnv;
  private connections: Map<string, WebSocket> = new Map();
  private notifications: Map<string, any> = new Map();

  constructor(state: DurableObjectState, env: CloudflareEnv) {
    this.state = state;
    this.env = env;

    // Initialize from storage
    this.state.blockConcurrencyWhile(async () => {
      const stored = await this.state.storage.list();
      for (const [key, value] of stored) {
        if (key.startsWith('notification:')) {
          this.notifications.set(key.replace('notification:', ''), value);
        }
      }
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    
    switch (url.pathname) {
      case '/websocket':
        return this.handleWebSocket(request);
      case '/broadcast':
        return this.handleBroadcast(request);
      case '/targeted':
        return this.handleTargetedNotification(request);
      default:
        return new Response('Not found', { status: 404 });
    }
  }

  /**
   * Handle WebSocket connections for notifications
   */
  private async handleWebSocket(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get('Upgrade');
    if (upgradeHeader !== 'websocket') {
      return new Response('Expected websocket', { status: 400 });
    }

    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const restaurantId = url.searchParams.get('restaurantId');

    if (!userId) {
      return new Response('Missing userId', { status: 400 });
    }

    const [client, server] = Object.values(new WebSocketPair());

    await this.handleNotificationConnection(server, userId, restaurantId);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  /**
   * Handle notification WebSocket connection
   */
  private async handleNotificationConnection(
    webSocket: WebSocket,
    userId: string,
    restaurantId?: string
  ): Promise<void> {
    webSocket.accept();
    
    const connectionKey = restaurantId ? `${userId}:${restaurantId}` : userId;
    this.connections.set(connectionKey, webSocket);

    // Send pending notifications
    await this.sendPendingNotifications(userId, restaurantId);

    webSocket.addEventListener('close', () => {
      this.connections.delete(connectionKey);
    });

    webSocket.addEventListener('message', async (event) => {
      try {
        const data = JSON.parse(event.data as string);
        await this.handleNotificationMessage(userId, restaurantId, data);
      } catch (error) {
        console.error('Error handling notification message:', error);
      }
    });
  }

  /**
   * Handle notification messages
   */
  private async handleNotificationMessage(
    userId: string,
    restaurantId: string | undefined,
    message: any
  ): Promise<void> {
    switch (message.type) {
      case 'mark_read':
        await this.markNotificationRead(message.notificationId);
        break;
      case 'mark_all_read':
        await this.markAllNotificationsRead(userId, restaurantId);
        break;
    }
  }

  /**
   * Handle broadcast notifications
   */
  private async handleBroadcast(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const data = await request.json();
      const { message, type, priority, restaurantId } = data;

      await this.broadcastNotification({
        id: crypto.randomUUID(),
        message,
        type: type || 'info',
        priority: priority || 'normal',
        restaurantId,
        createdAt: new Date().toISOString(),
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error broadcasting notification:', error);
      return new Response('Internal error', { status: 500 });
    }
  }

  /**
   * Handle targeted notifications
   */
  private async handleTargetedNotification(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      const data = await request.json();
      const { userId, restaurantId, message, type, priority } = data;

      await this.sendTargetedNotification(userId, restaurantId, {
        id: crypto.randomUUID(),
        message,
        type: type || 'info',
        priority: priority || 'normal',
        createdAt: new Date().toISOString(),
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error sending targeted notification:', error);
      return new Response('Internal error', { status: 500 });
    }
  }

  /**
   * Broadcast notification to all connected clients
   */
  private async broadcastNotification(notification: any): Promise<void> {
    const notificationKey = `notification:${notification.id}`;
    await this.state.storage.put(notificationKey, notification);
    this.notifications.set(notification.id, notification);

    const message = JSON.stringify({
      type: 'notification',
      notification,
    });

    // Send to all connected clients
    for (const [connectionKey, ws] of this.connections) {
      // Filter by restaurant if specified
      if (notification.restaurantId) {
        const [, restaurantId] = connectionKey.split(':');
        if (restaurantId !== notification.restaurantId) {
          continue;
        }
      }

      try {
        ws.send(message);
      } catch (error) {
        // Remove dead connections
        this.connections.delete(connectionKey);
      }
    }
  }

  /**
   * Send targeted notification to specific user
   */
  private async sendTargetedNotification(
    userId: string,
    restaurantId: string | undefined,
    notification: any
  ): Promise<void> {
    const notificationKey = `notification:${notification.id}`;
    await this.state.storage.put(notificationKey, {
      ...notification,
      userId,
      restaurantId,
    });

    const connectionKey = restaurantId ? `${userId}:${restaurantId}` : userId;
    const ws = this.connections.get(connectionKey);

    if (ws) {
      try {
        ws.send(JSON.stringify({
          type: 'notification',
          notification,
        }));
      } catch (error) {
        // Remove dead connection
        this.connections.delete(connectionKey);
      }
    }
  }

  /**
   * Send pending notifications to newly connected user
   */
  private async sendPendingNotifications(
    userId: string,
    restaurantId?: string
  ): Promise<void> {
    const pendingNotifications = [];
    
    for (const [id, notification] of this.notifications) {
      // Filter notifications for this user/restaurant
      if (notification.userId && notification.userId !== userId) continue;
      if (notification.restaurantId && notification.restaurantId !== restaurantId) continue;
      if (notification.read) continue;

      pendingNotifications.push(notification);
    }

    const connectionKey = restaurantId ? `${userId}:${restaurantId}` : userId;
    const ws = this.connections.get(connectionKey);

    if (ws && pendingNotifications.length > 0) {
      ws.send(JSON.stringify({
        type: 'pending_notifications',
        notifications: pendingNotifications,
      }));
    }
  }

  /**
   * Mark notification as read
   */
  private async markNotificationRead(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.read = true;
      notification.readAt = new Date().toISOString();
      
      const notificationKey = `notification:${notificationId}`;
      await this.state.storage.put(notificationKey, notification);
      this.notifications.set(notificationId, notification);
    }
  }

  /**
   * Mark all notifications as read for user
   */
  private async markAllNotificationsRead(
    userId: string,
    restaurantId?: string
  ): Promise<void> {
    const updates = [];
    
    for (const [id, notification] of this.notifications) {
      if (notification.userId === userId && 
          (!restaurantId || notification.restaurantId === restaurantId) &&
          !notification.read) {
        notification.read = true;
        notification.readAt = new Date().toISOString();
        updates.push([`notification:${id}`, notification]);
      }
    }

    if (updates.length > 0) {
      await this.state.storage.put(Object.fromEntries(updates));
    }
  }
}

/**
 * Durable Object utilities for accessing from Next.js
 */
export function createDurableObjectUtils(env: CloudflareEnv) {
  return {
    /**
     * Get Order Tracker instance
     */
    getOrderTracker: (orderId: string) => {
      const id = env.ORDER_TRACKER.idFromName(orderId);
      return env.ORDER_TRACKER.get(id);
    },

    /**
     * Get Notification Manager instance
     */
    getNotificationManager: (restaurantId?: string) => {
      const id = restaurantId 
        ? env.NOTIFICATION_MANAGER.idFromName(restaurantId)
        : env.NOTIFICATION_MANAGER.idFromName('global');
      return env.NOTIFICATION_MANAGER.get(id);
    },

    /**
     * Update order status via Durable Object
     */
    updateOrderStatus: async (orderId: string, status: string, data: any) => {
      const orderTracker = env.ORDER_TRACKER.get(
        env.ORDER_TRACKER.idFromName(orderId)
      );
      
      return orderTracker.fetch(new Request('https://dummy/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, status, ...data }),
      }));
    },

    /**
     * Send notification via Durable Object
     */
    sendNotification: async (type: 'broadcast' | 'targeted', data: any) => {
      const restaurantId = data.restaurantId || 'global';
      const notificationManager = env.NOTIFICATION_MANAGER.get(
        env.NOTIFICATION_MANAGER.idFromName(restaurantId)
      );
      
      return notificationManager.fetch(new Request(`https://dummy/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }));
    },
  };
}