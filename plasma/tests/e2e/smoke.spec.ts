import { expect, test, type Page, type Route } from '@playwright/test';

function json(route: Route, status: number, body: unknown) {
  return route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function bootstrapAuth(page: Page) {
  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.setItem('accessToken', 'test-access-token');
    localStorage.setItem('refreshToken', 'test-refresh-token');
    localStorage.setItem(
      'user',
      JSON.stringify({
        id: 1,
        username: 'admin',
        role: 'ADMIN',
      }),
    );
  });
}

function selectByLabel(page: Page, label: string) {
  return page.locator(`label:has-text("${label}")`).first().locator('xpath=..').locator('select').first();
}

async function mockCreatePoApis(page: Page) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/')) {
      return route.continue();
    }

    if (request.method() === 'GET' && url.pathname === '/api/devices/filters/options') {
      return json(route, 200, {
        success: true,
        options: {
          suppliers: [{ id: 1, name: 'Supplier A' }],
          manufacturers: [{ id: 1, name: 'Apple' }],
          models: [{ id: 1, manufacturer_id: 1, model_name: 'iPhone 15 Pro', model_number: 'A2890' }],
        },
      });
    }

    if (request.method() === 'GET' && url.pathname === '/api/tac/model/1') {
      return json(route, 200, {
        success: true,
        data: {
          colors: ['Black'],
          storages: [128],
        },
      });
    }

    if (request.method() === 'POST' && url.pathname === '/api/purchase-orders') {
      return json(route, 201, {
        success: true,
        id: 77,
        po_number: 'PO-7777',
      });
    }

    return json(route, 200, { success: true });
  });
}

async function mockCreateSoApis(page: Page) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/')) {
      return route.continue();
    }

    if (request.method() === 'GET' && url.pathname === '/api/devices/filters/options') {
      return json(route, 200, {
        success: true,
        options: {
          customers: [{ id: 1, name: 'Retail Customer' }],
          suppliers: [{ id: 1, name: 'Supplier A' }],
          manufacturers: [{ id: 1, name: 'Apple' }],
          storageOptions: [128],
        },
      });
    }

    if (request.method() === 'GET' && url.pathname === '/api/sales-orders/available-devices') {
      return json(route, 200, {
        success: true,
        groups: [
          {
            supplier_id: 1,
            supplier_name: 'Supplier A',
            manufacturer_id: 1,
            manufacturer_name: 'Apple',
            model_id: 1,
            model_name: 'iPhone 15 Pro',
            model_number: 'A2890',
            storage_gb: 128,
            color: 'Black',
            grade: 'A',
            available_count: 2,
            reserved_count: 0,
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
          hasMore: false,
        },
      });
    }

    if (request.method() === 'POST' && url.pathname === '/api/sales-orders') {
      return json(route, 201, {
        success: true,
        data: {
          id: 55,
          so_number: 'SO-00055',
        },
      });
    }

    return json(route, 200, { success: true });
  });
}

async function mockBookInApis(page: Page) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/')) {
      return route.continue();
    }

    if (request.method() === 'GET' && url.pathname === '/api/suppliers') {
      return json(route, 200, {
        success: true,
        suppliers: [{ id: 1, name: 'Supplier A' }],
      });
    }

    if (request.method() === 'GET' && url.pathname === '/api/devices/filters/options') {
      return json(route, 200, {
        success: true,
        options: {
          locations: [{ id: 1, code: 'TR001', name: 'Tray 1' }],
        },
      });
    }

    if (request.method() === 'GET' && url.pathname === '/api/tac/12345678') {
      return json(route, 200, {
        success: true,
        data: {
          manufacturer: 'Apple',
          model: 'iPhone 15 Pro',
          manufacturerId: 1,
          modelId: 1,
          colors: ['Black'],
          storages: [128],
        },
      });
    }

    if (request.method() === 'POST' && url.pathname === '/api/purchase-orders/book-in') {
      return json(route, 201, {
        success: true,
      });
    }

    return json(route, 200, { success: true });
  });
}

async function mockAdminOpsApis(page: Page) {
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (!url.pathname.startsWith('/api/')) {
      return route.continue();
    }

    if (request.method() === 'GET' && url.pathname === '/api/admin/operations/recent') {
      return json(route, 200, {
        success: true,
        operations: [],
      });
    }

    if (request.method() === 'POST' && url.pathname === '/api/admin/verify-pin') {
      const body = request.postDataJSON() as { pin?: string; operation?: string; reason?: string | null };

      if (body.pin !== '1234') {
        return json(route, 403, { success: false, message: 'Invalid PIN code' });
      }

      if (body.operation === 'Location Management' && (!body.reason || body.reason.trim() === '')) {
        return json(route, 400, { success: false, message: 'Reason is required for this operation' });
      }

      return json(route, 200, {
        success: true,
        redirect: '/admin-ops/location-management',
        queryParams: {
          reason: body.reason || null,
        },
      });
    }

    return json(route, 200, { success: true });
  });
}

