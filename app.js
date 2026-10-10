/* FFD local prototype. No contact information is persisted or transmitted. */
(() => {
  'use strict';
  const ET = 'America/New_York';
  const ATTR_FIRST = 'ffd-prototype-source-first';
  const ATTR_LATEST = 'ffd-prototype-source-latest';
  const demoOpeners = document.querySelectorAll('[data-demo-open]');
  let activeModal = null;
  let returnFocus = null;

  // Deliberate future boundaries: none is called by this prototype.
  const futureIntegrations = Object.freeze({
    persistCustomerAndRequest: () => { throw new Error('Customer storage is not connected.'); },
    sendEmailReminder: () => { throw new Error('Email delivery is not connected.'); },
    sendOptionalSmsReminder: () => { throw new Error('SMS delivery is not connected.'); },
    subscribeMailerLite: () => { throw new Error('MailerLite is not connected.'); }
  });

  function easternParts(date = new Date()) {
    const values = new Intl.DateTimeFormat('en-US', {
      timeZone: ET, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(date);
    const part = (name) => Number(values.find((item) => item.type === name).value);
    const year = part('year'), month = part('month'), day = part('day');
    return { iso: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, hour: part('hour'), minute: part('minute') };
  }
  function validIsoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T12:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }
  function formatUsDate(isoDate) {
    if (!validIsoDate(isoDate)) return '';
    const [year, month, day] = isoDate.split('-');
    return `${month}/${day}/${year}`;
  }
  function parseTypedDate(value) {
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((value || '').trim());
    if (!match) return '';
    const isoDate = `${match[3]}-${match[1].padStart(2, '0')}-${match[2].padStart(2, '0')}`;
    return validIsoDate(isoDate) ? isoDate : '';
  }
  function timeOptions(isoDate, now = new Date()) {
    const today = easternParts(now);
    if (!validIsoDate(isoDate) || isoDate < today.iso) return [];
    const weekday = new Date(`${isoDate}T12:00:00Z`).getUTCDay();
    if (weekday < 2 || weekday > 6) return []; // Illustrative Tuesday–Saturday window.
    const opening = 11 * 60, lastStart = 16 * 60 + 45;
    const earliest = isoDate === today.iso
      ? Math.max(opening, Math.ceil((today.hour * 60 + today.minute + 30) / 15) * 15)
      : opening;
    const slots = [];
    for (let minutes = earliest; minutes <= lastStart; minutes += 15) {
      const h24 = Math.floor(minutes / 60), mm = minutes % 60;
      slots.push({ value: `${String(h24).padStart(2, '0')}:${String(mm).padStart(2, '0')}`, label: `${h24 > 12 ? h24 - 12 : h24}:${String(mm).padStart(2, '0')} ${h24 >= 12 ? 'PM' : 'AM'} ET` });
    }
    return slots;
  }
  function readStorage(key) { try { return localStorage.getItem(key); } catch { return null; } }
  function writeStorage(key, value) { try { localStorage.setItem(key, value); } catch { /* storage disabled */ } }
  function clearStorage(key) { try { localStorage.removeItem(key); } catch { /* storage disabled */ } }
  function cleanSource(value) { return (value || '').trim().slice(0, 60).replace(/[^\w .-]/g, ''); }
  function explicitSource() {
    const query = new URLSearchParams(location.search);
    return cleanSource(query.get('utm_source')) || (document.body.dataset.page === 'jake' ? 'WHK / Jake preview' : '');
  }
  function captureAttribution() {
    const source = explicitSource();
    if (source) {
      if (!readStorage(ATTR_FIRST)) writeStorage(ATTR_FIRST, source);
      writeStorage(ATTR_LATEST, source);
    }
  }
  function attribution() { return { first: readStorage(ATTR_FIRST) || 'Direct / unknown', latest: readStorage(ATTR_LATEST) || 'Direct / unknown' }; }
  captureAttribution();

  const menuButton = document.querySelector('.menu-button');
  const mobileNav = document.getElementById('mobile-nav');
  if (menuButton && mobileNav) {
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(open));
      mobileNav.hidden = !open;
    });
  }

  function modalHtml() {
    return `<div class="modal-backdrop" data-backdrop>
      <section class="booking-dialog" role="dialog" aria-modal="true" aria-labelledby="booking-title" aria-describedby="booking-intro">
        <button type="button" class="modal-close" data-modal-close aria-label="Close demo form">×</button>
        <div data-form-view>
          <p class="eyebrow">LOCAL BOOKING PREVIEW / NO REQUEST SENT</p>
          <h2 id="booking-title">Schedule Free <em>Demo.</em></h2>
          <p id="booking-intro" class="modal-intro">Try the proposed booking flow with fake details. Dates and times are illustrative, not FFD business hours or confirmed availability.</p>
          <form id="demo-form" novalidate>
            <div class="form-grid">
              <div class="field"><label for="first-name">First name <span aria-hidden="true">*</span></label><input id="first-name" name="firstName" autocomplete="off" required maxlength="60"></div>
              <div class="field"><label for="last-name">Last name <span class="optional">(optional)</span></label><input id="last-name" name="lastName" autocomplete="off" maxlength="60"></div>
              <div class="field"><label for="email">Email <span aria-hidden="true">*</span></label><input id="email" name="email" type="email" autocomplete="off" required maxlength="160"></div>
              <div class="field"><label for="phone">Phone <span class="optional">(optional)</span></label><input id="phone" name="phone" type="tel" autocomplete="off" maxlength="40"></div>
              <div class="field field-full"><label for="demo-date">Preferred date <span aria-hidden="true">*</span></label><div class="date-row"><input id="demo-date" name="demoDate" type="text" inputmode="numeric" placeholder="MM/DD/YYYY" autocomplete="off" required aria-describedby="date-help"><div class="picker-wrap"><label class="visually-hidden" for="date-picker">Choose date with calendar</label><input id="date-picker" type="date" aria-label="Choose date with calendar"></div></div><p class="field-help" id="date-help">Type MM/DD/YYYY (U.S. format) or use the calendar. Dates begin today in New York time.</p></div>
              <div class="field field-full"><label for="demo-time">Preferred time <span aria-hidden="true">*</span></label><select id="demo-time" name="demoTime" required disabled><option value="">Choose a date first</option></select><p class="field-help" id="time-help">Illustrative demo window: Tuesday–Saturday, 11:00 AM–5:00 PM Eastern; 15-minute start times, last start 4:45 PM. These are not store hours.</p></div>
            </div>
            <div id="form-errors" class="form-errors" role="alert" hidden></div>
            <label class="check-row"><input type="checkbox" name="emailReminder"><span>If this were live, email me a reminder for my requested demo. This preview sends nothing.</span></label>
            <label class="check-row"><input type="checkbox" name="smsReminder"><span>If this were live, text me a reminder at my optional phone number. This preview sends nothing.</span></label>
            <label class="check-row"><input type="checkbox" name="marketing"><span>I'd like occasional FFD product and event emails. Optional and separate from a demo request. No subscription occurs in this preview.</span></label>
            <div class="form-footer"><button class="button button-primary" type="submit">Preview request <span aria-hidden="true">↗</span></button><span>Submitting displays a local test confirmation only.</span></div>
          </form>
          <div class="attribution"><p data-attribution></p><button type="button" data-reset-attribution>Reset source</button></div>
        </div>
        <div class="confirmation" data-confirmation hidden aria-live="polite"></div>
      </section>
    </div>`;
  }
  function updateAttributionView() {
    const node = activeModal?.querySelector('[data-attribution]');
    if (!node) return;
    const { first, latest } = attribution();
    node.textContent = `Test source — first: ${first}; latest: ${latest}. Browser-only attribution.`;
  }
  function refreshTimes() {
    if (!activeModal) return;
    const dateField = activeModal.querySelector('#demo-date');
    const picker = activeModal.querySelector('#date-picker');
    const time = activeModal.querySelector('#demo-time');
    const hint = activeModal.querySelector('#time-help');
    const selected = time.value;
    const value = parseTypedDate(dateField.value);
    const slots = timeOptions(value);
    time.replaceChildren();
    const prompt = document.createElement('option'); prompt.value = '';
    prompt.textContent = !dateField.value.trim() ? 'Choose a date first' : !value ? 'Enter a valid U.S. date' : slots.length ? 'Choose a time' : 'No illustrative times for this date';
    time.append(prompt);
    for (const slot of slots) { const option = document.createElement('option'); option.value = slot.value; option.textContent = slot.label; time.append(option); }
    time.disabled = slots.length === 0;
    if (slots.some((slot) => slot.value === selected)) time.value = selected;
    hint.textContent = value && !slots.length
      ? 'No illustrative times on this date. Try Tuesday–Saturday; today also needs at least 30 minutes of lead time. These are not confirmed business hours.'
      : 'Illustrative demo window: Tuesday–Saturday, 11:00 AM–5:00 PM Eastern; 15-minute start times, last start 4:45 PM. These are not store hours.';
    if (value && value >= easternParts().iso) picker.value = value;
  }
  function closeModal() {
    if (!activeModal) return;
    activeModal.remove(); activeModal = null; document.body.classList.remove('modal-open');
    if (returnFocus?.isConnected) returnFocus.focus();
    returnFocus = null;
  }
  function openModal(trigger) {
    if (activeModal) return;
    returnFocus = trigger || document.activeElement;
    document.body.insertAdjacentHTML('beforeend', modalHtml());
    activeModal = document.querySelector('[data-backdrop]');
    document.body.classList.add('modal-open');
    const dateField = activeModal.querySelector('#demo-date');
    const picker = activeModal.querySelector('#date-picker');
    picker.min = easternParts().iso;
    dateField.addEventListener('input', refreshTimes);
    picker.addEventListener('change', () => { if (picker.value) { dateField.value = formatUsDate(picker.value); refreshTimes(); } });
    dateField.addEventListener('blur', () => { const parsed = parseTypedDate(dateField.value); if (parsed) dateField.value = formatUsDate(parsed); });
    activeModal.querySelector('[data-reset-attribution]').addEventListener('click', () => { clearStorage(ATTR_FIRST); clearStorage(ATTR_LATEST); updateAttributionView(); });
    const form = activeModal.querySelector('#demo-form');
    form.addEventListener('submit', submitPreview);
    form.addEventListener('input', () => {
      activeModal.querySelector('#form-errors').hidden = true;
      form.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));
    });
    activeModal.querySelector('[data-modal-close]').addEventListener('click', closeModal);
    activeModal.addEventListener('click', (event) => { if (event.target === activeModal) closeModal(); });
    updateAttributionView();
    activeModal.querySelector('#first-name').focus();
  }
  function showError(message, field) {
    const box = activeModal.querySelector('#form-errors');
    box.textContent = message; box.hidden = false;
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
  }
  function submitPreview(event) {
    event.preventDefault();
    if (!activeModal || activeModal.querySelector('[data-form-view]').hidden) return;
    const form = event.currentTarget;
    const errors = activeModal.querySelector('#form-errors'); errors.hidden = true;
    form.querySelectorAll('[aria-invalid="true"]').forEach((el) => el.removeAttribute('aria-invalid'));
    const first = form.elements.firstName.value.trim(), email = form.elements.email.value.trim();
    const date = parseTypedDate(form.elements.demoDate.value), time = form.elements.demoTime.value;
    if (!first) return showError('Enter a first name.', form.elements.firstName);
    if (!email || !form.elements.email.checkValidity()) return showError('Enter a valid email address.', form.elements.email);
    if (!date || date < easternParts().iso) return showError('Enter a valid date from today onward using MM/DD/YYYY (U.S. format).', form.elements.demoDate);
    const slots = timeOptions(date);
    if (!slots.length) return showError('Choose a date with an illustrative demo time. The preview window is Tuesday–Saturday.', form.elements.demoDate);
    if (!slots.some((slot) => slot.value === time)) return showError('Choose one of the available illustrative 15-minute start times.', form.elements.demoTime);
    if (form.elements.smsReminder.checked && !form.elements.phone.value.trim()) return showError('Enter a phone number or uncheck the optional text reminder.', form.elements.phone);
    const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
    const fullName = `${first}${form.elements.lastName.value.trim() ? ' ' + form.elements.lastName.value.trim() : ''}`;
    const chosen = slots.find((slot) => slot.value === time);
    const attrs = attribution();
    const confirm = activeModal.querySelector('[data-confirmation]');
    confirm.replaceChildren();
    const icon = document.createElement('div'); icon.className = 'success-icon'; icon.textContent = '✓';
    const heading = document.createElement('h2'); heading.id = 'booking-confirm-title'; heading.innerHTML = 'Preview <em>complete.</em>';
    const message = document.createElement('p'); message.textContent = 'This was an on-screen test. No appointment was booked, no contact record was stored, and no email or text was sent.';
    const dl = document.createElement('dl');
    const rows = [['Name', fullName], ['Email', email], ['Date', formatUsDate(date)], ['Time', chosen.label], ['Reminder', `${form.elements.emailReminder.checked ? 'Email requested' : 'None'}${form.elements.smsReminder.checked ? ', SMS requested' : ''}`], ['Marketing', form.elements.marketing.checked ? 'Test checkbox selected only' : 'No'], ['First source', attrs.first], ['Latest source', attrs.latest]];
    for (const [label, value] of rows) { const dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = label; dd.textContent = value; dl.append(dt, dd); }
    const reset = document.createElement('button'); reset.type = 'button'; reset.className = 'button button-primary'; reset.textContent = 'Reset and try again';
    reset.addEventListener('click', () => { closeModal(); openModal(returnFocus || document.querySelector('[data-demo-open]')); });
    confirm.append(icon, heading, message, dl, reset);
    activeModal.querySelector('[data-form-view]').hidden = true;
    activeModal.querySelector('.booking-dialog').setAttribute('aria-labelledby', 'booking-confirm-title');
    activeModal.querySelector('.booking-dialog').removeAttribute('aria-describedby');
    confirm.hidden = false; reset.focus();
  }
  document.addEventListener('keydown', (event) => {
    if (!activeModal) return;
    if (event.key === 'Escape') { event.preventDefault(); closeModal(); return; }
    if (event.key !== 'Tab') return;
    const focusables = [...activeModal.querySelectorAll('button:not([disabled]):not([hidden]), input:not([disabled]), select:not([disabled]), a[href]')].filter((node) => node.getClientRects().length && !node.closest('[hidden]'));
    if (!focusables.length) return;
    const first = focusables[0], last = focusables.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  demoOpeners.forEach((button) => button.addEventListener('click', () => openModal(button)));
  if (document.body.dataset.page === 'book-demo' && demoOpeners.length) openModal(demoOpeners[0]);

  const heroVideoButton = document.querySelector('[data-hero-video]');
  heroVideoButton?.addEventListener('click', () => {
    const art = heroVideoButton.closest('.hero-art');
    if (!art || art.querySelector('.hero-video-player')) return;
    const player = document.createElement('div'); player.className = 'hero-video-player';
    const video = document.createElement('video');
    video.controls = true; video.muted = true; video.playsInline = true; video.preload = 'none';
    video.setAttribute('aria-label', 'Official Byrna Compact Launcher teaser video');
    video.src = 'https://cdn.shopify.com/videos/c/o/v/378bb786746640058322e1a81e18568e.mp4';
    const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Close video';
    close.addEventListener('click', () => { video.pause(); player.remove(); heroVideoButton.focus(); });
    player.append(video, close); art.append(player); video.play().catch(() => { /* native controls remain available */ });
  });

  document.querySelectorAll('[data-video-id]').forEach((card) => {
    const button = card.querySelector('[data-video-load]');
    button?.addEventListener('click', () => {
      const id = card.dataset.videoId;
      if (!/^[A-Za-z0-9_-]{11}$/.test(id)) return;
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${id}?rel=0&controls=1`;
      frame.title = card.dataset.videoTitle || 'Byrna video';
      frame.allow = 'encrypted-media; picture-in-picture; fullscreen';
      frame.allowFullscreen = true;
      frame.referrerPolicy = 'strict-origin-when-cross-origin';
      frame.loading = 'lazy';
      button.replaceWith(frame);
    });
  });

  window.FFDPrototype = Object.freeze({ easternParts, validIsoDate, formatUsDate, parseTypedDate, timeOptions, attribution, futureIntegrations });
})();
