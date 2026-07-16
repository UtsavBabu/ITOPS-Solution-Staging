import { chromium } from "playwright";

const SCRATCH = "/tmp/claude-1001/-home-assabet-Downloads-itops-ai-brain/7715686e-1687-4fe0-a4ad-e328e9454c91/scratchpad";
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
page.on("console", msg => { if (msg.type() === "error") log("BROWSER ERROR:", msg.text()); });
page.on("pageerror", err => log("PAGE ERROR:", err.message));

// Tables are distinguished by their column headers, not content (content changes
// as the test mutates it) — Departments has "Manager", Invites has "Status"/"Expires".
const deptsTable = () => page.locator("table").filter({ hasText: "Manager" });
const invitesTable = () => page.locator("table").filter({ hasText: "Expires" });

try {
  log("Logging in as superadmin...");
  await page.goto("http://localhost:5173/login");
  await page.getByLabel(/work email/i).fill("babulearn57@gmail.com");
  await page.getByLabel(/^Password/i).fill("admin@123");
  await page.getByText(/verify you're human/i).click();
  await page.getByText(/verified — you're human/i).waitFor({ timeout: 5000 });
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.waitForURL(/dashboard/, { timeout: 15000 });
  log("Logged in, on dashboard.");

  log("Navigating to Team & Plan...");
  await page.goto("http://localhost:5173/team");
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${SCRATCH}/v2-team.png`, fullPage: true });

  // --- Departments: clean up any leftover row from a prior aborted run ---
  const leftoverRows = await deptsTable().locator("tbody tr").count();
  log("Existing department rows before test:", leftoverRows);
  if (leftoverRows > 0) {
    for (let i = 0; i < leftoverRows; i++) {
      const row = deptsTable().locator("tbody tr").first();
      const delBtn = row.getByRole("button", { name: /delete/i });
      if (await delBtn.isVisible().catch(() => false)) {
        await delBtn.click();
        await page.waitForTimeout(400);
        const confirmBtn = page.getByRole("button", { name: /^delete$/i }).last();
        if (await confirmBtn.isVisible().catch(() => false)) await confirmBtn.click();
        await page.waitForTimeout(1000);
      }
    }
    log("Cleaned up leftover rows. Remaining:", await deptsTable().locator("tbody tr").count());
  }

  log("Creating a department...");
  await page.getByPlaceholder("New department name").fill("QA Verify Dept");
  await page.getByRole("button", { name: /add department/i }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SCRATCH}/v3-dept-created.png`, fullPage: true });
  log("Rows after create:", await deptsTable().locator("tbody tr").count());
  log("Row 0 name input value:", await deptsTable().locator("tbody tr").first().locator("input").first().inputValue());

  log("Renaming department...");
  let row = deptsTable().locator("tbody tr").first();
  await row.locator("input").first().fill("QA Verify Dept Renamed");
  await row.getByRole("button", { name: /save/i }).first().click();
  await page.waitForTimeout(1200);
  row = deptsTable().locator("tbody tr").first();
  log("Row 0 name after rename+save:", await row.locator("input").first().inputValue());
  await page.screenshot({ path: `${SCRATCH}/v4-dept-renamed.png`, fullPage: true });

  log("Archiving department...");
  row = deptsTable().locator("tbody tr").first();
  await row.getByRole("button", { name: /archive/i }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SCRATCH}/v5-dept-archived.png`, fullPage: true });
  const archivedLabelVisible = await page.getByText("Archived", { exact: true }).first().isVisible().catch(() => false);
  log("Archived label shown:", archivedLabelVisible);

  log("Restoring department...");
  row = deptsTable().locator("tbody tr").first();
  await row.getByRole("button", { name: /restore/i }).click();
  await page.waitForTimeout(1200);
  const stillArchived = await page.getByText("Archived", { exact: true }).first().isVisible().catch(() => false);
  log("Still shows Archived after restore (should be false):", stillArchived);

  log("Assigning department to the member row...");
  const memberDeptSelect = page.locator("table").filter({ hasText: "Joined" }).locator("tbody tr").first().locator("select");
  await memberDeptSelect.selectOption({ label: "QA Verify Dept Renamed" });
  const memberSaveBtn = page.locator("table").filter({ hasText: "Joined" }).locator("tbody tr").first().getByRole("button", { name: /save/i });
  await memberSaveBtn.click().catch(() => log("(no separate save button for member dept — may auto-save)"));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SCRATCH}/v5b-member-dept-assigned.png`, fullPage: true });
  const memberCount = await deptsTable().locator("tbody tr").first().locator("td").nth(2).textContent();
  log("Department member count after assignment:", memberCount);

  log("Unassigning member department (cleanup) and deleting department...");
  await memberDeptSelect.selectOption({ label: "No department" });
  const memberSaveBtn2 = page.locator("table").filter({ hasText: "Joined" }).locator("tbody tr").first().getByRole("button", { name: /save/i });
  await memberSaveBtn2.click().catch(() => {});
  await page.waitForTimeout(1000);

  row = deptsTable().locator("tbody tr").first();
  await row.getByRole("button", { name: /delete/i }).click();
  await page.waitForTimeout(500);
  const confirmBtn = page.getByRole("button", { name: /^delete$/i }).last();
  if (await confirmBtn.isVisible().catch(() => false)) await confirmBtn.click();
  await page.waitForTimeout(1200);
  log("Department rows after delete (should be 0):", await deptsTable().locator("tbody tr").count());
  await page.screenshot({ path: `${SCRATCH}/v6-dept-deleted.png`, fullPage: true });

  // --- Invites ---
  log("Sending a team invite...");
  await page.getByPlaceholder("name@company.com").fill("verify-invite-test@example.com");
  await page.getByRole("button", { name: /send invite/i }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SCRATCH}/v7-invite-created.png`, fullPage: true });
  log("Invite rows:", await invitesTable().locator("tbody tr").count());
  log("Invite row 0 text:", await invitesTable().locator("tbody tr").first().textContent());

  log("Copying invite link...");
  await context_grantClipboard();
  const inviteRow = invitesTable().locator("tbody tr").first();
  await inviteRow.getByRole("button", { name: /copy link/i }).click();
  await page.waitForTimeout(500);
  const inviteLink = await page.evaluate(() => navigator.clipboard.readText().catch(() => null));
  log("Copied invite link:", inviteLink);

  if (inviteLink) {
    log("Opening invite-accept page in a fresh (logged-out) context...");
    const context2 = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const page2 = await context2.newPage();
    page2.on("pageerror", err => log("INVITE PAGE ERROR:", err.message));
    await page2.goto(inviteLink);
    await page2.waitForTimeout(1500);
    await page2.screenshot({ path: `${SCRATCH}/v8-invite-accept-page.png`, fullPage: true });
    const heading = await page2.locator("h1").first().textContent().catch(() => null);
    log("Invite-accept page heading:", heading);
    const emailFieldValue = await page2.locator('input[type="email"]').first().inputValue().catch(() => null);
    log("Locked email field value:", emailFieldValue);
    await context2.close();
  } else {
    log("No invite link captured — checking invite row for a token/email issue.");
  }

  log("Revoking the test invite (cleanup)...");
  const inviteRow2 = invitesTable().locator("tbody tr").first();
  await inviteRow2.getByRole("button", { name: /revoke/i }).click();
  await page.waitForTimeout(500);
  const confirmRevoke = page.getByRole("button", { name: /^revoke$/i }).last();
  if (await confirmRevoke.isVisible().catch(() => false)) await confirmRevoke.click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SCRATCH}/v9-invite-revoked.png`, fullPage: true });
  log("Invite row 0 status after revoke:", await invitesTable().locator("tbody tr").first().textContent());

  log("DONE");
} catch (e) {
  log("SCRIPT ERROR:", e.message);
  await page.screenshot({ path: `${SCRATCH}/v-error.png`, fullPage: true }).catch(() => {});
} finally {
  await browser.close();
}

async function context_grantClipboard() {
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
}
