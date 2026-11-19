/**
 * QRify – QR Code Generator
 * -------------------------------------------------------------------------
 * Vanilla JavaScript. QR codes are drawn in the browser with QRCode.js
 * (loaded by index.html); nothing is sent to a server.
 *
 * Sections
 *   1. Configuration
 *   2. DOM references & state
 *   3. Theme (light / dark)
 *   4. Toasts & inline errors
 *   5. Content types, validation and payload building
 *   6. Color contrast helpers
 *   7. QR code rendering
 *   8. Actions: generate, download, copy, clear
 *   9. Event wiring & initialisation
 */
(() => {
  'use strict';

  /* ======================================================================
   * 1. Configuration
   * ==================================================================== */
  const THEME_KEY = 'qrify-theme';
  const TOAST_DURATION_MS = 2600;
  const MIN_CONTRAST = 3;          // below this ratio, show a scan-ability warning
  const DOWNLOAD_PADDING = 0.1;    // quiet zone added around the PNG (10% of QR size per side)

  /** Values restored by the "Clear" button. */
  const DEFAULTS = Object.freeze({ size: 256, fg: '#000000', bg: '#ffffff', ecc: 'M' });

  /** Per-tab copy and behaviour. */
  const CONTENT_TYPES = {
    url: {
      label: 'Website URL',
      shortLabel: 'URL',
      placeholder: 'https://example.com',
      hint: 'Paste a link. If you leave out https://, it is added for you.',
      inputMode: 'url',
      multiline: false,
      emptyError: 'Please enter a website URL, for example https://example.com.',
    },
    text: {
      label: 'Your text',
      shortLabel: 'Text',
      placeholder: 'Type or paste any text, a Wi-Fi note, a message…',
      hint: 'Any text works. Press Ctrl/⌘ + Enter to generate.',
      inputMode: 'text',
      multiline: true,
      emptyError: 'Please enter some text to turn into a QR code.',
    },
    email: {
      label: 'Email address',
      shortLabel: 'Email',
      placeholder: 'name@example.com',
      hint: 'Scanning opens a new email to this address.',
      inputMode: 'email',
      multiline: false,
      emptyError: 'Please enter an email address, for example name@example.com.',
    },
    phone: {
      label: 'Phone number',
      shortLabel: 'Phone',
      placeholder: '+1 555 123 4567',
      hint: 'Include the country code (+) so it works worldwide. Scanning offers to call this number.',
      inputMode: 'tel',
      multiline: false,
      emptyError: 'Please enter a phone number, for example +1 555 123 4567.',
    },
  };

  const LIBRARY_ERROR =
    'The QR code library could not be loaded. Check your internet connection and reload the page.';

  /* ======================================================================
   * 2. DOM references & state
   * ==================================================================== */
  const $ = (id) => document.getElementById(id);

  const els = {
    themeToggle: $('themeToggle'),

    tabList: $('tabList'),
    tabs: Array.from(document.querySelectorAll('.tab')),
    panel: $('inputPanel'),
    input: $('qrInput'),
    inputLabel: $('inputLabel'),
    inputHint: $('inputHint'),
    inputError: $('inputError'),
    charCount: $('charCount'),

    sizeRadios: Array.from(document.querySelectorAll('input[name="size"]')),
    fgColor: $('fgColor'),
    bgColor: $('bgColor'),
    fgHex: $('fgHex'),
    bgHex: $('bgHex'),
    contrastNote: $('contrastNote'),
    ecc: $('eccLevel'),

    generateBtn: $('generateBtn'),
    copyBtn: $('copyBtn'),
    copyBtnLabel: $('copyBtnLabel'),
    clearBtn: $('clearBtn'),
    downloadBtn: $('downloadBtn'),

    preview: $('preview'),
    previewEmpty: $('previewEmpty'),
    qrFrame: $('qrFrame'),
    qrContainer: $('qrcode'),
    previewInfo: $('previewInfo'),
    previewMeta: $('previewMeta'),
    previewContent: $('previewContent'),

    toast: $('toast'),
    year: $('year'),
  };

  const state = {
    type: 'url',
    /** The QR code currently on screen: { payload, type, settings } or null. */
    current: null,
    toastTimer: null,
    copyTimer: null,
  };

  /* ======================================================================
   * 3. Theme (light / dark)
   * ==================================================================== */
  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function syncThemeButton() {
    const isDark = currentTheme() === 'dark';
    els.themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
    els.themeToggle.setAttribute('title', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (err) {
      /* Storage can be blocked (private mode, file:// restrictions) – the toggle still works. */
    }
    syncThemeButton();
  }

  /* ======================================================================
   * 4. Toasts & inline errors
   * ==================================================================== */
  function showToast(message, kind = 'success') {
    window.clearTimeout(state.toastTimer);
    els.toast.textContent = message;
    els.toast.classList.toggle('is-error', kind === 'error');
    els.toast.classList.add('is-visible');
    state.toastTimer = window.setTimeout(() => {
      els.toast.classList.remove('is-visible');
    }, TOAST_DURATION_MS);
  }

  function showError(message) {
    els.inputError.textContent = message;
    els.inputError.hidden = false;
    els.input.classList.add('is-invalid');
    els.input.setAttribute('aria-invalid', 'true');
  }

  function clearError() {
    els.inputError.textContent = '';
    els.inputError.hidden = true;
    els.input.classList.remove('is-invalid');
    els.input.removeAttribute('aria-invalid');
  }

  /* ======================================================================
   * 5. Content types, validation and payload building
   *    Each builder returns { ok: true, payload } or { ok: false, message }.
   * ==================================================================== */
  const ok = (payload) => ({ ok: true, payload });
  const fail = (message) => ({ ok: false, message });

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function buildUrlPayload(value) {
    if (/\s/.test(value)) {
      return fail('A URL cannot contain spaces. Check the link and try again.');
    }

    // Add https:// when the person leaves the scheme out ("example.com").
    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
    const candidate = hasScheme ? value : `https://${value}`;

    let parsed;
    try {
      parsed = new URL(candidate);
    } catch (err) {
      return fail('That does not look like a valid URL. Try something like https://example.com.');
    }

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return fail('Only http:// and https:// links are supported here. Use the Text tab for other formats.');
    }

    const host = parsed.hostname;
    const looksLikeHost = host === 'localhost' || host.includes('.') || host.includes(':');
    if (!looksLikeHost) {
      return fail('The web address needs a domain, for example example.com.');
    }

    return ok(candidate);
  }

  function buildEmailPayload(value) {
    const address = value.replace(/^mailto:/i, '').trim();
    if (!EMAIL_PATTERN.test(address)) {
      return fail('That email address looks incomplete. Use the format name@example.com.');
    }
    return ok(`mailto:${address}`);
  }

  function buildPhonePayload(value) {
    const stripped = value.replace(/^tel:/i, '');
    const cleaned = stripped.replace(/[\s().-]/g, '');
    if (!/^\+?\d{5,15}$/.test(cleaned)) {
      return fail('Enter a valid phone number with 5–15 digits, optionally starting with +, e.g. +1 555 123 4567.');
    }
    return ok(`tel:${cleaned}`);
  }

  function buildPayload(type, rawValue) {
    const value = rawValue.trim();
    if (!value) {
      return fail(CONTENT_TYPES[type].emptyError);
    }

    switch (type) {
      case 'url':   return buildUrlPayload(value);
      case 'email': return buildEmailPayload(value);
      case 'phone': return buildPhonePayload(value);
      default:      return ok(value); // plain text
    }
  }

  /* ======================================================================
   * 6. Color contrast helpers (WCAG relative luminance)
   * ==================================================================== */
  function hexToRgb(hex) {
    const value = hex.replace('#', '');
    return {
      r: parseInt(value.slice(0, 2), 16),
      g: parseInt(value.slice(2, 4), 16),
      b: parseInt(value.slice(4, 6), 16),
    };
  }

  function relativeLuminance({ r, g, b }) {
    const channel = (c) => {
      const s = c / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  }

  function contrastRatio(hexA, hexB) {
    const a = relativeLuminance(hexToRgb(hexA));
    const b = relativeLuminance(hexToRgb(hexB));
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  }

  function updateColorLabels() {
    els.fgHex.textContent = els.fgColor.value.toUpperCase();
    els.bgHex.textContent = els.bgColor.value.toUpperCase();
  }

  /** Warn (without blocking) when the chosen colors may be hard to scan. */
  function updateContrastNote() {
    const fg = els.fgColor.value;
    const bg = els.bgColor.value;
    const ratio = contrastRatio(fg, bg);
    const inverted = relativeLuminance(hexToRgb(fg)) > relativeLuminance(hexToRgb(bg));

    let message = '';
    if (ratio < MIN_CONTRAST) {
      message = 'These colors are very similar, so the code may be hard to scan. Pick a darker foreground or a lighter background.';
    } else if (inverted) {
      message = 'A lighter foreground on a darker background (inverted) is not read by every scanner. A dark code on a light background is the safest choice.';
    }

    els.contrastNote.textContent = message;
    els.contrastNote.hidden = message === '';
  }

  /* ======================================================================
   * 7. QR code rendering
   * ==================================================================== */
  function readSettings() {
    const selected = els.sizeRadios.find((radio) => radio.checked);
    return {
      size: Number(selected ? selected.value : DEFAULTS.size),
      fg: els.fgColor.value,
      bg: els.bgColor.value,
      ecc: els.ecc.value,
    };
  }

  /** Hide the QR code and return the preview panel to its empty state. */
  function resetPreview() {
    els.qrContainer.innerHTML = '';
    els.qrFrame.hidden = true;
    els.previewInfo.hidden = true;
    els.previewEmpty.hidden = false;
    els.downloadBtn.disabled = true;
    state.current = null;
  }

  /** Show the QR code stored in state.current. */
  function paintPreview(animate) {
    const { payload, type, settings } = state.current;

    els.previewEmpty.hidden = true;
    els.qrFrame.hidden = false;
    els.qrFrame.style.backgroundColor = settings.bg;

    els.previewInfo.hidden = false;
    els.previewMeta.textContent =
      `${settings.size} × ${settings.size} px · ${CONTENT_TYPES[type].shortLabel} · Error correction ${settings.ecc}`;
    els.previewContent.textContent = payload;
    els.previewContent.title = payload;

    els.downloadBtn.disabled = false;

    if (animate) {
      els.qrFrame.classList.remove('is-new');
      void els.qrFrame.offsetWidth; // restart the CSS animation
      els.qrFrame.classList.add('is-new');
    }
  }

  /**
   * Draw a QR code into the preview. Returns true on success; on failure the
   * preview is reset, an error is shown and false is returned.
   */
  function renderQr(payload, type, animate) {
    if (typeof window.QRCode === 'undefined') {
      showError(LIBRARY_ERROR);
      showToast('QR library not loaded', 'error');
      return false;
    }

    const settings = readSettings();

    try {
      els.qrContainer.innerHTML = '';
      new window.QRCode(els.qrContainer, {
        text: payload,
        width: settings.size,
        height: settings.size,
        colorDark: settings.fg,
        colorLight: settings.bg,
        correctLevel: window.QRCode.CorrectLevel[settings.ecc],
      });
      // QRCode.js copies the text into a tooltip; the content is already shown below the code.
      els.qrContainer.removeAttribute('title');
    } catch (err) {
      console.error('[QRify] Could not generate the QR code:', err);
      resetPreview();
      showError(
        `That content is too long for a QR code at error-correction level ${settings.ecc}. ` +
        'Shorten it or choose a lower level.'
      );
      return false;
    }

    state.current = { payload, type, settings };
    paintPreview(animate);
    return true;
  }

  /* ======================================================================
   * 8. Actions
   * ==================================================================== */

  /** Validate the input and generate a fresh QR code. */
  function generate() {
    clearError();

    const result = buildPayload(state.type, els.input.value);
    if (!result.ok) {
      showError(result.message);
      els.input.focus();
      return;
    }

    if (!renderQr(result.payload, state.type, true)) return;

    showToast('QR code ready');

    // On stacked (mobile / tablet) layouts the preview sits below the form – bring it into view.
    if (window.matchMedia('(max-width: 860px)').matches) {
      els.preview.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  /** Re-draw the current content after size / color / error-correction changes. */
  function restyleCurrent() {
    if (!state.current) return;
    clearError();
    renderQr(state.current.payload, state.current.type, false);
  }

  /** Save the QR code as a PNG, with a quiet zone added around it for reliable scanning. */
  function downloadPng() {
    if (!state.current) {
      showToast('Generate a QR code first', 'error');
      return;
    }

    const source = els.qrContainer.querySelector('canvas');
    if (!source) {
      showToast('Could not read the QR code image', 'error');
      return;
    }

    const { size, bg } = state.current.settings;
    const padding = Math.round(size * DOWNLOAD_PADDING);
    const output = document.createElement('canvas');
    output.width = size + padding * 2;
    output.height = size + padding * 2;

    const ctx = output.getContext('2d');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, output.width, output.height);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(source, padding, padding, size, size);

    const filename = `qrify-${state.current.type}-${size}px.png`;

    const triggerDownload = (href, revoke) => {
      const link = document.createElement('a');
      link.href = href;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      if (revoke) window.setTimeout(() => URL.revokeObjectURL(href), 1000);
      showToast('PNG downloaded');
    };

    if (output.toBlob) {
      output.toBlob((blob) => {
        if (!blob) {
          showToast('Download failed. Please try again.', 'error');
          return;
        }
        triggerDownload(URL.createObjectURL(blob), true);
      }, 'image/png');
    } else {
      triggerDownload(output.toDataURL('image/png'), false);
    }
  }

  /** Older-browser / insecure-context clipboard fallback. */
  function legacyCopy(text) {
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', '');
    helper.style.position = 'fixed';
    helper.style.top = '0';
    helper.style.opacity = '0';
    document.body.appendChild(helper);
    helper.select();
    helper.setSelectionRange(0, helper.value.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(helper);
    if (!copied) throw new Error('execCommand copy failed');
  }

  /** Copy whatever is in the input field to the clipboard. */
  async function copyInput() {
    const text = els.input.value.trim();
    if (!text) {
      showError('There is nothing to copy yet. Type something first.');
      els.input.focus();
      return;
    }

    clearError();

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        legacyCopy(text);
      }
    } catch (err) {
      try {
        legacyCopy(text);
      } catch (fallbackErr) {
        showToast('Copy failed. Select the text and copy it manually.', 'error');
        return;
      }
    }

    showToast('Copied to clipboard');
    els.copyBtnLabel.textContent = 'Copied!';
    window.clearTimeout(state.copyTimer);
    state.copyTimer = window.setTimeout(() => {
      els.copyBtnLabel.textContent = 'Copy text';
    }, 1600);
  }

  /** Empty the input, restore default options and hide the QR code. (The chosen content type is kept.) */
  function clearAll() {
    els.input.value = '';
    updateCharCount();
    autoGrow();
    clearError();

    const defaultSize = els.sizeRadios.find((radio) => Number(radio.value) === DEFAULTS.size);
    if (defaultSize) defaultSize.checked = true;
    els.fgColor.value = DEFAULTS.fg;
    els.bgColor.value = DEFAULTS.bg;
    els.ecc.value = DEFAULTS.ecc;
    updateColorLabels();
    updateContrastNote();

    resetPreview();
    els.input.focus();
    showToast('Generator reset');
  }

  /* ======================================================================
   * 9. Event wiring & initialisation
   * ==================================================================== */
  function updateCharCount() {
    els.charCount.textContent = String(els.input.value.length);
  }

  /** Grow the textarea with its content (up to its CSS max-height). */
  function autoGrow() {
    const field = els.input;
    field.style.height = 'auto';
    const borders = field.offsetHeight - field.clientHeight;
    field.style.height = `${field.scrollHeight + borders}px`;
  }

  /** Switch the active content-type tab. */
  function applyType(type) {
    const config = CONTENT_TYPES[type];
    if (!config) return;

    state.type = type;

    els.tabs.forEach((tab) => {
      const active = tab.dataset.type === type;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active) els.panel.setAttribute('aria-labelledby', tab.id);
    });

    els.inputLabel.textContent = config.label;
    els.inputHint.textContent = config.hint;
    els.input.placeholder = config.placeholder;
    els.input.setAttribute('inputmode', config.inputMode);
    els.input.rows = config.multiline ? 4 : 1;

    clearError();
    autoGrow();
  }

  function onTabKeydown(event) {
    const index = els.tabs.indexOf(document.activeElement);
    if (index === -1) return;

    let next = null;
    if (event.key === 'ArrowRight') next = (index + 1) % els.tabs.length;
    else if (event.key === 'ArrowLeft') next = (index - 1 + els.tabs.length) % els.tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = els.tabs.length - 1;

    if (next !== null) {
      event.preventDefault();
      els.tabs[next].focus();
      applyType(els.tabs[next].dataset.type);
    }
  }

  function onInputKeydown(event) {
    if (event.key !== 'Enter') return;

    // Single-line types: Enter generates. Text: Ctrl/⌘ + Enter generates, Enter adds a new line.
    const multiline = CONTENT_TYPES[state.type].multiline;
    if (!multiline || event.ctrlKey || event.metaKey) {
      event.preventDefault();
      generate();
    }
  }

  function onOptionChange() {
    updateColorLabels();
    updateContrastNote();
    restyleCurrent();
  }

  function bindEvents() {
    els.themeToggle.addEventListener('click', () => {
      setTheme(currentTheme() === 'dark' ? 'light' : 'dark');
    });

    els.tabs.forEach((tab) => {
      tab.addEventListener('click', () => applyType(tab.dataset.type));
    });
    els.tabList.addEventListener('keydown', onTabKeydown);

    els.input.addEventListener('input', () => {
      updateCharCount();
      autoGrow();
      if (!els.inputError.hidden) clearError(); // dismiss the error as soon as the person edits
    });
    els.input.addEventListener('keydown', onInputKeydown);

    els.sizeRadios.forEach((radio) => radio.addEventListener('change', onOptionChange));
    els.fgColor.addEventListener('input', onOptionChange);
    els.bgColor.addEventListener('input', onOptionChange);
    els.ecc.addEventListener('change', onOptionChange);

    els.generateBtn.addEventListener('click', generate);
    els.copyBtn.addEventListener('click', copyInput);
    els.clearBtn.addEventListener('click', clearAll);
    els.downloadBtn.addEventListener('click', downloadPng);

    // Keep the textarea height right when the layout width changes.
    window.addEventListener('resize', autoGrow);
  }

  function init() {
    syncThemeButton();
    applyType('url');
    updateColorLabels();
    updateContrastNote();
    updateCharCount();
    bindEvents();
    els.year.textContent = String(new Date().getFullYear());
  }

  init();
})();
