# Gmail Label-Based Archive/Trash Automations (Google Apps Script)

This repo contains a Google Apps Script that runs **daily** to process Gmail threads based on labels, and sends a **weekly summary** email.

It supports three actions:

- **ThreeDayArchive** → archive threads **older than 3 days**
- **SevenDayArchive** → archive threads **older than 7 days**
- **ThreeDayDelete** → move threads **older than 3 days** to **Trash**

After a thread is processed, the script **removes the processing label** so it won’t be processed again.

The three actions can easily be modified to a different set of similar actions.

---

## Contents

1. [Files](#files)
2. [Setup Overview](#setup-overview)
3. [Customizing Actions](#customizing-actions)
4. [Step-by-Step Setup](#1-create-the-gmail-labels)
5. [Debugging](#debugging--common-gotchas)
6. [Privacy](#privacy-note)

---

## Files

- `Code.gs` : the Apps Script code
- `README.md`: this guide
- `LICENSE`: MIT License

---

## Setup Overview

1. Create (or confirm) Gmail labels used by the automation
2. Create Gmail filters to apply those labels to incoming messages
3. Paste the script into Google Apps Script
4. Authorise the script
5. Add a **daily trigger** and a **weekly trigger**
6. Test manually once and confirm behaviour

---

## Customizing Actions

You can change the behavior by editing the `ACTIONS` list at the top of `Code.gs`.

- **key**: Internal name for logging.
- **labelName**: The exact Gmail label (case-sensitive).
- **daysOld**: How many days to wait before acting.
- **operation**: The action to take (`"ARCHIVE"` or `"TRASH"`).

### Dry Run Mode

To test without modifying emails, set `DRY_RUN` to `true` at the top of the file:

```javascript
const DRY_RUN = true;
```

When enabled, the script will log what it *would* have done but won't archive, trash, or remove labels.

---

## 1) Create the Gmail labels

In Gmail (web):

1. Left sidebar → **More**
2. **Create new label**

You need three labels. They may be top-level or nested.

### Recommended nesting (optional)
Example structure:

- `Automations/ThreeDayArchive`
- `Automations/SevenDayArchive`
- `Automations/ThreeDayDelete`

**Important:**  
Apps Script label names must match **exactly**, including nesting.  
For nested labels, the script must use the full path (e.g. `Automations/ThreeDayArchive`).

---

## 2) Create Gmail filters to apply labels

Gmail filters determine **which emails get labelled**. The script determines **when** they get archived/trashed.

Create filters via:

- Gmail search bar → **sliders icon** → fill in criteria → **Create filter**

Then choose:

- ✅ **Apply the label** → pick one of the automation labels

### Example: label all Substack mail
In the **From** field:

- `@substack.com`

Then **Apply label**: `Automations/ThreeDayDelete` (or whichever you prefer).

---

## 3) Add the script in Google Apps Script

1. Go to https://script.google.com
2. **New project**
3. Paste the code into `Code.gs` (or replace default code)
4. Update the config values at the top of the script if needed:
   - `SUMMARY_EMAIL_TO`
   - label names in `ACTIONS` (especially if nested)

### Config: label names must be exact
If your labels are nested under `Automations`, use:

- `Automations/ThreeDayArchive`
- `Automations/SevenDayArchive`
- `Automations/ThreeDayDelete`

---

## 4) Authorise the script

The first time you run the script, Google will ask for permission to:

- Read your Gmail
- Modify your Gmail (needed to archive/trash and remove labels)

Authorise when prompted.

---

## 5) Create the triggers (daily + weekly)

### Open Triggers
In Apps Script:

- Left sidebar → **Triggers (⏰)** → **Add Trigger**

### Daily trigger (runs all 3 actions)
Create a trigger with:

- **Function**: `runDailyMailboxActions`
- **Event source**: `Time-driven`
- **Type**: `Day timer`
- **Time**: e.g. `03:00–04:00`

### Weekly trigger (sends summary email)
Create a second trigger with:

- **Function**: `sendWeeklyMailboxActionsSummary`
- **Event source**: `Time-driven`
- **Type**: `Week timer`
- **Day/time**: e.g. Saturday `09:00–10:00`

✅ No “Deploy” step is required for time-based triggers.

**Note:** Triggers run according to the script's time zone. You can check/change this in the Apps Script editor under **Project Settings (gear icon) > General > Time zone**.

---

## 6) Test manually (recommended)

In Apps Script editor:

1. Select function `runDailyMailboxActions`
2. Click **Run (▶)**
3. Check results in Gmail:
   - Threads older than the threshold should be archived or trashed
   - The processing label should be removed after action

### View execution logs
Apps Script logs are visible in:

- Left sidebar → **Executions** → click the latest run → **Logs**

---

## Debugging / Common gotchas

### 1) Label not found
Most common issue: label is nested but script uses the non-nested name.

Example:
- Gmail label shown as `Automations / ThreeDayArchive`
- Script must use `Automations/ThreeDayArchive`

To list labels exactly as the script sees them, paste this temporarily into `Code.gs` and run it:

```javascript
function listMyLabels() {
  GmailApp.getUserLabels().forEach(l => Logger.log(l.getName()));
}
```

---

## Privacy Note

This script runs entirely within your own Google account. No email data is sent to external servers or third parties. You are the only one with access to the execution logs.