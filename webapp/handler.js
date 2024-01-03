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
    if (e === undefined || e === null || e.postData === null) {
        return // invalid request; do nothing
    }

    var jsonString = e.postData.getDataAsString();
    var jsonData = JSON.parse(jsonString);
    
    targetId = jsonData[paramKey_id]
    targetReward = jsonData[paramKey_reward]
    // Logger.log("incrementing userID: " + targetId + "for reward: " + targetReward)

    var userRow = getOrInsertPlayerRow(players, targetId)
    var rewardCol = getRewardColumn(rewards, targetReward)


    // boundary check
    if (userRow < topMargin || rewardCol < leftMargin) {
        return
    }

    // update the target cell
    // Logger.log("setting the target cell: (" + userRow + ", " + rewardCol + ")")
    var targetCell = sheet.getRange(userRow, rewardCol)
    var currVal = targetCell.getValue()
    if (typeof(currVal) === "number") {
        targetCell.setValue(currVal + 1)
    } else {
        targetCell.setValue(1)
    }
}

// returns the row number of the FIRST userID found in the column
// if not found, insert the user to the first available row (i.e., to the first empty cell)
function getOrInsertPlayerRow(columnRange, userId) {
    if (!userId || typeof(userId) !== "string" || userId === "") {
        return 0
    }
    // value pool to iterate
    var values = columnRange.getValues()

    // iterative search for the userId with substring condition
    var idx = 0
    var emptySlot = 0
    var isFound = false
    for (var i = 0; i < values.length; i++) {
        idx++ // increment regardless
        if (values[i] === undefined || values[i] === null || values[i].length === 0) {
            // invalid condition; skip
            continue
        }

        var targetVal = values[i].shift()
        if (targetVal.includes(userId)) {
            isFound = true
            break
        } else if (targetVal === "" && emptySlot === 0) {
            emptySlot = idx
        }
    }

    // return the idx ONLY if found; otherwise return the new inserted val
    if (isFound) {
        return (idx + topMargin)
    } else {
        // insert the user to the first empty row
        emptySlot += topMargin
        var cellToInsert = sheet.getRange(emptySlot, 1) 
        cellToInsert.setValue(userId)
        return emptySlot
    }

    // not reachable
}


// skip the request if reward's not found
// no need to insert anything unlike userID search
function getRewardColumn(rowRange, condition) {
    if (!condition || typeof(condition) !== "string" || condition === "") {
        return 0
    }

    // single row scan for rewards
    var values = rowRange.getValues()[0]

    var cnt = 0
    for (var i = 0; i < values.length; i++) {
        cnt++
        if (values[i] === undefined || values[i] === null || typeof(values[i]) !== "string") {
            // invalid ground; skipping...
            continue
        }
        if (values[i].includes(condition)) {
            break // found
        }
    }

    return (cnt + leftMargin)
}