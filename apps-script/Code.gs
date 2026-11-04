/**
 * WBSK Enquiries: the form handler, Sheet setup, reminders and backup (Decisions 14–16, 24, 26–28).
 * Pasted into the Sheet's Apps Script by the owner, signed in as the account that owns the Sheet.
 * Contains no secrets. Free: uses only Google Sheets, Gmail and Drive on that account.
 */

var SANITY_QUERY_URL = 'https://80o0qshj.apicdn.sanity.io/v2026-11-01/data/query/production';
var ENQUIRIES = 'Enquiries';
var CAREERS = 'Careers';
var SUMMARY = 'Summary';

// Spam and quota guards (plan, section 6). Likely spam is saved and flagged, never thrown away.
var MIN_FILL_MS = 3000;
var MAX_FIELD_LENGTH = 5000;
var MAX_LINKS_IN_MESSAGE = 3;
var REPEAT_WINDOW_MS = 10 * 60 * 1000;
var MAX_CONFIRMATIONS_PER_DAY = 30;
var MAX_ALERTS_PER_DAY = 60;
var QUOTA_RESERVE = 5;

var ENQUIRY_COLUMNS = ['Received', 'Type', 'Names', 'Wedding date / shoot month', 'City or venue / destination', 'Wedding type', 'Events', 'Days', 'Guests', 'Coverage / offering', 'Cameramen', 'Phone', 'Email', 'Message', 'Opened from', 'Source', 'Consent time', 'Repeat?', 'Status', 'Owner', 'Last contact', 'Next follow-up', 'Notes', 'Lost reason', 'Flag'];
var AUTO_ENQUIRY_COLUMNS = 18;
var CAREERS_COLUMNS = ['Received', 'Name', 'Role', 'Experience', 'Portfolio link', 'Phone', 'Email', 'Consent time', 'Status', 'Notes', 'Flag'];
var AUTO_CAREERS_COLUMNS = 8;
var STAGES = ['New', 'Replied', 'Call booked', 'Proposal sent', 'Confirmed', 'Lost'];
var LOST_REASONS = ['Budget', 'Dates taken', 'Chose another studio', 'No reply', 'Not a fit', 'Other'];
var CAREER_STAGES = ['New', 'Reviewed', 'Trial', 'Hired', 'Not now'];

var FORM_IDS = { wedding: 'formWedding', preWedding: 'formPreWedding', careers: 'formCareers' };

/* ---------- Pure checks: no Google services, so they can be tested off Google. ---------- */

function textOf(value) {
  return (Array.isArray(value) ? value.join(', ') : String(value === undefined || value === null ? '' : value)).trim();
}

/** Ten digits starting 6–9 get India's 91; anything with a country code stays as it is (plan, section 6). */
function whatsAppNumber(phone) {
  var raw = textOf(phone);
  if (!raw) return null;
  var digits = raw.replace(/\D/g, '');
  if (/^[6-9]\d{9}$/.test(digits)) return '91' + digits;
  if (raw.charAt(0) === '+' && digits.length >= 8) return digits;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return null;
}

/** Why a submission looks like spam, or an empty list. Never blocks saving. */
function spamReasons(payload) {
  var reasons = [];
  if (textOf(payload.website)) reasons.push('Hidden trap filled');
  if (Number(payload.elapsedMs) < MIN_FILL_MS) reasons.push('Sent within seconds of opening');
  var values = payload.values || {};
  Object.keys(values).forEach(function (key) {
    if (textOf(values[key]).length > MAX_FIELD_LENGTH) reasons.push('Very long answer: ' + key);
  });
  var links = textOf(values.message).match(/https?:\/\/|www\./gi);
  if (links && links.length > MAX_LINKS_IN_MESSAGE) reasons.push('Message full of links');
  return reasons;
}

/** Checks required answers against the published form, as the page did before sending (Decision 14). */
function missingAnswers(form, kind, values) {
  var missing = [];
  (form && form.questions ? form.questions : []).forEach(function (question) {
    var shown = question.locked || question.shown !== false;
    // The list of open roles can be empty, so the role is never what blocks an application.
    if (shown && question.required && question.kind !== 'role' && !textOf(values[question.key])) missing.push(question.key);
  });
  if (kind !== 'careers' && !textOf(values.phone) && !textOf(values.email)) missing.push('phone or email');
  return missing;
}

