const app = require("./app.js")
const util = require("util")
const fs = require("fs")
const path = require("path")

// user config storage path
const configPath = path.join(process.resourcesPath, 'config.json')
const logPath = path.join(process.resourcesPath, 'log.txt')

// user input for Afreehp widget
const afreehpUrlElem = document.getElementById("afreehp_url")
// user input for Google Sheet webapp
const webappUrlElem = document.getElementById("webapp_url")

// status tags
const runningTagElem = document.getElementById("running_tag")
const stopptedTagElem = document.getElementById("stopped_tag")
const afreehpUrlWarning = document.getElementById("invalid_afreehp_warning")
const webappUrlWarning = document.getElementById("invalid_api_warning")

// button UI
const startButton = document.getElementById("start_button")
const logButton = document.getElementById("log_button")

// input verification rules
const afreehpUrlRegex = `^http://afreehp.kr/page/.*$`
const webappUrlRegex = `^https:\/\/script\.google\.com\/macros\/s\/.*\/exec$`

// element state control helpers
const hideElem = (elem) => elem.style.display = 'none'
const showElem = (elem) => elem.style.display = ''
const enableElem = (elem) => elem.disabled = false
const disableElem = (elem) => elem.disabled = true

// ========== button logics ==========
startButton.onclick = () => {
    if (!validateFields()) {
        return // do nothing
    }

    let config = {
        "afreehp_url": afreehpUrlElem.value,
        "webapp_url": webappUrlElem.value
    }
    fs.writeFile(configPath, JSON.stringify(config), () => {})
    handleOnStartState()
    app.startRouletteRecorder(afreehpUrlElem.value, webappUrlElem.value)
}

logButton.onclick = () => {
    window.open(logPath)
}

// loading previous user configs...
fs.readFile(configPath, (_, data) => {
    if (data == null || data.length == 0) {
        console.log("previous user config is not available. leaving the form blank")
        return // do nothing if unavailable
    }

    let read = JSON.parse(data.toString())
    if (read != null) {
        populateURL(afreehpUrlElem, read.afreehp_url)
        populateURL(webappUrlElem, read.webapp_url)
    }
})

const populateURL = (targetElem, value) => {
    if (value && typeof(value) === "string" && value !== "") {
        targetElem.value = value
    }
}

// ========== helpers ==========
const handleOnStartState = () => {
    showElem(runningTagElem)
    hideElem(stopptedTagElem)

    disableElem(startButton)
}

const handleOnStopState = () => {
    hideElem(runningTagElem)
    showElem(stopptedTagElem)
    
    enableElem(startButton)
}

const checkFieldSanity = (targetElement, targetWarningElem, regex) => {
    // Afreehp Widget URL sanity check
    if (targetElement !== undefined && targetElement !== null &&
        targetElement.value !== undefined && targetElement.value !== null) {
        
        // content check
        let content = targetElement.value
        if (content && typeof(content) === "string" && content !== "") {    

            // URL check
            let matches = content.match(regex)
            if (matches && matches.length === 1) {
                // then it's valid
                hideElem(targetWarningElem)
                return true
            }
        }
    }

    showElem(targetWarningElem)
    return false
}

const validateFields = () => {
    return (
        checkFieldSanity(afreehpUrlElem, afreehpUrlWarning, afreehpUrlRegex) && // Afreehp Widget URL sanity check
        checkFieldSanity(webappUrlElem, webappUrlWarning, webappUrlRegex) // Google Sheet webapp URL sanity check
    )
}
