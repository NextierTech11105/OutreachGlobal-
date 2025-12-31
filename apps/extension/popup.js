/**
 * Nextier Lead Assistant - Popup Script
 *
 * Handles lead capture, quick actions, and cadence management
 */

const API_BASE = 'https://monkfish-app-mb7h3.ondigitalocean.app';

// =============================================================================
// STATE
// =============================================================================

let state = {
  user: null,
  campaigns: [],
  cadences: [],
  detectedContact: null,
};

// =============================================================================
// INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuth();
  setupTabNavigation();
  setupEventListeners();
  await detectContactOnPage();
});

// =============================================================================
// AUTHENTICATION
// =============================================================================

async function checkAuth() {
  const data = await chrome.storage.sync.get(['authToken', 'user']);

  if (data.authToken && data.user) {
    state.user = data.user;
    showMainContent();
    await loadCampaigns();
    await loadCadences();
  } else {
    showAuthRequired();
  }
}

function showAuthRequired() {
  document.getElementById('auth-required').classList.remove('hidden');
  document.getElementById('main-content').classList.add('hidden');
}

function showMainContent() {
  document.getElementById('auth-required').classList.add('hidden');
  document.getElementById('main-content').classList.remove('hidden');
  document.getElementById('user-email').textContent = state.user?.email || '';
}

async function handleLogin() {
  // Open Nextier login page
  chrome.tabs.create({
    url: `${API_BASE}/auth/extension-login`
  });
}

async function handleLogout() {
  await chrome.storage.sync.remove(['authToken', 'user']);
  state.user = null;
  showAuthRequired();
}

// =============================================================================
// TAB NAVIGATION
// =============================================================================

function setupTabNavigation() {
  const tabs = document.querySelectorAll('.tab');
  const contents = document.querySelectorAll('.tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = `tab-${tab.dataset.tab}`;

      tabs.forEach(t => t.classList.remove('active'));
      contents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      document.getElementById(targetId).classList.add('active');
    });
  });
}

// =============================================================================
// EVENT LISTENERS
// =============================================================================

function setupEventListeners() {
  // Auth buttons
  document.getElementById('login-btn')?.addEventListener('click', handleLogin);
  document.getElementById('logout-btn')?.addEventListener('click', handleLogout);

  // Capture form
  document.getElementById('capture-form')?.addEventListener('submit', handleCaptureLead);

  // Quick actions
  document.getElementById('action-sms')?.addEventListener('click', showSmsForm);
  document.getElementById('action-call')?.addEventListener('click', handleCall);
  document.getElementById('action-email')?.addEventListener('click', handleEmail);
  document.getElementById('action-callback')?.addEventListener('click', handleScheduleCallback);

  // SMS form
  document.getElementById('sms-cancel')?.addEventListener('click', hideSmsForm);
  document.getElementById('sms-send')?.addEventListener('click', handleSendSms);

  // Cadence form
  document.getElementById('add-cadence-form')?.addEventListener('submit', handleAddToCadence);
  document.getElementById('create-cadence-btn')?.addEventListener('click', handleCreateCadence);
}

// =============================================================================
// CONTACT DETECTION
// =============================================================================

async function detectContactOnPage() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Send message to content script
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'DETECT_CONTACT' });

    if (response && response.contact) {
      state.detectedContact = response.contact;
      displayDetectedContact(response.contact);
      autofillCaptureForm(response.contact);
    }
  } catch (error) {
    console.log('Contact detection not available on this page');
  }
}

