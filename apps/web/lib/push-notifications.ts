// ===========================================
// Push Notification Utilities
// ===========================================

import { authFetch } from './api';

// VAPID public key - must match the one on the server
// This will be fetched from the API
let vapidPublicKey: string | null = null;

/**
 * Check if push notifications are supported
 */
export function isPushSupported(): boolean {
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * Get the current notification permission status
 */
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Request notification permission from the user
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.warn('[Push] Notifications not supported');
    return 'denied';
  }

  const permission = await Notification.requestPermission();
  return permission;
}

/**
 * Register the service worker
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) {
    console.warn('[Push] Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });
    return registration;
  } catch (error) {
    console.error('[Push] Service worker registration failed:', error);
    return null;
  }
}

/**
 * Get the VAPID public key from the server
 */
async function getVapidPublicKey(): Promise<string | null> {
  if (vapidPublicKey) return vapidPublicKey;

  try {
    const response = await authFetch('/api/alerts/vapid-public-key');
    const data = await response.json();

    if (data.success && data.data?.publicKey) {
      vapidPublicKey = data.data.publicKey;
      return vapidPublicKey;
    }
  } catch (error) {
    console.error('[Push] Failed to get VAPID public key:', error);
  }

  return null;
}

/**
 * Convert URL-safe base64 to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPush(): Promise<PushSubscription | null> {
  // Check support
  if (!isPushSupported()) {
    console.warn('[Push] Push notifications not supported');
    return null;
  }

  // Request permission
  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    console.warn('[Push] Notification permission denied');
    return null;
  }

  // Register service worker
  const registration = await registerServiceWorker();
  if (!registration) {
    console.error('[Push] No service worker registration');
    return null;
  }

  // Wait for service worker to be ready
  await navigator.serviceWorker.ready;

  // Get VAPID public key
  const publicKey = await getVapidPublicKey();
  if (!publicKey) {
    console.error('[Push] No VAPID public key');
    return null;
  }

  try {
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Create new subscription
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
    }

    // Save subscription to server
    await saveSubscriptionToServer(subscription);

    return subscription;
  } catch (error) {
    console.error('[Push] Failed to subscribe:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      await removeSubscriptionFromServer();
      return true;
    }

    return false;
  } catch (error) {
    console.error('[Push] Failed to unsubscribe:', error);
    return false;
  }
}

/**
 * Save push subscription to server
 */
async function saveSubscriptionToServer(subscription: PushSubscription): Promise<void> {
  try {
    const response = await authFetch('/api/alerts/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        browserPush: {
          enabled: true,
          subscription: subscription.toJSON(),
        },
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error?.message || 'Failed to save subscription');
    }

  } catch (error) {
    console.error('[Push] Failed to save subscription:', error);
    throw error;
  }
}

/**
 * Remove push subscription from server
 */
async function removeSubscriptionFromServer(): Promise<void> {
  try {
    const response = await authFetch('/api/alerts/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        browserPush: {
          enabled: false,
          subscription: null,
        },
      }),
    });

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error?.message || 'Failed to remove subscription');
    }

  } catch (error) {
    console.error('[Push] Failed to remove subscription:', error);
    throw error;
  }
}

/**
 * Check if user is subscribed to push notifications
 */
export async function isSubscribedToPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch {
    return false;
  }
}

/**
 * Send a test notification (for debugging)
 */
export async function sendTestNotification(): Promise<void> {
  if (getNotificationPermission() !== 'granted') {
    console.warn('[Push] Permission not granted');
    return;
  }

  const registration = await navigator.serviceWorker.ready;

  registration.showNotification('TraderPath Test', {
    body: 'Push notifications are working!',
    icon: '/logo.svg',
    badge: '/logo.svg',
    tag: 'test-notification',
  });
}
