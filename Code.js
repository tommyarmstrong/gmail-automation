/**
 * Code.gs — Gmail label-based automation (archive/trash) + weekly summary
 *
 * DAILY:
 *  - ThreeDayArchive  -> archive threads older than 3 days
 *  - SevenDayArchive  -> archive threads older than 7 days
 *  - ThreeDayDelete   -> trash threads older than 3 days
 *
 * WEEKLY:
 *  - Send a summary email of all actions
 *
 * After processing, the label is REMOVED so threads are not re-processed.
 */

/**************************************************************
 * CONFIGURATION
 **************************************************************/

const SUMMARY_EMAIL_TO = Session.getActiveUser().getEmail();
const MAX_RUNS_TO_KEEP = 300;

/**
 * IMPORTANT:
 * labelName must EXACTLY match Gmail label names,
 * including nesting (e.g. "Automations/ThreeDayArchive")
 */
const ACTIONS = [
  {
    key: "ThreeDayArchive",
    labelName: "Automations/ThreeDayArchive",
    daysOld: 3,
    op: "ARCHIVE",
  },
  {
    key: "SevenDayArchive",
    labelName: "Automations/SevenDayArchive",
    daysOld: 7,
    op: "ARCHIVE",
  },
  {
    key: "ThreeDayDelete",
    labelName: "Automations/ThreeDayDelete",
    daysOld: 3,
    op: "TRASH",
  },
];

/**************************************************************
 * DAILY ENTRYPOINT
 **************************************************************/

function runDailyMailboxActions() {
  // 🔹 LOG #1 — confirms the daily function actually ran
  Logger.log("runDailyMailboxActions started");

  const now = new Date();

  ACTIONS.forEach((action) => {
    try {
      const result = processLabel_(action, now);

      recordRun_(action.key, {
        ...result,
        labelName: action.labelName,
        daysOld: action.daysOld,
        op: action.op,
      });
    } catch (e) {
      recordRun_(action.key, {
        scanned: 0,
        acted: 0,
        labelName: action.labelName,
        daysOld: action.daysOld,
        op: action.op,
        error: String(e && e.message ? e.message : e),
      });
    }
  });
}

/**************************************************************
 * WEEKLY SUMMARY
 **************************************************************/

function sendWeeklyMailboxActionsSummary() {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty("MAILBOX_ACTION_RUNS_JSON");
  const runs = raw ? JSON.parse(raw) : [];

  const totals = {};
  ACTIONS.forEach((a) => {
    totals[a.key] = { scanned: 0, acted: 0, errors: 0 };
  });

  runs.forEach((r) => {
    totals[r.actionKey].scanned += r.scanned || 0;
    totals[r.actionKey].acted += r.acted || 0;
    if (r.error) totals[r.actionKey].errors += 1;
  });

  const lines = [];
  lines.push("Weekly Gmail automation summary");
  lines.push(`Generated: ${new Date().toString()}`);
  lines.push("");

  ACTIONS.forEach((a) => {
    const t = totals[a.key];
    const verb = a.op === "TRASH" ? "trashed" : "archived";
    lines.push(
      `- ${a.key}: scanned=${t.scanned}, ${verb}=${t.acted}, errors=${t.errors}`
    );
  });

  MailApp.sendEmail(
    SUMMARY_EMAIL_TO,
    "Weekly Gmail automation summary",
    lines.join("\n")
  );

  props.deleteProperty("MAILBOX_ACTION_RUNS_JSON");
}

/**************************************************************
 * CORE WORKER
 **************************************************************/

function processLabel_(action, now) {
  const label = GmailApp.getUserLabelByName(action.labelName);

  if (!label) {
    return {
      scanned: 0,
      acted: 0,
      error: `Label not found: ${action.labelName}`,
    };
  }

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - action.daysOld);

  const threads = label.getThreads();

  // 🔹 LOG #2 — shows whether the label actually has threads
  Logger.log(`[${action.key}] threads with label: ${threads.length}`);

  let scanned = 0;
  let acted = 0;

  threads.forEach((thread) => {
    scanned += 1;

    if (thread.getLastMessageDate() < cutoff) {
      if (action.op === "TRASH") {
        thread.moveToTrash();
      } else {
        thread.moveToArchive();
      }

      // Remove label so it is not processed again
      thread.removeLabel(label);
      acted += 1;
    }
  });

  return { scanned, acted, error: "" };
}

/**************************************************************
 * STORAGE FOR WEEKLY SUMMARY
 **************************************************************/

function recordRun_(actionKey, { scanned, acted, labelName, daysOld, op, error }) {
  const props = PropertiesService.getScriptProperties();
  const raw = props.getProperty("MAILBOX_ACTION_RUNS_JSON");
  const runs = raw ? JSON.parse(raw) : [];

  runs.push({
    when: new Date().toISOString(),
    actionKey,
    labelName,
    daysOld,
    op,
    scanned: scanned || 0,
    acted: acted || 0,
    error: error || "",
  });

  while (runs.length > MAX_RUNS_TO_KEEP) runs.shift();

  props.setProperty("MAILBOX_ACTION_RUNS_JSON", JSON.stringify(runs));
}

/**************************************************************
 * DEBUG HELPER (run manually if needed)
 **************************************************************/

function listMyLabels() {
  GmailApp.getUserLabels().forEach((l) => Logger.log(l.getName()));
}
