import type { Locator } from '@playwright/test';

import { LabPage } from './base.page';

export interface OrderFormValues {
  name: string;
  email: string;
  quantity: number;
}

/** `/network/checkout.html`: one POST with an explicit in-flight state. */
export class CheckoutPage extends LabPage {
  readonly path = '/network/checkout.html';

  get heading(): Locator {
    return this.page.getByRole('heading', { level: 1, name: 'Place an order' });
  }

  get nameInput(): Locator {
    return this.page.getByTestId('name');
  }

  get emailInput(): Locator {
    return this.page.getByTestId('email');
  }

  get quantityInput(): Locator {
    return this.page.getByTestId('quantity');
  }

  get submitButton(): Locator {
    return this.page.getByTestId('submit');
  }

  get loading(): Locator {
    return this.page.getByTestId('loading');
  }

  get confirmation(): Locator {
    return this.page.getByTestId('confirmation');
  }

  get orderId(): Locator {
    return this.page.getByTestId('order-id');
  }

  get orderTotal(): Locator {
    return this.page.getByTestId('order-total');
  }

  get error(): Locator {
    return this.page.getByTestId('error');
  }

  get errorMessage(): Locator {
    return this.page.getByTestId('error-message');
  }

  async fillOrder(values: OrderFormValues): Promise<void> {
    await this.nameInput.fill(values.name);
    await this.emailInput.fill(values.email);
    await this.quantityInput.fill(String(values.quantity));
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }
}
