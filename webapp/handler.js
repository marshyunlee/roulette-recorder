// table name that is found at the left bottom of the actual sheet.
const tableName = "대시보드"
const indexTableName = "기록"
const topMargin = 2
const leftMargin = 1

const paramKey_id = "id"
const paramKey_time = "time"
const paramKey_reward = "result"

const ss= SpreadsheetApp.getActiveSpreadsheet()
const sheet = ss.getSheetByName(tableName)
const indexTable = ss.getSheetByName(indexTableName)

// TODO - beware of the hardcoded cell location. Make dynamic or create sheet template
// probably better to use stream iteration? idk
const players = sheet.getRange("A3:A")
const rewards = sheet.getRange("B2:Z2")
const indexRange = indexTable.getRange("A3:A")

/*
- Google Sheet webapp's post request handler
- This does not return anything to the client
- example request body schema:
{
    "id": "afreehp",
    "time": 123123123,
    "result": "3분 asmr"
}
*/
function doPost(e) {
    // Logger.log("recordRoulette is called: " + e)
    if (e === undefined || e === null || e.postData === undefined || e.postData === null) {
        return // invalid request; do nothing
    }

    let jsonString = e.postData.getDataAsString();
    let jsonData = JSON.parse(jsonString);
    
    targetId = jsonData[paramKey_id]
    targetTime = jsonData[paramKey_time]
    targetReward = jsonData[paramKey_reward]
    
    // targetId = "afreehp"
    // targetTime = "1704800620934"
    // targetReward = "방셀"
    // Logger.log("incrementing userID: " + targetId + ":" + targetTime + " for reward: " + targetReward)

    // indexTable check
    let key = `${targetId}:${targetTime}`
    // Logger.log(isKeyUnique(key))
    if (isKeyUnique(key)) {
        indexTable.appendRow([key, targetReward])

        let userIdx   = getOrInsertConditionFromRange(players, targetId, true) // find uid from players column range (left-most column)
        let rewardIdx = getOrInsertConditionFromRange(rewards, targetReward, false) // find reward from rewards row range (top-most row)

        // boundary check
        if (userIdx < topMargin || rewardIdx < leftMargin) {
            return
        }

        // update the target cell
        // Logger.log("setting the target cell: (" + userIdx + ", " + rewardIdx + ")")
        let targetCell = sheet.getRange(userIdx, rewardIdx)
        let currVal = targetCell.getValue()
        if (typeof(currVal) === "number") {
            targetCell.setValue(currVal + 1)
        } else {
            targetCell.setValue(1)
        }
    }
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
function getOrInsertConditionFromRange(targetRange, condition, isRangeColumn) {
    if (!condition || typeof(condition) !== "string" || condition === "") {
        return 0
    }

    let values = isRangeColumn ? targetRange.getValues() : targetRange.getValues()[0]
    let margin = isRangeColumn ? topMargin : leftMargin

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

        let targetVal = isRangeColumn && values[i].length !== 0 ? values[i].shift() : values[i]
        if (typeof(targetVal) === "string" && targetVal.includes(condition)) {
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
        let cellToInsert = isRangeColumn ? sheet.getRange(emptySlot, leftMargin) : sheet.getRange(topMargin, emptySlot)
        cellToInsert.setValue(condition)
        return emptySlot
    }

    // not reachable
}
