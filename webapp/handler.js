// Use your own document ID. This is the hash string found in the URL. For example:
// https://docs.google.com/spreadsheets/d/1mpTFPW88Bs8T3vT_ltSYlvxRniT3WoT5bVp9an4l-Ec/edit#gid=0
const sheetID = "1mpTFPW88Bs8T3vT_ltSYlvxRniT3WoT5bVp9an4l-Ec"
// table name that is found at the left bottom of the actual sheet.
const tableName = "시트1"
const topMargin = 4
const leftMargin = 1

const paramKey_id = "id"
const paramKey_reward = "result"

const ss= SpreadsheetApp.openById(sheetID)
const sheet = ss.getSheetByName(tableName)

// TODO - beware of the hardcoded cell location. Make dynamic or create sheet template
// probably better to use stream iteration? idk
const players = sheet.getRange("A5:A")
const rewards = sheet.getRange("B4:Z4")

/*
- Google Sheet webapp's post request handler
- This does not return anything to the client
- example request body schema:
{
    "id": "afreehp",
    "result": "3분 asmr"
}
*/
function doPost(e) {
    // Logger.log("recordRoulette is called: " + e)
    if (e === undefined || e === null || e.postData === undefined || e.postData === null) {
        return // invalid request; do nothing
    }

    var jsonString = e.postData.getDataAsString();
    var jsonData = JSON.parse(jsonString);
    
    targetId = jsonData[paramKey_id]
    targetReward = jsonData[paramKey_reward]
    // Logger.log("incrementing userID: " + targetId + "for reward: " + targetReward)

    var userIdx   = getOrInsertConditionFromRange(players, targetId, true) // find uid from players column range (left-most column)
    var rewardIdx = getOrInsertConditionFromRange(rewards, targetReward, false) // find reward from rewards row range (top-most row)


    // boundary check
    if (userIdx < topMargin || rewardIdx < leftMargin) {
        return
    }

    // update the target cell
    // Logger.log("setting the target cell: (" + userIdx + ", " + rewardIdx + ")")
    var targetCell = sheet.getRange(userIdx, rewardIdx)
    var currVal = targetCell.getValue()
    if (typeof(currVal) === "number") {
        targetCell.setValue(currVal + 1)
    } else {
        targetCell.setValue(1)
    }
}

// returns the index number of the FIRST condition found in the single-lined range
// if not found, insert the condition to the first available row (i.e., to the first empty cell)
function getOrInsertConditionFromRange(targetRange, condition, isRangeColumn) {
    if (!condition || typeof(condition) !== "string" || condition === "") {
        return 0
    }

    var values = isRangeColumn ? targetRange.getValues() : targetRange.getValues()[0]
    let margin = isRangeColumn ? topMargin : leftMargin

    // iterative search for the condition as substring
    var idx = 0
    var emptySlot = 0
    var isFound = false
    for (var i = 0; i < values.length; i++) {
        idx++ // increment regardless
        if (values[i] === undefined || values[i] === null) {
            // invalid condition; skip
            continue
        }

        var targetVal = isRangeColumn && values[i].length !== 0 ? values[i].shift() : values[i]
        if (targetVal.includes(condition)) {
            isFound = true
            break
        } else if (targetVal === "" && emptySlot === 0) {
            emptySlot = idx
        }
    }

    // return the idx ONLY if found; otherwise return the new inserted val
    if (isFound) {
        return (idx + margin)
    } else {
        // insert the user to the first empty row
        emptySlot += margin
        var cellToInsert = isRangeColumn ? sheet.getRange(emptySlot, leftMargin) : sheet.getRange(topMargin, emptySlot)
        cellToInsert.setValue(condition)
        return emptySlot
    }

    // not reachable
}
