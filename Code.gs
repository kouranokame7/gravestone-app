// ============================================================
// hakaPIKA 顧客管理アプリ — Code.gs（JSON API版）
// ============================================================

var SHEET_NAME = "顧客データ";

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow([
      "ステータス", "現場名", "墓サイズ", "施主名",
      "電話番号", "郵便番号", "住所",
      "契約金額", "原価", "純利益", "利益率(%)",
      "工期開始日", "工期終了日", "備考"
    ]);
    var headerRange = sheet.getRange(1, 1, 1, 14);
    headerRange.setBackground("#4A90D9");
    headerRange.setFontColor("#FFFFFF");
    headerRange.setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

// CORSヘッダー付きJSONレスポンスを返す（JSONP対応）
function makeResponse(data, callback) {
  var json = JSON.stringify(data);
  if (callback) {
    // JSONP形式：callback_name({"data": "..."})
    return ContentService.createTextOutput(callback + "(" + json + ")")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    // 通常のJSON形式
    return ContentService.createTextOutput(json)
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// GETリクエスト処理（一覧取得）
function doGet(e) {
  var callback = e.parameter.callback;
  try {
    var action = e.parameter.action;
    if (action === "getCustomers") {
      return makeResponse(getCustomers(), callback);
    }
    return makeResponse({ error: "不明なアクション" }, callback);
  } catch (err) {
    return makeResponse({ error: err.toString() }, callback);
  }
}

// POSTリクエスト処理（追加・更新）
function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    if (action === "addCustomer") {
      return makeResponse(addCustomer(data));
    }
    if (action === "updateCustomer") {
      return makeResponse(updateCustomer(data));
    }
    return makeResponse({ error: "不明なアクション" });
  } catch (err) {
    return makeResponse({ error: err.toString() });
  }
}

// ============================================================
// データ取得・操作
// ============================================================

function getCustomers() {
  var sheet = getSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];

  var data = sheet.getRange(2, 1, lastRow - 1, 14).getValues();
  var customers = [];
  data.forEach(function(row, index) {
    if (row[0] === "" && row[1] === "") return;
    customers.push(rowToObject(row, index + 2));
  });
  return customers.reverse();
}

function rowToObject(row, rowNum) {
  var contractAmount = parseFloat(row[7]) || 0;
  var cost = parseFloat(row[8]) || 0;
  var profit = contractAmount - cost;
  var profitRate = contractAmount > 0 ? Math.round((profit / contractAmount) * 1000) / 10 : 0;
  return {
    rowNum: rowNum,
    status: row[0] || "",
    fieldName: row[1] || "",
    graveSize: row[2] || "",
    ownerName: row[3] || "",
    phone: row[4] || "",
    postalCode: row[5] || "",
    address: row[6] || "",
    contractAmount: contractAmount,
    cost: cost,
    profit: profit,
    profitRate: profitRate,
    startDate: formatDate(row[11]),
    endDate: formatDate(row[12]),
    notes: row[13] || ""
  };
}

function formatDate(val) {
  if (!val) return "";
  if (val instanceof Date) {
    var y = val.getFullYear();
    var m = ("0" + (val.getMonth() + 1)).slice(-2);
    var d = ("0" + val.getDate()).slice(-2);
    return y + "-" + m + "-" + d;
  }
  return val.toString();
}

function addCustomer(data) {
  var sheet = getSheet();
  var contractAmount = parseFloat(data.contractAmount) || 0;
  var cost = parseFloat(data.cost) || 0;
  var profit = contractAmount - cost;
  var profitRate = contractAmount > 0 ? Math.round((profit / contractAmount) * 1000) / 10 : 0;
  sheet.appendRow([
    data.status || "", data.fieldName || "", data.graveSize || "", data.ownerName || "",
    data.phone || "", data.postalCode || "", data.address || "",
    contractAmount, cost, profit, profitRate,
    data.startDate || "", data.endDate || "", data.notes || ""
  ]);
  return { success: true, message: "登録しました" };
}

function updateCustomer(data) {
  var sheet = getSheet();
  var rowNum = parseInt(data.rowNum);
  if (!rowNum || rowNum < 2) throw new Error("行番号が不正です");
  var contractAmount = parseFloat(data.contractAmount) || 0;
  var cost = parseFloat(data.cost) || 0;
  var profit = contractAmount - cost;
  var profitRate = contractAmount > 0 ? Math.round((profit / contractAmount) * 1000) / 10 : 0;
  sheet.getRange(rowNum, 1, 1, 14).setValues([[
    data.status || "", data.fieldName || "", data.graveSize || "", data.ownerName || "",
    data.phone || "", data.postalCode || "", data.address || "",
    contractAmount, cost, profit, profitRate,
    data.startDate || "", data.endDate || "", data.notes || ""
  ]]);
  return { success: true, message: "更新しました" };
}
