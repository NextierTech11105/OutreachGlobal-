/**
 * Nextier Lead Assistant - LinkedIn Detector
 *
 * Specialized contact detection for LinkedIn profiles.
 * Extracts name, title, company, and contact info from profiles.
 */

// =============================================================================
// MESSAGE HANDLER
// =============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'DETECT_CONTACT') {
    const contact = detectLinkedInProfile();
    sendResponse({ contact });
  }
  return true;
});

// =============================================================================
// LINKEDIN DETECTION
// =============================================================================

function detectLinkedInProfile() {
  const contact = {
    email: null,
    phone: null,
    name: null,
    company: null,
    title: null,
    linkedin: window.location.href,
  };

  // Check if we're on a profile page
  const isProfilePage = window.location.pathname.startsWith('/in/');

  if (!isProfilePage) {
    return contact;
  }

  // Get name from profile header
  const nameElement = document.querySelector('.text-heading-xlarge') ||
                      document.querySelector('h1.inline') ||
                      document.querySelector('.pv-text-details__left-panel h1');
  if (nameElement) {
    contact.name = nameElement.textContent?.trim();
  }

  // Get headline/title
  const headlineElement = document.querySelector('.text-body-medium') ||
                          document.querySelector('.pv-text-details__left-panel .text-body-medium');
  if (headlineElement) {
    contact.title = headlineElement.textContent?.trim();
  }

  // Get current company from experience
  const experienceSection = document.querySelector('#experience') ||
                           document.querySelector('.experience-section');
  if (experienceSection) {
    const currentJob = experienceSection.querySelector('.pv-entity__company-summary-info') ||
                       experienceSection.querySelector('[data-control-name="background_details_company"]');
    if (currentJob) {
      contact.company = currentJob.textContent?.trim().split('\n')[0];
    }
  }

  // Try to get company from headline
  if (!contact.company && contact.title) {
    const atMatch = contact.title.match(/(?:at|@)\s+(.+?)(?:\s|$)/i);
    if (atMatch) {
      contact.company = atMatch[1].trim();
    }
  }

  // Try to find email in contact info (if visible)
  const contactSection = document.querySelector('.pv-contact-info__contact-type');
  if (contactSection) {
    const emailLink = contactSection.querySelector('a[href^="mailto:"]');
    if (emailLink) {
      contact.email = emailLink.href.replace('mailto:', '');
    }

    const phoneSpan = contactSection.querySelector('.t-14.t-black');
    if (phoneSpan) {
      const phoneText = phoneSpan.textContent?.replace(/\D/g, '');
      if (phoneText?.length >= 10) {
        contact.phone = formatPhone(phoneText);
      }
    }
  }

  // Check page content for contact info
  const pageText = document.body.innerText || '';

  // Look for email patterns
  const emailMatch = pageText.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  if (emailMatch && !contact.email) {
    contact.email = emailMatch[0];
  }

  // Look for phone patterns
  const phoneMatch = pageText.match(/(\+?1?\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/);
  if (phoneMatch && !contact.phone) {
    const digits = phoneMatch[0].replace(/\D/g, '');
    if (digits.length >= 10) {
      contact.phone = formatPhone(digits);
    }
  }

  return contact;
}

// =============================================================================
// UTILITIES
// =============================================================================

function formatPhone(digits) {
  if (digits.length === 10) {
    return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
  } else if (digits.length === 11 && digits[0] === '1') {
    return `+1 (${digits.slice(1,4)}) ${digits.slice(4,7)}-${digits.slice(7)}`;
  }
  return digits;
}

// =============================================================================
// QUICK CAPTURE BUTTON (INJECT INTO PAGE)
// =============================================================================

function injectCaptureButton() {
  // Check if button already exists
  if (document.getElementById('nextier-capture-btn')) return;

  // Find the actions area on profile
  const actionsArea = document.querySelector('.pv-top-card-v2-ctas') ||
                      document.querySelector('.pvs-profile-actions') ||
                      document.querySelector('.pv-top-card__actions');

  if (!actionsArea) return;

  const button = document.createElement('button');
  button.id = 'nextier-capture-btn';
  button.className = 'artdeco-button artdeco-button--2 artdeco-button--secondary';
  button.style.cssText = `
    margin-left: 8px;
    background: #3b82f6 !important;
    color: white !important;
    border: none !important;
  `;
  button.innerHTML = `
    <span class="artdeco-button__text">
      Capture Lead
    </span>
  `;

  button.addEventListener('click', async () => {
    const contact = detectLinkedInProfile();

    // Send to background script
    chrome.runtime.sendMessage({
      type: 'CAPTURE_LINKEDIN_LEAD',
      contact,
    });

    // Visual feedback
    button.textContent = 'Captured!';
    button.style.background = '#10b981';
    setTimeout(() => {
      button.innerHTML = '<span class="artdeco-button__text">Capture Lead</span>';
      button.style.background = '#3b82f6';
    }, 2000);
  });

  actionsArea.appendChild(button);
}

// Inject button when page loads
if (document.readyState === 'complete') {
  injectCaptureButton();
} else {
  window.addEventListener('load', injectCaptureButton);
}

// Re-inject on navigation (LinkedIn is SPA)
let lastUrl = window.location.href;
new MutationObserver(() => {
  if (window.location.href !== lastUrl) {
    lastUrl = window.location.href;
    setTimeout(injectCaptureButton, 1000);
  }
}).observe(document.body, { subtree: true, childList: true });

console.log('Nextier LinkedIn detector loaded');
