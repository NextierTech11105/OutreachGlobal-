/**
 * Nextier Lead Assistant - Background Service Worker
 *
 * Handles:
 * - Context menus
 * - Notifications
 * - Auth token management
 */

const API_BASE = 'https://monkfish-app-mb7h3.ondigitalocean.app';

// =============================================================================
// CONTEXT MENUS
// =============================================================================

chrome.runtime.onInstalled.addListener(() => {
  // Create context menu for capturing phone numbers
  chrome.contextMenus.create({
    id: 'capture-phone',
    title: 'Capture as Lead (Nextier)',
    contexts: ['selection'],
  });

  // Create context menu for sending SMS
  chrome.contextMenus.create({
    id: 'send-sms',
    title: 'Send SMS (Nextier)',
    contexts: ['selection'],
  });

  console.log('Nextier Lead Assistant installed');
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  const selectedText = info.selectionText?.trim();

  if (!selectedText) return;

  if (info.menuItemId === 'capture-phone') {
    // Check if it looks like a phone number
    const phoneRegex = /[\d\s\-\(\)\.]+/;
    if (phoneRegex.test(selectedText)) {
      await captureQuickLead(selectedText, tab.url);
    } else {
      // Try to capture as name
      await openCapturePopup({ name: selectedText, source: tab.url });
    }
  }

  if (info.menuItemId === 'send-sms') {
    // Normalize phone number
    const phone = selectedText.replace(/\D/g, '');
    if (phone.length >= 10) {
      await openSmsPopup(phone);
    }
  }
});

// =============================================================================
// MESSAGE HANDLING
// =============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'AUTH_SUCCESS') {
    // Handle auth callback from web
    chrome.storage.sync.set({
      authToken: request.token,
      user: request.user,
    });
    sendResponse({ success: true });
  }

  if (request.type === 'CHECK_AUTH') {
    chrome.storage.sync.get(['authToken']).then(data => {
      sendResponse({ authenticated: !!data.authToken });
    });
    return true; // Async response
  }

  if (request.type === 'GET_NOTIFICATIONS') {
    fetchNotifications().then(notifications => {
      sendResponse({ notifications });
    });
    return true;
  }
});

// =============================================================================
// NOTIFICATIONS
// =============================================================================

async function fetchNotifications() {
  try {
    const { authToken } = await chrome.storage.sync.get(['authToken']);
    if (!authToken) return [];

    const response = await fetch(`${API_BASE}/api/extension/notifications`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
      },
    });

    const data = await response.json();
    return data.notifications || [];
  } catch (error) {
    console.error('Failed to fetch notifications:', error);
    return [];
  }
}

async function showNotification(title, message, data = {}) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon128.png',
    title,
    message,
    priority: 2,
  });
}

// Poll for notifications every 5 minutes
setInterval(async () => {
  const { authToken } = await chrome.storage.sync.get(['authToken']);
  if (!authToken) return;

  const notifications = await fetchNotifications();

  for (const notif of notifications) {
    if (!notif.seen) {
      await showNotification(notif.title, notif.message);
    }
  }
}, 5 * 60 * 1000);

// =============================================================================
// UTILITIES
// =============================================================================

async function captureQuickLead(phone, sourceUrl) {
  try {
    const { authToken } = await chrome.storage.sync.get(['authToken']);

    if (!authToken) {
      await showNotification('Sign In Required', 'Please sign in to capture leads');
      return;
    }

    const normalizedPhone = phone.replace(/\D/g, '');

    const response = await fetch(`${API_BASE}/api/extension/capture-lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        phone: normalizedPhone,
        source: 'chrome_extension_context',
        sourceUrl,
      }),
    });

    const data = await response.json();

    if (data.success) {
      await showNotification('Lead Captured', `Phone: ${normalizedPhone}`);
    } else {
      await showNotification('Capture Failed', data.error || 'Unknown error');
    }
  } catch (error) {
    console.error('Quick capture failed:', error);
  }
}

async function openCapturePopup(data) {
  // Store data for popup to use
  await chrome.storage.local.set({ pendingCapture: data });

  // Open popup
  chrome.action.openPopup();
}

async function openSmsPopup(phone) {
  await chrome.storage.local.set({ pendingSms: phone });
  chrome.action.openPopup();
}

// =============================================================================
// TAB UPDATES
// =============================================================================

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  // Could inject content script dynamically if needed
});

console.log('Nextier Lead Assistant background script loaded');
