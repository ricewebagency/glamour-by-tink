document.addEventListener('DOMContentLoaded', () => {
  initAcademyForm();
});

function initAcademyForm() {
  const form = document.querySelector('[data-academy-form]');
  if (!form) {
    return;
  }

  // Web3Forms: ontvanger hoort bij de access_key in het formulier.
  const endpoint = 'https://api.web3forms.com/submit';
  const submitButton = form.querySelector('[data-academy-form-submit]');
  const status = form.querySelector('[data-academy-form-status]');

  const showStatus = (message) => {
    if (!status) {
      return;
    }

    status.textContent = message;
    status.hidden = false;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const formData = new FormData(form);
    if (formData.get('botcheck')) {
      return;
    }

    const payload = Object.fromEntries(formData.entries());
    payload.subject = 'Academy aanvraag via landingspagina';
    payload.from_name = 'Glamour by Tink website';

    if (submitButton) {
      submitButton.disabled = true;
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(`Form submit failed: ${result.message || response.status}`);
      }

      form.reset();
      showStatus('Bedankt voor je aanvraag! Ik neem zo snel mogelijk persoonlijk contact met je op.');

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'academy_form_submit' });

      if (typeof window.fbq === 'function') {
        window.fbq('track', 'Lead');
      }
    } catch (error) {
      showStatus('Er ging iets mis bij het versturen. Probeer het opnieuw of stuur een WhatsApp bericht.');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
      }
    }
  });
}