test.describe('AdminOps PIN smoke', () => {
  test('correct PIN + reason navigates successfully', async ({ page }) => {
    await bootstrapAuth(page);
    await mockAdminOpsApis(page);

    await page.goto('/admin-ops');
    await page.locator('button:has-text("Location Management")').click();
    await page.locator('input[type="password"]').fill('1234');
    await page.getByPlaceholder('Enter reason for location change').fill('Stock re-bin');
    await page.getByRole('button', { name: 'Unlock' }).click();

    await expect(page).toHaveURL(/\/admin-ops\/location-management\?reason=Stock%20re-bin/);
  });

  test('correct PIN without reason returns 400 and preserves error', async ({ page }) => {
    await bootstrapAuth(page);
    await mockAdminOpsApis(page);

    await page.goto('/admin-ops');
    await page.locator('button:has-text("Location Management")').click();
    await page.locator('input[type="password"]').fill('1234');
    await page.getByPlaceholder('Enter reason for location change').fill('   ');
    await page.getByRole('button', { name: 'Unlock' }).click();

    await expect(page.getByText('Reason is required for this operation')).toBeVisible();
  });

  test('wrong PIN shows error and stays on modal', async ({ page }) => {
    await bootstrapAuth(page);
    await mockAdminOpsApis(page);

    await page.goto('/admin-ops');
    await page.locator('button:has-text("Color Check")').click();
    await page.locator('input[type="password"]').fill('9999');
    await page.getByRole('button', { name: 'Unlock' }).click();

    await expect(page.getByText('Invalid PIN code')).toBeVisible();
  });
});

test.describe('Create PO smoke', () => {
  test('near-empty form shows toast error', async ({ page }) => {
    await bootstrapAuth(page);
    await mockCreatePoApis(page);

    await page.goto('/goods-in/create');
    await selectByLabel(page, 'Supplier *').selectOption('1');
    await selectByLabel(page, 'Manufacturer *').selectOption('1');
    await page.getByRole('button', { name: 'Create Purchase Order' }).click();

    await expect(page.getByText('Model is required')).toBeVisible();
  });

  test('valid form shows success and redirects', async ({ page }) => {
    await bootstrapAuth(page);
    await mockCreatePoApis(page);

    await page.goto('/goods-in/create');
    await selectByLabel(page, 'Supplier *').selectOption('1');
    await selectByLabel(page, 'Manufacturer *').selectOption('1');
    await page.getByRole('button', { name: 'Select model' }).click();
    await page.getByRole('button', { name: 'iPhone 15 Pro' }).click();

    await page.getByRole('button', { name: 'Create Purchase Order' }).click();

    await expect(page.getByText('Purchase order PO-7777 created successfully')).toBeVisible();
    await expect(page).toHaveURL(/\/goods-in\/77$/);
  });
});

test.describe('Create SO smoke', () => {
  test('empty submission path shows validation error', async ({ page }) => {
    await bootstrapAuth(page);
    await mockCreateSoApis(page);

    await page.goto('/goods-out/create');
    await selectByLabel(page, 'Supplier *').selectOption('1');
    await page.getByRole('button', { name: 'Add' }).click();
    await page.locator('form').evaluate((form) => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    await expect(page.getByText('Customer is required')).toBeVisible();
  });

  test('Backmarket rule is enforced', async ({ page }) => {
    await bootstrapAuth(page);
    await mockCreateSoApis(page);

    await page.goto('/goods-out/create');
    await selectByLabel(page, 'Customer *').selectOption('1');
    await selectByLabel(page, 'Supplier *').selectOption('1');
    await page.getByRole('button', { name: 'Add' }).click();
    await selectByLabel(page, 'Order Type *').selectOption('BACKMARKET');

    await page.getByRole('button', { name: /create sales order/i }).click();

    await expect(page.getByText('Backmarket Order ID is required for Backmarket orders')).toBeVisible();
  });

  test('valid order shows success and redirects', async ({ page }) => {
    await bootstrapAuth(page);
    await mockCreateSoApis(page);

    await page.goto('/goods-out/create');
    await selectByLabel(page, 'Customer *').selectOption('1');
    await selectByLabel(page, 'Supplier *').selectOption('1');
    await page.getByRole('button', { name: 'Add' }).click();

    await page.getByRole('button', { name: /create sales order/i }).click();

    await expect(page.getByText('Sales order SO-00055 created successfully')).toBeVisible();
    await expect(page).toHaveURL(/\/goods-out\/55$/);
  });
});

test.describe('Book In Stock smoke', () => {
  test('valid scan works, missing location is blocked, hot-toast visible, no alert dialogs', async ({ page }) => {
    let dialogSeen = false;
    page.on('dialog', async (dialog) => {
      dialogSeen = true;
      await dialog.dismiss();
    });

    await bootstrapAuth(page);
    await mockBookInApis(page);

    await page.goto('/goods-in/book-in');
    await selectByLabel(page, 'Supplier *').selectOption('1');

    await page.getByPlaceholder('Scan or enter IMEI (15 digits)...').fill('123456789012345');
    await page.getByRole('button', { name: /add device/i }).click();

    await expect(page.getByText('✓ Apple iPhone 15 Pro added')).toBeVisible();

    await page.getByRole('button', { name: /booking complete/i }).click();

    await expect(page.getByText('Location is required')).toBeVisible();
    expect(dialogSeen).toBe(false);
  });
});
