/**
 * Google Sheets backend for the undangan-4.x invitation site.
 * Required Script Properties:
 *   SPREADSHEET_ID = ID of the Google spreadsheet
 *   ADMIN_PASSWORD = a strong password used by the Apps Script admin page
 */
var GUESTS_SHEET = 'Guests';
var RSVP_SHEET = 'RSVP';

function doGet(e) {
  if (e && e.parameter && e.parameter.page === 'admin') {
    return HtmlService.createHtmlOutputFromFile('Admin')
      .setTitle('Wedding Invitation Admin')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.DEFAULT);
  }
  return jsonOutput_({ ok: true, message: 'Invitation backend is running.' });
}

function doPost(e) {
  try {
    var body = e && e.postData && e.postData.contents ? JSON.parse(e.postData.contents) : {};
    if (body.action !== 'submitRsvp') return jsonOutput_({ ok: false, error: 'Unsupported action.' });
    var guestId = String(body.guestId || '').trim();
    var name = cleanText_(body.name, 100);
    var attendance = String(body.attendance || '');
    var wishes = cleanText_(body.wishes, 1000);
    if (!guestId || name.length < 2 || ['Attending', 'Not attending'].indexOf(attendance) < 0) {
      return jsonOutput_({ ok: false, error: 'Invalid RSVP fields.' });
    }

    var ss = spreadsheet_();
    var guests = getSheet_(ss, GUESTS_SHEET, ['Guest ID', 'Name', 'Phone', 'Invited', 'Created At']);
    var guestRow = findRowById_(guests, guestId);
    if (!guestRow) return jsonOutput_({ ok: false, error: 'Unknown guest ID.' });

    // The guest ID is authoritative; do not let a public visitor overwrite another guest's name.
    var canonicalName = String(guests.getRange(guestRow, 2).getValue());
    var rsvp = getSheet_(ss, RSVP_SHEET, ['Guest ID', 'Guest Name', 'Attendance', 'Wishes', 'Submitted At']);
    var existingRow = findRowById_(rsvp, guestId);
    var row = [guestId, canonicalName, attendance, wishes, new Date()];
    if (existingRow) rsvp.getRange(existingRow, 1, 1, row.length).setValues([row]);
    else rsvp.appendRow(row);
    return jsonOutput_({ ok: true, message: 'RSVP saved.' });
  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

function adminLogin(password) {
  var expected = PropertiesService.getScriptProperties().getProperty('ADMIN_PASSWORD');
  if (!expected || String(password || '') !== expected) return { ok: false, message: 'Invalid password.' };
  var token = Utilities.getUuid() + Utilities.getUuid();
  CacheService.getScriptCache().put('admin:' + token, '1', 21600);
  return { ok: true, token: token };
}

function adminGetData(token) {
  requireAdmin_(token);
  var ss = spreadsheet_();
  var guests = getSheet_(ss, GUESTS_SHEET, ['Guest ID', 'Name', 'Phone', 'Invited', 'Created At']);
  var rsvps = getSheet_(ss, RSVP_SHEET, ['Guest ID', 'Guest Name', 'Attendance', 'Wishes', 'Submitted At']);
  return { ok: true, guests: rowsAsObjects_(guests), rsvps: rowsAsObjects_(rsvps) };
}

function adminAddGuest(token, name, phone) {
  requireAdmin_(token);
  name = cleanText_(name, 100);
  phone = cleanText_(phone, 40);
  if (name.length < 2) throw new Error('Guest name must contain at least 2 characters.');
  var sheet = getSheet_(spreadsheet_(), GUESTS_SHEET, ['Guest ID', 'Name', 'Phone', 'Invited', 'Created At']);
  var id = Utilities.getUuid();
  sheet.appendRow([id, name, phone, 'No', new Date()]);
  return { ok: true, guest: { id: id, name: name, phone: phone, invited: 'No' } };
}

function adminSetInvited(token, guestId, invited) {
  requireAdmin_(token);
  var sheet = getSheet_(spreadsheet_(), GUESTS_SHEET, ['Guest ID', 'Name', 'Phone', 'Invited', 'Created At']);
  var row = findRowById_(sheet, String(guestId));
  if (!row) throw new Error('Guest not found.');
  sheet.getRange(row, 4).setValue(invited ? 'Yes' : 'No');
  return { ok: true };
}

function spreadsheet_() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) throw new Error('Set SPREADSHEET_ID in Apps Script Project Settings > Script Properties.');
  return SpreadsheetApp.openById(id);
}

function getSheet_(ss, name, headers) {
  var sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  if (sheet.getLastRow() === 0) sheet.appendRow(headers);
  return sheet;
}

function findRowById_(sheet, id) {
  if (sheet.getLastRow() < 2) return 0;
  var found = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1)
    .createTextFinder(String(id)).matchEntireCell(true).findNext();
  return found ? found.getRow() : 0;
}

function rowsAsObjects_(sheet) {
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values.shift();
  return values.filter(function (row) { return row[0] !== ''; }).map(function (row) {
    var item = {};
    headers.forEach(function (header, i) {
      var value = row[i];
      item[header] = value instanceof Date ? value.toISOString() : value;
    });
    return item;
  });
}

function requireAdmin_(token) {
  if (!token || CacheService.getScriptCache().get('admin:' + token) !== '1') {
    throw new Error('Admin session expired. Please log in again.');
  }
}

function cleanText_(value, maxLength) {
  return String(value == null ? '' : value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, maxLength);
}

function jsonOutput_(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
