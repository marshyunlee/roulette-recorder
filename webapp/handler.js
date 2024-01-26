// table name that is found at the left bottom of the actual sheet.
const tableName = "대시보드" // name of the record sheet
const topMargin = 2 // number of the title row overheads
const leftMargin = 2 // number of the left column overheads

const indexTableName = "기록" // name of the history sheet
const firstHistoryItemIdx = 3 // first item index
const MAX_API_RECORD = 300 // maximum records to keep in the sheet


// ========== runtime ==========
const paramKey_id = "id"
const paramKey_nickname = "nickname"
const paramKey_time = "time"
const paramKey_reward = "result"

const ss= SpreadsheetApp.getActiveSpreadsheet()
const sheet = ss.getSheetByName(tableName)
const indexTable = ss.getSheetByName(indexTableName)

// TODO - beware of the hardcoded cell location. Make dynamic or create sheet template
// probably better to use stream iteration? idk
let topMarginNum = topMargin+1
const players = sheet.getRange("A" + topMarginNum + ":A")
const rewards = sheet.getRange("C" + leftMargin + ":Z" + leftMargin)
const indexRange = indexTable.getRange("A" + firstHistoryItemIdx + ":A")

/*
- Google Sheet webapp's post request handler
- This does not return anything to the client
- example request body schema:
{
  "id": "afreehp",
  "nickname": "아프리카도우미",
  "time": 123123123,
  "result": "공포게임"
}
*/
function doPost(e) {
  let lock = LockService.getPublicLock()
  lock.waitLock(300000) // standby up to 5 min
  Logger.log("recordRoulette is called: " + e)
  console.log("recordRoulette is called: " + e)
  
  if (e === undefined || e === null || e.postData === undefined || e.postData === null) {
      return // invalid request; do nothing
  }

  let jsonString = e.postData.getDataAsString();
  let jsonData = JSON.parse(jsonString);

  if (jsonData !== null && jsonData.records !== null && jsonData.records.length > 0) {
    jsonData.records.forEach((record) => {
      targetId = record[paramKey_id]
      targetNickname = record[paramKey_nickname]
      targetTime = record[paramKey_time]
      targetReward = record[paramKey_reward]
      Logger.log("userID: " + targetId + ":" + targetTime + " -> " + targetNickname + " won " + targetReward)

      // indexTable check
      let key = `${targetId}:${targetTime}`
      if (isKeyUnique(key)) {
        if (indexTable.getLastRow() >= MAX_API_RECORD) {
          indexTable.deleteRow(MAX_API_RECORD)
        }
        indexTable.insertRowBefore(firstHistoryItemIdx)
        indexTable.getRange(firstHistoryItemIdx, 1, 1, 4).setValues([[key, targetNickname, targetReward, new Date(Number(targetTime)).toLocaleString("ko-KR")]])

        let userIdx   = getOrInsertConditionFromRange(players, targetId, true, targetNickname) // find uid from players column range
        let rewardIdx = getOrInsertConditionFromRange(rewards, targetReward, false) // find reward from rewards row range (top-most row)

        // boundary check
        if (userIdx < topMargin || rewardIdx < leftMargin) {
          return
        }

        // update the target cell
        Logger.log("setting the target cell: (" + userIdx + ", " + rewardIdx + ")")
        let targetCell = sheet.getRange(userIdx, rewardIdx)
        let currVal = targetCell.getValue()
        if (typeof(currVal) === "number") {
          targetCell.setValue(currVal + 1)
        } else {
          targetCell.setValue(1)
        }
      }
    })
  }

  lock.releaseLock()
  
  // send response to notify the client upon completion
  // TODO - return failure status for retry
  return ContentService.createTextOutput('')
}

function isKeyUnique(key) {
  let idxs = indexRange.getValues()
  idxs = idxs.filter(e => e[0])

  for (let i = 0; i < idxs.length; i++) {
    let curr = idxs[i][0]
    if (curr === "" || curr === key) {
      return false
    }
  }
  return true
}

// returns the index number of the FIRST condition found in the single-lined range
// if not found, insert the condition to the first available row (i.e., to the first empty cell)
function getOrInsertConditionFromRange(targetRange, condition, isUserSearch, targetNickname) {
  if (!condition || typeof(condition) !== "string" || condition === "") {
    return 0
  }

  let values = isUserSearch ? targetRange.getValues() : targetRange.getValues()[0]
  let margin = isUserSearch ? topMargin : leftMargin

  // iterative search for the condition as substring
  let idx = 0
  let emptySlot = 0
  let isFound = false
  for (let i = 0; i < values.length; i++) {
    idx++ // increment regardless
    if (values[i] === undefined || values[i] === null) {
      // invalid condition; skip
      continue
    }

    let targetVal = isUserSearch && values[i].length !== 0 ? values[i].shift() : values[i]
    if (
        (typeof(targetVal) === "string" && targetVal.includes(condition)) ||
        (typeof(targetVal) === "number" && targetVal.toString().includes(condition))
      ) {
      isFound = true
      break
    } else if (targetVal === "" && emptySlot === 0) {
      emptySlot = idx
    }
  }

  // return the idx ONLY if found; otherwise return the new inserted val
  if (isFound) {
    idx += margin
    if (isUserSearch && targetNickname !== null) {
      Logger.log("inserting nickname to:" + idx + " : " + leftMargin)
      sheet.getRange(idx, leftMargin).setValue(targetNickname)
    }
    return idx
  } else {
    // insert the user to the first empty row
    emptySlot += margin
    let cellToInsert = isUserSearch ? sheet.getRange(emptySlot, 1) : sheet.getRange(topMargin, emptySlot)
    cellToInsert.setValue(condition)
    if (isUserSearch && targetNickname !== null) {
      Logger.log("inserting nickname to:" + emptySlot + " : " + leftMargin)
      sheet.getRange(emptySlot, leftMargin).setValue(targetNickname)
    }
    return emptySlot
  }

  // not reachable
}