function displayDetectedContact(contact) {
  const container = document.getElementById('detected-info');

  if (!contact.email && !contact.phone && !contact.name) {
    container.innerHTML = '<p class="empty-state">No contact info detected on this page.</p>';
    return;
  }

  let html = '';

  if (contact.name) {
    html += `
      <div class="contact-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        <span>${contact.name}</span>
      </div>
    `;
  }

  if (contact.email) {
    html += `
      <div class="contact-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
          <polyline points="22,6 12,13 2,6"/>
        </svg>
        <span>${contact.email}</span>
      </div>
    `;
  }

  if (contact.phone) {
    html += `
      <div class="contact-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
        <span>${contact.phone}</span>
      </div>
    `;
  }

  if (contact.company) {
    html += `
      <div class="contact-item">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span>${contact.company}</span>
      </div>
    `;
  }

  container.innerHTML = html;
}

function autofillCaptureForm(contact) {
  if (contact.name) {
    const parts = contact.name.split(' ');
    document.getElementById('firstName').value = parts[0] || '';
    document.getElementById('lastName').value = parts.slice(1).join(' ') || '';
  }
  if (contact.email) document.getElementById('email').value = contact.email;
  if (contact.phone) document.getElementById('phone').value = contact.phone;
  if (contact.company) document.getElementById('company').value = contact.company;
}

// =============================================================================
// LEAD CAPTURE
// =============================================================================

async function handleCaptureLead(e) {
  e.preventDefault();

  const data = {
    firstName: document.getElementById('firstName').value,
    lastName: document.getElementById('lastName').value,
    company: document.getElementById('company').value,
    phone: document.getElementById('phone').value,
    email: document.getElementById('email').value,
    campaignId: document.getElementById('campaign').value,
    source: 'chrome_extension',
    sourceUrl: await getCurrentTabUrl(),
  };

  if (!data.phone && !data.email) {
    showNotification('Please enter phone or email', 'error');
    return;
  }

  try {
    const response = await apiCall('/api/extension/capture-lead', 'POST', data);

    if (response.success) {
      showNotification('Lead captured successfully!', 'success');
      clearCaptureForm();
    } else {
      showNotification(response.error || 'Failed to capture lead', 'error');
    }
  } catch (error) {
    showNotification('Failed to capture lead', 'error');
  }
}

function clearCaptureForm() {
  document.getElementById('firstName').value = '';
  document.getElementById('lastName').value = '';
  document.getElementById('company').value = '';
  document.getElementById('phone').value = '';
  document.getElementById('email').value = '';
  document.getElementById('campaign').value = '';
}

// =============================================================================
// QUICK ACTIONS
// =============================================================================

function showSmsForm() {
  document.getElementById('sms-form').classList.remove('hidden');

  // Pre-fill phone if detected
  if (state.detectedContact?.phone) {
    document.getElementById('sms-to').value = state.detectedContact.phone;
  }
}

function hideSmsForm() {
  document.getElementById('sms-form').classList.add('hidden');
}

async function handleSendSms() {
  const to = document.getElementById('sms-to').value;
  const message = document.getElementById('sms-message').value;

  if (!to || !message) {
    showNotification('Please enter phone and message', 'error');
    return;
  }

  try {
    const response = await apiCall('/api/extension/quick-sms', 'POST', { to, message });

    if (response.success) {
      showNotification('SMS sent!', 'success');
      hideSmsForm();
      document.getElementById('sms-message').value = '';
    } else {
      showNotification(response.error || 'Failed to send SMS', 'error');
    }
  } catch (error) {
    showNotification('Failed to send SMS', 'error');
  }
}

async function handleCall() {
  const phone = state.detectedContact?.phone || document.getElementById('phone').value;

  if (!phone) {
    showNotification('No phone number available', 'error');
    return;
  }

  // Open power dialer or initiate call
  chrome.tabs.create({
    url: `${API_BASE}/t/default/call-center?dial=${encodeURIComponent(phone)}`
  });
}

async function handleEmail() {
  const email = state.detectedContact?.email || document.getElementById('email').value;

  if (!email) {
    showNotification('No email available', 'error');
    return;
  }

  window.open(`mailto:${email}`);
}

