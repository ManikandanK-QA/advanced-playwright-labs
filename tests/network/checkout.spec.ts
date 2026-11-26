import { jsonHandler, orderBody, readJsonBody, type OrderRequest } from '../../src/api/lab-api';
import { expect, test } from '../../src/fixtures';
import { CheckoutPage, type OrderFormValues } from '../../src/pages';

test.use({ requireApiMocks: true });

const order: OrderFormValues = { name: 'Ada Lovelace', email: 'ada@example.test', quantity: 3 };

test('posts the form as JSON and renders the confirmed order', async ({ page, ledger }) => {
  const captured: { method: string | null; contentType: string; body: OrderRequest | null } = {
    method: null,
    contentType: '',
    body: null,
  };

  await ledger.route('**/api/order', async (route, request) => {
    captured.method = request.method();
    captured.contentType = request.headers()['content-type'] ?? '';
    captured.body = request.postData() ? readJsonBody<OrderRequest>(request.postData()) : null;
    await jsonHandler(201, orderBody({ orderId: 'ord-777', quantity: 3, total: 72 }))(route);
  });

  const checkout = new CheckoutPage(page);
  await checkout.open();
  await checkout.fillOrder(order);
  await checkout.submit();

  await expect(checkout.confirmation).toBeVisible();
  await expect(checkout.orderId).toHaveText('ord-777');
  await expect(checkout.orderTotal).toHaveText('$72');
  await expect(checkout.error).toBeHidden();

  expect(captured.method).toBe('POST');
  expect(captured.contentType).toContain('application/json');
  expect(captured.body).toEqual(order);
});

test('shows the server error and re-enables the form', async ({ page, ledger }) => {
  await ledger.route('**/api/order', jsonHandler(500, { error: 'pricing_service_down' }));

  const checkout = new CheckoutPage(page);
  await checkout.open();
  await checkout.fillOrder(order);
  await checkout.submit();

  await expect(checkout.error).toBeVisible();
  await expect(checkout.errorMessage).toContainText('HTTP 500');
  await expect(checkout.confirmation).toBeHidden();
  await expect(checkout.loading).toBeHidden();
  await expect(checkout.submitButton).toBeEnabled();
});

test('surfaces a transport failure without losing the form data', async ({ page, ledger }) => {
  await ledger.route('**/api/order', (route) => route.abort('failed'));

  const checkout = new CheckoutPage(page);
  await checkout.open();
  await checkout.fillOrder(order);
  await checkout.submit();

  await expect(checkout.error).toBeVisible();
  await expect(checkout.errorMessage).toContainText('could not be placed');
  await expect(checkout.submitButton).toBeEnabled();
  await expect(checkout.nameInput).toHaveValue(order.name);
  await expect(checkout.emailInput).toHaveValue(order.email);
});
