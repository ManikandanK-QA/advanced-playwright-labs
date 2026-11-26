/* Checkout: one POST, explicit in-flight state, recoverable failures. */
(function () {
  'use strict';

  var form = document.querySelector('[data-testid="order-form"]');
  var submit = document.querySelector('[data-testid="submit"]');
  var loading = document.querySelector('[data-testid="loading"]');
  var confirmation = document.querySelector('[data-testid="confirmation"]');
  var orderId = document.querySelector('[data-testid="order-id"]');
  var orderTotal = document.querySelector('[data-testid="order-total"]');
  var errorBox = document.querySelector('[data-testid="error"]');
  var errorMessage = document.querySelector('[data-testid="error-message"]');

  function show(element, visible) {
    element.hidden = !visible;
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();

    var data = new FormData(form);
    var quantity = Number.parseInt(String(data.get('quantity')), 10);
    var payload = {
      name: String(data.get('name') ?? '').trim(),
      email: String(data.get('email') ?? '').trim(),
      quantity: Number.isFinite(quantity) ? quantity : 1,
    };

    if (!payload.name || !payload.email) {
      errorMessage.textContent = 'Name and email are required.';
      show(errorBox, true);
      return;
    }

    submit.disabled = true;
    show(loading, true);
    show(confirmation, false);
    show(errorBox, false);

    try {
      var response = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      var order = await response.json();
      orderId.textContent = order.orderId;
      orderTotal.textContent = '$' + order.total;
      show(confirmation, true);
    } catch (cause) {
      errorMessage.textContent = 'The order could not be placed (' + cause.message + ').';
      show(errorBox, true);
    } finally {
      show(loading, false);
      submit.disabled = false;
    }
  });
})();