async function handleScheduleCallback() {
  const phone = state.detectedContact?.phone || document.getElementById('phone').value;

  if (!phone) {
    showNotification('No phone number available', 'error');
    return;
  }

  // Open calendar page with pre-filled callback
  chrome.tabs.create({
    url: `${API_BASE}/t/default/workspaces/calendar?schedule=callback&phone=${encodeURIComponent(phone)}`
  });
}

// =============================================================================
// CAMPAIGNS & CADENCES
// =============================================================================

async function loadCampaigns() {
  try {
    const response = await apiCall('/api/extension/campaigns', 'GET');

    if (response.success && response.campaigns) {
      state.campaigns = response.campaigns;
      populateCampaignSelect();
    }
  } catch (error) {
    console.error('Failed to load campaigns:', error);
  }
}

function populateCampaignSelect() {
  const select = document.getElementById('campaign');
  select.innerHTML = '<option value="">Select campaign...</option>';

  state.campaigns.forEach(campaign => {
    const option = document.createElement('option');
    option.value = campaign.id;
    option.textContent = campaign.name;
    select.appendChild(option);
  });
}

async function loadCadences() {
  try {
    const response = await apiCall('/api/extension/cadences', 'GET');

    if (response.success && response.cadences) {
      state.cadences = response.cadences;
      displayCadences();
      populateCadenceSelect();
    }
  } catch (error) {
    console.error('Failed to load cadences:', error);
    document.getElementById('cadences-list').innerHTML =
      '<p class="empty-state">Failed to load cadences</p>';
  }
}

function displayCadences() {
  const container = document.getElementById('cadences-list');

  if (state.cadences.length === 0) {
    container.innerHTML = '<p class="empty-state">No active cadences</p>';
    return;
  }

  container.innerHTML = state.cadences.map(cadence => `
    <div class="cadence-item">
      <div class="cadence-info">
        <h4>${cadence.name}</h4>
        <p>${cadence.steps} steps • ${cadence.activeLeads} active leads</p>
      </div>
      <span class="cadence-badge ${cadence.status}">${cadence.status}</span>
    </div>
  `).join('');
}

function populateCadenceSelect() {
  const select = document.getElementById('cadence-select');
  select.innerHTML = '<option value="">Choose a cadence...</option>';

  state.cadences.forEach(cadence => {
    const option = document.createElement('option');
    option.value = cadence.id;
    option.textContent = cadence.name;
    select.appendChild(option);
  });
}

async function handleAddToCadence(e) {
  e.preventDefault();

  const phone = document.getElementById('cadence-phone').value;
  const cadenceId = document.getElementById('cadence-select').value;

  if (!phone || !cadenceId) {
    showNotification('Please enter phone and select cadence', 'error');
    return;
  }

  try {
    const response = await apiCall('/api/extension/add-to-cadence', 'POST', {
      phone,
      cadenceId
    });

    if (response.success) {
      showNotification('Added to cadence!', 'success');
      document.getElementById('cadence-phone').value = '';
      await loadCadences();
    } else {
      showNotification(response.error || 'Failed to add to cadence', 'error');
    }
  } catch (error) {
    showNotification('Failed to add to cadence', 'error');
  }
}

async function handleCreateCadence() {
  // Open cadence creation page
  chrome.tabs.create({
    url: `${API_BASE}/t/default/campaigns?new=cadence`
  });
}

// =============================================================================
// UTILITIES
// =============================================================================

async function apiCall(endpoint, method = 'GET', body = null) {
  const { authToken } = await chrome.storage.sync.get(['authToken']);

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  };

  if (body && method !== 'GET') {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, options);
  return response.json();
}

async function getCurrentTabUrl() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab?.url || '';
}

function showNotification(message, type = 'info') {
  const notification = document.getElementById('notification');
  const messageEl = document.getElementById('notification-message');

  notification.className = `notification ${type}`;
  messageEl.textContent = message;
  notification.classList.remove('hidden');

  setTimeout(() => {
    notification.classList.add('hidden');
  }, 3000);
}
