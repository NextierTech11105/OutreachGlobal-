/**
 * Nextier Lead Assistant - Contact Detector
 *
 * Detects email addresses, phone numbers, and names on web pages.
 * Runs on all pages to enable quick lead capture.
 */

// =============================================================================
// PATTERNS
// =============================================================================

const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/gi;
const PHONE_PATTERN = /(\+?1?\s?)?(\(?\d{3}\)?[\s.-]?)?\d{3}[\s.-]?\d{4}/gi;
const NAME_PATTERN = /^[A-Z][a-z]+\s[A-Z][a-z]+(\s[A-Z][a-z]+)?$/;

// =============================================================================
// MESSAGE HANDLER
// =============================================================================

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'DETECT_CONTACT') {
    const contact = detectContactInfo();
    sendResponse({ contact });
  }
  return true;
});

// =============================================================================
// DETECTION
// =============================================================================

function detectContactInfo() {
  const contact = {
    email: null,
    phone: null,
    name: null,
    company: null,
  };

  // Get page text content
  const bodyText = document.body?.innerText || '';
  const title = document.title || '';

  // Detect emails
  const emails = bodyText.match(EMAIL_PATTERN) || [];
  if (emails.length > 0) {
    // Filter out common non-personal emails
    const validEmails = emails.filter(e => {
      const lower = e.toLowerCase();
      return !lower.includes('noreply') &&
             !lower.includes('no-reply') &&
             !lower.includes('support@') &&
             !lower.includes('info@') &&
             !lower.includes('contact@') &&
             !lower.includes('example.com');
    });
    contact.email = validEmails[0] || emails[0];
  }

  // Detect phone numbers
  const phones = bodyText.match(PHONE_PATTERN) || [];
  if (phones.length > 0) {
    // Get the first valid phone (10+ digits when normalized)
    for (const phone of phones) {
      const digits = phone.replace(/\D/g, '');
      if (digits.length >= 10 && digits.length <= 11) {
        contact.phone = formatPhone(digits);
        break;
      }
    }
  }

  // Try to detect name from structured data
  const ldJson = document.querySelector('script[type="application/ld+json"]');
  if (ldJson) {
    try {
      const data = JSON.parse(ldJson.textContent);
      if (data.name) contact.name = data.name;
      if (data.author?.name) contact.name = data.author.name;
      if (data.contactPoint?.name) contact.name = data.contactPoint.name;
    } catch (e) {
      // Ignore JSON parse errors
    }
  }

  // Try to get name from meta tags
  const ogTitle = document.querySelector('meta[property="og:title"]');
  if (ogTitle?.content && !contact.name) {
    const name = ogTitle.content.trim();
    if (NAME_PATTERN.test(name)) {
      contact.name = name;
    }
  }

  // Try to detect company from title or meta
  const ogSiteName = document.querySelector('meta[property="og:site_name"]');
  if (ogSiteName?.content) {
    contact.company = ogSiteName.content;
  } else if (title.includes(' - ')) {
    contact.company = title.split(' - ').pop()?.trim();
  } else if (title.includes(' | ')) {
    contact.company = title.split(' | ').pop()?.trim();
  }

  // Check for vCard or hCard microformats
  const vcard = document.querySelector('.vcard, .h-card');
  if (vcard) {
    const fn = vcard.querySelector('.fn, .p-name');
    const tel = vcard.querySelector('.tel, .p-tel');
    const email = vcard.querySelector('.email, .u-email');
    const org = vcard.querySelector('.org, .p-org');

    if (fn?.textContent) contact.name = fn.textContent.trim();
    if (tel?.textContent) contact.phone = formatPhone(tel.textContent.replace(/\D/g, ''));
    if (email?.textContent) contact.email = email.textContent.trim();
    if (org?.textContent) contact.company = org.textContent.trim();
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

// Log that content script loaded
console.log('Nextier contact detector loaded');
