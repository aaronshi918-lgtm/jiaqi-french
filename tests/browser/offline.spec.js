const { test, expect } = require("@playwright/test");
const { pathToFileURL } = require("node:url");
const path = require("node:path");

// file:// coverage runs in WebKit; Chromium HTTP coverage remains in app.spec.js.
test("distribution artifact opens directly from file with network offline", async ({
  page,
  context,
}) => {
  const requests = [], errors = [];
  page.on("pageerror", error => errors.push(error.message));
  // WebKit's offline emulation also rejects initial file:// navigation.
  // Deny HTTP(S) before opening the file, then use offline emulation for interaction.
  await context.route(/^https?:\/\//, route => {
    requests.push(route.request().url());
    return route.abort("internetdisconnected");
  });
  await page.goto(
    pathToFileURL(path.resolve(__dirname, "../../dist/jiaqi_french.html")).href,
  );
  await expect(page.locator("#startBtn")).toContainText("30");
  const ids = await page.evaluate(() => getPlan().map(q => q.id));
  await page.reload();
  expect(await page.evaluate(() => getPlan().map(q => q.id))).toEqual(ids);
  await context.setOffline(true);
  await page.locator("#startBtn").click();
  await expect(page.locator(".qtitle")).not.toBeEmpty();
  expect(requests).toEqual([]);
  expect(errors).toEqual([]);
});
