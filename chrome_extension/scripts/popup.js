// ========== doucment elems ==========
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
const stopButton = document.getElementById("stop_button")

const afreehpUrlRegex = `^http://afreehp.kr/page/.*$`
const webappUrlRegex = `^https:\/\/script\.google\.com\/macros\/s\/.*\/exec$`
const hideElem = (elem) => elem.style.display = 'none'
const showElem = (elem) => elem.style.display = ''
const enableElem = (elem) => elem.disabled = false
const disableElem = (elem) => elem.disabled = true

const handleOnStartState = () => {
    showElem(runningTagElem)
    hideElem(stopptedTagElem)
    
    enableElem(stopButton)
    disableElem(startButton)
}

const handleOnStopState = () => {
    hideElem(runningTagElem)
    showElem(stopptedTagElem)
    
    disableElem(stopButton)
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
            console.log(matches)
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

// ========== button logics ==========
startButton.onclick = () => {
    if (!validateFields()) {
        return // do nothing
    }

    const params = {
        afreehp_url: afreehpUrlElem.value,
        webapp_url: webappUrlElem.value
    }
    handleOnStartState()
    chrome.runtime.sendMessage({ event: 'onStart', params })
}

stopButton.onclick = () => {
    handleOnStopState()
    chrome.runtime.sendMessage({ event: 'onStop' })
}

chrome.storage.local.get([ "afreehpURL", "webappURL", "isRunning" ], result => {
    const { afreehpURL, webappURL, isRunning } = result
    populateURL(afreehpUrlElem, afreehpURL)
    populateURL(webappUrlElem, webappURL)
    
    if (isRunning) {
        handleOnStartState()
    } else {
        handleOnStopState()
    }
})

const populateURL = (targetElem, value) => {
    if (value && typeof(value) === "string" && value !== "") {
        targetElem.value = value
    }
}