/** The chat always asks about cameramen, so the answer reaches the emails even before the question is in the Studio's form. */
function withCameras(form, kind) {
  if (kind === 'careers' || !form || !form.questions) return form;
  if (form.questions.some(function (question) { return question.key === 'cameras'; })) return form;
  var questions = form.questions.concat([{ key: 'cameras', label: 'How many cameramen do you need?', kind: 'one', shown: true, required: false }]);
  var copy = {};
  Object.keys(form).forEach(function (name) { copy[name] = form[name]; });
  copy.questions = questions;
  return copy;
}

/** The same person sending again within minutes: one row, noted, not a flood (plan, section 6). */
function isQuickRepeat(earlierReceived, now) {
  return earlierReceived instanceof Date ? now - earlierReceived.getTime() < REPEAT_WINDOW_MS : false;
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(textOf(value));
}

/** Subject lines by form (Decision 27). */
function alertSubject(kind, values) {
  if (kind === 'careers') return 'New WBSK application — ' + textOf(values.name) + ', ' + textOf(values.role);
  var type = kind === 'preWedding' ? 'pre-wedding enquiry' : 'wedding enquiry';
  return 'New WBSK ' + type + ' — ' + textOf(values.names) + ', ' + textOf(values.date);
}

function escapeHtml(value) {
  return textOf(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** A Sheet cell never treats typed text as a formula. */
function safeCell(value) {
  var text = textOf(value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

/* ---------- The web app. ---------- */

function doGet() {
  return ContentService.createTextOutput('WBSK form handler is running.');
}

function doPost(event) {
  var frame = event && event.parameter && event.parameter.reply === 'frame';
  var result;
  try {
    var raw = event.parameter && event.parameter.payload ? event.parameter.payload : event.postData.contents;
    result = handleSubmission_(JSON.parse(raw));
  } catch (error) {
    console.error(error);
    result = { ok: false };
  }
  if (frame) {
    var html = '<script>parent.postMessage(' + JSON.stringify({ wbsk: 'sent', ok: result.ok === true }) + ', "*");</script>';
    return HtmlService.createHtmlOutput(html).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
}

function handleSubmission_(payload) {
  var kind = payload.form;
  if (!FORM_IDS[kind]) return { ok: false };
  var values = payload.values || {};
  var cache = CacheService.getScriptCache();

  // The page can retry by a second route, so a repeated id is the same enquiry, not a new one.
  var seenKey = 'seen-' + String(payload.id).slice(0, 80);
  if (cache.get(seenKey)) return { ok: true };

  var reasons = spamReasons(payload);
  var form = withCameras(publishedForm_(kind), kind);
  var missing = missingAnswers(form, kind, values);
  if (payload.consent !== true) missing.push('consent');
  if (missing.length && !reasons.length) return { ok: false, missing: missing };

  // Write the row first, so a mail failure can never lose an enquiry.
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  var saved;
  try {
    saved = kind === 'careers' ? saveApplication_(values, reasons) : saveEnquiry_(kind, values, payload.openedFrom, reasons);
    cache.put(seenKey, '1', 3600);
  } finally {
    lock.releaseLock();
  }

  // A likely-spam row or a quick repeat sends no emails, so the Gmail allowance stays safe.
  if (reasons.length || saved.repeat) return { ok: true };
  try {
    sendEmails_(kind, values, form, saved);
  } catch (error) {
    console.error(error);
    noteOnRow_(saved, 'Email failed: ' + error.message);
  }
  return { ok: true };
}

/** The published form's settings, kept for an hour (plan, section 6). */
function publishedForm_(kind) {
  var cache = CacheService.getScriptCache();
  var key = 'form-' + kind;
  var cached = cache.get(key);
  if (cached) return JSON.parse(cached);
  var query = '*[_id == "' + FORM_IDS[kind] + '"][0]{questions[]{key, label, kind, locked, shown, required}, confirmationEmail}';
  var response = UrlFetchApp.fetch(SANITY_QUERY_URL + '?query=' + encodeURIComponent(query), { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) return null;
  var form = JSON.parse(response.getContentText()).result;
  if (form) cache.put(key, JSON.stringify(form), 3600);
  return form;
}

function sheet_(name) {
  return SpreadsheetApp.getActive().getSheetByName(name);
}

/** Earlier rows with this email or phone, for the Repeat? flag (Decision 24). */
function earlierRow_(sheet, phoneColumn, emailColumn, phone, email) {
  var last = sheet.getLastRow();
  if (last < 2) return null;
  var data = sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues();
  var phoneDigits = textOf(phone).replace(/\D/g, '');
  var mail = textOf(email).toLowerCase();
  for (var i = data.length - 1; i >= 0; i -= 1) {
    var samePhone = phoneDigits && textOf(data[i][phoneColumn - 1]).replace(/\D/g, '') === phoneDigits;
    var sameEmail = mail && textOf(data[i][emailColumn - 1]).toLowerCase() === mail;
    if (samePhone || sameEmail) return { row: i + 2, received: data[i][0] };
  }
  return null;
}

function saveEnquiry_(kind, values, openedFrom, reasons) {
  var sheet = sheet_(ENQUIRIES);
  var now = new Date();
  var earlier = earlierRow_(sheet, 12, 13, values.phone, values.email);
  if (earlier && isQuickRepeat(earlier.received, now.getTime())) {
    return noteRepeat_(sheet, earlier.row, ENQUIRY_COLUMNS.length, now);
  }
  var row = [
    now,
    kind === 'preWedding' ? 'Pre-wedding' : 'Wedding',
    safeCell(values.names),
    safeCell(values.date),
    safeCell(values.place),
    safeCell(values.weddingType),
    safeCell(values.events),
    safeCell(values.days),
    safeCell(values.guests),
    safeCell(values.coverage),
    safeCell(values.cameras),
    safeCell(values.phone),
    safeCell(values.email),
    safeCell(values.message),
    safeCell(openedFrom),
    'Website',
    now,
    earlier ? 'Yes' : '',
    'New',
    '',
    '',
    '',
    '',
    '',
    reasons.length ? 'Likely spam: ' + reasons.join('; ') : '',
  ];
  sheet.appendRow(row);
  return { sheet: ENQUIRIES, row: sheet.getLastRow(), earlier: earlier };
}

function saveApplication_(values, reasons) {
  var sheet = sheet_(CAREERS);
  var now = new Date();
  var earlier = earlierRow_(sheet, 6, 7, values.phone, values.email);
  if (earlier && isQuickRepeat(earlier.received, now.getTime())) {
    return noteRepeat_(sheet, earlier.row, CAREERS_COLUMNS.length, now);
  }
  sheet.appendRow([
    now,
    safeCell(values.name),
    safeCell(values.role),
    safeCell(values.experience),
    safeCell(values.portfolio),
    safeCell(values.phone),
    safeCell(values.email),
    now,
    'New',
    '',
    reasons.length ? 'Likely spam: ' + reasons.join('; ') : '',
  ]);
  return { sheet: CAREERS, row: sheet.getLastRow(), earlier: null };
}

function noteRepeat_(sheet, row, column, now) {
  var cell = sheet.getRange(row, column);
  var existing = textOf(cell.getValue());
  cell.setValue((existing ? existing + ' · ' : '') + 'Sent again ' + Utilities.formatDate(now, 'Asia/Kolkata', 'd MMM, h:mm a'));
  return { sheet: sheet.getName(), row: row, earlier: null, repeat: true };
}

function noteOnRow_(saved, note) {
  var sheet = sheet_(saved.sheet);
  var column = saved.sheet === ENQUIRIES ? ENQUIRY_COLUMNS.length : CAREERS_COLUMNS.length;
  sheet.getRange(saved.row, column).setValue(note);
}

function rowLink_(saved) {
  var book = SpreadsheetApp.getActive();
  return book.getUrl() + '#gid=' + book.getSheetByName(saved.sheet).getSheetId() + '&range=A' + saved.row;
}

/** Counts per day, so a flood can't use up the account's sending allowance. */
function underDailyCap_(name, cap) {
  var properties = PropertiesService.getScriptProperties();
  var key = name + '-' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  var count = Number(properties.getProperty(key) || 0);
  if (count >= cap) return false;
  properties.setProperty(key, String(count + 1));
  return true;
}

function sendEmails_(kind, values, form, saved) {
  var quota = MailApp.getRemainingDailyQuota();
  var email = textOf(values.email);
  var validEmail = isEmail(email);
  if (quota > 0 && underDailyCap_('alerts', MAX_ALERTS_PER_DAY)) sendAlert_(kind, values, form, saved, validEmail);
  else noteOnRow_(saved, 'Over the daily email cap: see the morning summary');

  // Confirmations pause first when the allowance runs low; alerts continue (plan, section 6).
  if (!validEmail || quota <= QUOTA_RESERVE) return;
  var perAddress = 'confirm-' + email.toLowerCase() + '-' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  var properties = PropertiesService.getScriptProperties();
  if (properties.getProperty(perAddress)) return;
  if (!underDailyCap_('confirmations', MAX_CONFIRMATIONS_PER_DAY)) return;
  properties.setProperty(perAddress, '1');
  sendConfirmation_(kind, values, form, email);
}

function sendAlert_(kind, values, form, saved, validEmail) {
  var rows = (form && form.questions ? form.questions : []).map(function (question) {
    var answer = textOf(values[question.key]);
    return answer ? '<p><strong>' + escapeHtml(question.label) + '</strong><br>' + escapeHtml(answer) + '</p>' : '';
  }).join('');
  var notes = '';
  if (saved.earlier) notes += '<p><strong>Has enquired before — see earlier row ' + saved.earlier.row + '.</strong></p>';
  if (!validEmail) notes += '<p><strong>No email: reply on WhatsApp or phone.</strong></p>';
  var buttons = '<p><a href="' + rowLink_(saved) + '">Open in the Sheet</a>';
  var whatsApp = whatsAppNumber(values.phone);
  if (whatsApp) buttons += ' &nbsp;·&nbsp; <a href="https://wa.me/' + whatsApp + '">WhatsApp</a>';
  buttons += '</p>';
  var options = { htmlBody: notes + rows + buttons };
  if (validEmail) options.replyTo = textOf(values.email);
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), alertSubject(kind, values), ' ', options);
}

/** Leaves out the optional message, so the form can't carry someone else's words to a stranger. */
function sendConfirmation_(kind, values, form, email) {
  var wording = form && form.confirmationEmail ? form.confirmationEmail : 'Thank you. We reply within a day.';
  var lines = (form && form.questions ? form.questions : [])
    .filter(function (question) { return question.key !== 'message' && textOf(values[question.key]); })
    .map(function (question) { return question.label + ': ' + textOf(values[question.key]); });
  var subject = kind === 'careers' ? 'We have your application — WBSK' : 'We have your enquiry — WBSK';
  var body = wording + '\n\n' + (kind === 'careers' ? '' : lines.join('\n') + '\n\n') + 'Weddings By Siddhant Kapoor';
  MailApp.sendEmail(email, subject, body);
}

/* ---------- Sheet setup: run once. ---------- */

function setup() {
  var book = SpreadsheetApp.getActive();
  book.setSpreadsheetTimeZone('Asia/Kolkata');
  var enquiries = book.getSheetByName(ENQUIRIES) || book.insertSheet(ENQUIRIES);
  var careers = book.getSheetByName(CAREERS) || book.insertSheet(CAREERS);
  var summary = book.getSheetByName(SUMMARY) || book.insertSheet(SUMMARY);
  var first = book.getSheetByName('Sheet1');
  if (first) book.deleteSheet(first);

  setUpTab_(enquiries, ENQUIRY_COLUMNS, AUTO_ENQUIRY_COLUMNS);
  setUpTab_(careers, CAREERS_COLUMNS, AUTO_CAREERS_COLUMNS);
  setUpEnquiryRules_(enquiries);
  setUpCareerRules_(careers);
  setUpSummary_(summary);
  installTriggers_();
  book.setActiveSheet(enquiries);
  SpreadsheetApp.getUi().alert('WBSK Enquiries is set up.');
}

function setUpTab_(sheet, columns, autoCount) {
  sheet.getRange(1, 1, 1, columns.length).setValues([columns]).setFontWeight('bold').setBackground('#1F1914').setFontColor('#F5EFE6');
  sheet.setFrozenRows(1);
  var rows = Math.max(sheet.getMaxRows() - 1, 1000);
  if (sheet.getMaxRows() < rows + 1) sheet.insertRowsAfter(sheet.getMaxRows(), rows + 1 - sheet.getMaxRows());
  sheet.getRange(2, 1, rows, autoCount).setBackground('#EFEFEF');
  sheet.getRange(2, 1, rows, 1).setNumberFormat('d mmm yyyy, h:mm am/pm');
  // A warning rather than a lock: with one account as owner, Sheets can only warn (plan, section 6).
  var protection = sheet.getRange(2, 1, rows, autoCount).protect().setDescription('Filled by the form');
  protection.setWarningOnly(true);
}

function setUpEnquiryRules_(sheet) {
  var column = function (name) { return ENQUIRY_COLUMNS.indexOf(name) + 1; };
  var max = sheet.getMaxRows() - 1;
  var list = function (values) { return SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(false).build(); };
  sheet.getRange(2, column('Status'), max).setDataValidation(list(STAGES));
  sheet.getRange(2, column('Lost reason'), max).setDataValidation(list(LOST_REASONS));
  sheet.getRange(2, column('Last contact'), max, 2).setNumberFormat('d mmm yyyy');

  var status = 'S';
  var next = 'V';
  var lost = 'X';
  var open = '$' + status + '2<>"Confirmed",$' + status + '2<>"Lost"';
  var rules = [
    rule_('=AND($' + next + '2<>"",$' + next + '2<TODAY(),' + open + ')', '#F4C7C3', sheet.getRange(next + '2:' + next)),
    rule_('=AND($' + status + '2="New",$A2<>"",$A2<NOW()-1)', '#FCE8B2', sheet.getRange('A2:' + status)),
    rule_('=AND($' + status + '2="Lost",$' + lost + '2="")', '#F4C7C3', sheet.getRange(lost + '2:' + lost)),
    // Follow-up only becomes required once a row leaves New (G5).
    rule_('=AND($A2<>"",$' + status + '2<>"New",' + open + ',$' + next + '2="")', '#FCE8B2', sheet.getRange(next + '2:' + next)),
  ];
  sheet.setConditionalFormatRules(rules);
}

function rule_(formula, colour, range) {
  return SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied(formula).setBackground(colour).setRanges([range]).build();
}

function setUpCareerRules_(sheet) {
  var column = CAREERS_COLUMNS.indexOf('Status') + 1;
  var validation = SpreadsheetApp.newDataValidation().requireValueInList(CAREER_STAGES, true).setAllowInvalid(false).build();
  sheet.getRange(2, column, sheet.getMaxRows() - 1).setDataValidation(validation);
}

function setUpSummary_(sheet) {
  sheet.clear();
  var e = ENQUIRIES + '!';
  var rows = [
    ['WBSK Enquiries summary', ''],
    ['Updates itself. Nothing to type here.', ''],
    ['', ''],
    ['This month', '=COUNTIFS(' + e + 'A2:A,">="&EOMONTH(TODAY(),-1)+1,' + e + 'A2:A,"<"&EOMONTH(TODAY(),0)+1)'],
    ['Last month', '=COUNTIFS(' + e + 'A2:A,">="&EOMONTH(TODAY(),-2)+1,' + e + 'A2:A,"<"&EOMONTH(TODAY(),-1)+1)'],
    ['', ''],
    ['By stage', ''],
  ];
  STAGES.forEach(function (stage) { rows.push([stage, '=COUNTIF(' + e + 'S2:S,"' + stage + '")']); });
  rows.push(['', '']);
  rows.push(['Wedding', '=COUNTIF(' + e + 'B2:B,"Wedding")']);
  rows.push(['Pre-wedding', '=COUNTIF(' + e + 'B2:B,"Pre-wedding")']);
  rows.push(['Destination', '=COUNTIF(' + e + 'F2:F,"Destination")']);
  rows.push(['In my city', '=COUNTIF(' + e + 'F2:F,"In my city")']);
  rows.push(['', '']);
  rows.push(['Follow-ups overdue', '=COUNTIFS(' + e + 'V2:V,"<"&TODAY(),' + e + 'V2:V,"<>",' + e + 'S2:S,"<>Confirmed",' + e + 'S2:S,"<>Lost")']);
  sheet.getRange(1, 1, rows.length, 2).setValues(rows);
  sheet.getRange(1, 1).setFontWeight('bold').setFontSize(14);
  sheet.getRange(7, 1).setFontWeight('bold');
  sheet.setColumnWidth(1, 220);
  sheet.getDataRange().protect().setDescription('Formulas only').setWarningOnly(true);
}

function installTriggers_() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) { ScriptApp.deleteTrigger(trigger); });
  ScriptApp.newTrigger('morningSummary').timeBased().atHour(9).everyDays(1).inTimezone('Asia/Kolkata').create();
  ScriptApp.newTrigger('monthlyBackup').timeBased().onMonthDay(1).atHour(6).inTimezone('Asia/Kolkata').create();
}

/* ---------- Team helpers. ---------- */

/** Last contact fills itself whenever Status changes (Decision 26). */
function onEdit(event) {
  var range = event.range;
  if (!range || range.getSheet().getName() !== ENQUIRIES || range.getRow() < 2) return;
  if (range.getColumn() !== ENQUIRY_COLUMNS.indexOf('Status') + 1) return;
  range.getSheet().getRange(range.getRow(), ENQUIRY_COLUMNS.indexOf('Last contact') + 1).setValue(new Date());
}

/** 9am India time, only when something is due (Decision 27). */
function morningSummary() {
  var sheet = sheet_(ENQUIRIES);
  var last = sheet.getLastRow();
  if (last < 2) return;
  var col = function (name) { return ENQUIRY_COLUMNS.indexOf(name); };
  var data = sheet.getRange(2, 1, last - 1, ENQUIRY_COLUMNS.length).getValues();
  var now = new Date();
  var dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  var today = new Date(now);
  today.setHours(23, 59, 59, 999);
  var due = [];
  var waiting = [];
  data.forEach(function (row, index) {
    var status = row[col('Status')];
    var link = rowLink_({ sheet: ENQUIRIES, row: index + 2 });
    var line = '<li><a href="' + link + '">' + escapeHtml(row[col('Names')]) + '</a> · ' + escapeHtml(status) + '</li>';
    var flagged = textOf(row[col('Flag')]).indexOf('Likely spam') === 0;
    var next = row[col('Next follow-up')];
    if (next instanceof Date && next <= today && status !== 'Confirmed' && status !== 'Lost') due.push(line);
    if (status === 'New' && row[0] instanceof Date && row[0] < dayAgo && !flagged) waiting.push(line);
  });
  if (!due.length && !waiting.length) return;
  var subject = 'WBSK today: ' + due.length + ' follow-up' + (due.length === 1 ? '' : 's') + ' due, ' + waiting.length + ' enquir' + (waiting.length === 1 ? 'y' : 'ies') + ' still New';
  var html = '';
  if (due.length) html += '<h3>Follow-ups due</h3><ul>' + due.join('') + '</ul>';
  if (waiting.length) html += '<h3>Still New after a day</h3><ul>' + waiting.join('') + '</ul>';
  MailApp.sendEmail(Session.getEffectiveUser().getEmail(), subject, ' ', { htmlBody: html });
}

/** On the 1st, a dated copy in this account's Drive; the last 12 are kept (Decision 28). */
function monthlyBackup() {
  var book = SpreadsheetApp.getActive();
  var name = 'WBSK Enquiries backup ' + Utilities.formatDate(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
  DriveApp.getFileById(book.getId()).makeCopy(name);
  var files = DriveApp.searchFiles('title contains "WBSK Enquiries backup" and trashed = false');
  var copies = [];
  while (files.hasNext()) copies.push(files.next());
  copies.sort(function (a, b) { return b.getDateCreated() - a.getDateCreated(); });
  copies.slice(12).forEach(function (file) { file.setTrashed(true); });
}
