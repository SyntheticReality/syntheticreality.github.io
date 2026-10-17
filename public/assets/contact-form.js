const form = document.querySelector('#project-enquiry');

if (form) {
  const fields = form.querySelector('.enquiry-fields');
  const submit = form.querySelector('.enquiry-submit');
  const submitLabel = form.querySelector('[data-submit-label]');
  const status = form.querySelector('#enquiry-status');
  const success = form.querySelector('.enquiry-success');
  const nameInput = form.elements.namedItem('name');
  const emailInput = form.elements.namedItem('email');
  const companyInput = form.elements.namedItem('company');
  const messageInput = form.elements.namedItem('message');
  const botcheck = form.elements.namedItem('botcheck');
  const requiredInputs = [nameInput, emailInput, messageInput];
  const accessKeyPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let accessKey = '';
  let busy = false;
  let accepted = false;

  function setStatus(state, message, emailFallback = false) {
    status.dataset.state = state;
    status.replaceChildren(document.createTextNode(message));
    if (emailFallback) {
      status.append(document.createTextNode(' '));
      const email = document.createElement('a');
      email.href = 'mailto:hello@syry.io?subject=Osyrys%20%2F%20Project%20enquiry';
      email.textContent = 'Email hello@syry.io';
      status.append(email, document.createTextNode('.'));
    }
    status.hidden = false;
  }

  function validateContent(input) {
    if (input === nameInput || input === messageInput) {
      input.setCustomValidity(input.value && !input.value.trim() ? 'Please enter more than spaces.' : '');
    }
  }

  function clearError(input) {
    input.removeAttribute('aria-invalid');
    const error = document.querySelector(`#${input.id}-error`);
    if (error) error.textContent = '';
  }

  requiredInputs.forEach(input => {
    input.addEventListener('input', () => {
      validateContent(input);
      if (input.validity.valid) clearError(input);
    });
    input.addEventListener('invalid', () => {
      input.setAttribute('aria-invalid', 'true');
      document.querySelector(`#${input.id}-error`).textContent = input.validationMessage;
    });
  });

  async function loadConfiguration() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch('/form-config.json', {
        headers: { Accept: 'application/json' },
        credentials: 'same-origin',
        cache: 'no-store',
        redirect: 'error',
        signal: controller.signal
      });
      if (!response.ok) throw new Error('Configuration unavailable');
      const config = await response.json();
      const candidate = typeof config.accessKey === 'string' ? config.accessKey.trim() : '';
      if (!accessKeyPattern.test(candidate)) throw new Error('Connection not configured');
      accessKey = candidate;
      submit.disabled = false;
    } catch {
      setStatus('unconnected', 'The form is temporarily unavailable. Please get in touch by email for now.', true);
    } finally {
      clearTimeout(timeout);
    }
  }

  function setSending(sending) {
    busy = sending;
    fields.disabled = sending;
    submit.disabled = sending || !accessKey;
    form.setAttribute('aria-busy', String(sending));
    submitLabel.textContent = sending ? 'Sending…' : 'Send the signal';
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy || accepted) return;
    requiredInputs.forEach(validateContent);
    if (!form.reportValidity()) return;
    if (!accessKey) {
      setStatus('unconnected', 'The form is temporarily unavailable. Your message hasn’t been sent.', true);
      return;
    }
    if (botcheck.checked) {
      setStatus('error', 'We couldn’t send this message. Please get in touch by email.', true);
      return;
    }

    const payload = {
      access_key: accessKey,
      from_name: 'Osyrys website',
      subject: 'Osyrys / Project enquiry',
      name: nameInput.value.trim(),
      email: emailInput.value.trim(),
      replyto: emailInput.value.trim(),
      company: companyInput.value.trim(),
      message: messageInput.value.trim(),
      botcheck: false
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    setSending(true);
    setStatus('sending', 'Sending your message…');

    try {
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        credentials: 'omit',
        referrerPolicy: 'strict-origin-when-cross-origin',
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      let result;
      try {
        result = await response.json();
      } catch {
        setStatus('uncertain', 'We couldn’t confirm whether your message was sent. Please check before sending again, or get in touch by email.', true);
        return;
      }

      if (response.ok && result.success === true) {
        accepted = true;
        fields.hidden = true;
        success.hidden = false;
        setStatus('success', 'Your message was accepted for delivery.');
        success.querySelector('h3').focus();
      } else {
        const message = response.status === 429
          ? 'We’re receiving a lot of messages right now. Please wait a little before trying again, or get in touch by email.'
          : 'Your message couldn’t be sent. Your details are still here; please try again or get in touch by email.';
        setStatus('error', message, true);
      }
    } catch {
      setStatus('uncertain', 'We couldn’t confirm whether your message was sent. Your details are still here. Please check before sending again, or get in touch by email.', true);
    } finally {
      clearTimeout(timeout);
      setSending(false);
      if (!accepted && ['error', 'uncertain'].includes(status.dataset.state)) status.focus();
    }
  });

  form.querySelector('.enquiry-compose').addEventListener('click', () => {
    form.reset();
    requiredInputs.forEach(input => {
      input.setCustomValidity('');
      clearError(input);
    });
    accepted = false;
    success.hidden = true;
    fields.hidden = false;
    status.hidden = true;
    status.replaceChildren();
    nameInput.focus();
  });

  fields.disabled = false;
  loadConfiguration();
}
