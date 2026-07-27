import { expect, test, type Locator, type Page } from "@playwright/test";

async function mockMapApis(page: Page) {
  await page.route("**/api/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const payload = pathname === "/api/incidents/firms"
      ? {
          failedSources: [],
          fetchedAt: new Date().toISOString(),
          incidents: [],
          successfulSources: ["VIIRS_SNPP"],
        }
      : pathname === "/api/community/reports"
        ? { reports: [], viewerVotes: {} }
        : pathname === "/api/official/notices"
          ? { notices: [] }
          : null;
    await route.fulfill({ body: JSON.stringify(payload), contentType: "application/json", status: 200 });
  });
}

async function box(locator: Locator) {
  await expect(locator).toBeVisible();
  const bounds = await locator.boundingBox();
  expect(bounds).not.toBeNull();
  return bounds!;
}

function overlaps(a: Awaited<ReturnType<typeof box>>, b: Awaited<ReturnType<typeof box>>) {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

async function openMap(page: Page) {
  await mockMapApis(page);
  await page.goto("/");
  await expect(page.getByLabel("Chargement de la carte")).toBeHidden({ timeout: 10_000 });
  await expect(page.locator(".leaflet-container")).toBeVisible();
}

for (const viewport of [
  { label: "tablette", width: 820, height: 1180 },
  { label: "desktop", width: 1440, height: 900 },
]) {
  test(`les contrôles supérieurs ne se chevauchent pas sur ${viewport.label}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await openMap(page);

    const signals = await box(page.getByTestId("signal-summary"));
    const search = await box(page.getByTestId("map-search"));
    const sources = await box(page.getByTestId("map-sources"));

    expect(overlaps(signals, search)).toBe(false);
    expect(overlaps(search, sources)).toBe(false);
    expect(Math.abs(signals.y - search.y)).toBeLessThanOrEqual(5);
    expect(Math.abs(sources.y - search.y)).toBeLessThanOrEqual(5);
  });
}

test("les contrôles inférieurs restent alignés sur desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openMap(page);
  await page.locator(".leaflet-container").hover({ position: { x: 300, y: 400 } });

  const timeline = await box(page.getByTestId("map-timeline"));
  const coordinates = await box(page.getByTestId("mouse-coordinates"));
  const zoom = await box(page.locator(".leaflet-control-zoom"));
  const viewportHeight = page.viewportSize()!.height;

  expect(Math.abs(timeline.y + timeline.height - coordinates.y - coordinates.height)).toBeLessThanOrEqual(8);
  expect(Math.abs(timeline.y + timeline.height - zoom.y - zoom.height)).toBeLessThanOrEqual(8);
  expect(viewportHeight - (timeline.y + timeline.height)).toBeLessThanOrEqual(16);
});

test("les sources restent accessibles sur mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openMap(page);

  await page.getByRole("button", { name: /Afficher les autres outils/ }).click();
  await page.getByRole("button", { name: "Sources des données" }).click();

  await expect(page.getByText("NASA LANCE FIRMS · satellites VIIRS.")).toBeVisible();
  await expect(page.getByText("Une détection satellite ne confirme ni un incendie ni une surface brûlée.")).toBeVisible();
});
