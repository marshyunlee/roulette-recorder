import { initRecorder } from './recorder/record.js'

chrome.runtime.onMessage.addListener(data => {
    const { event, params } = data
    switch (event) {
        case 'onStop':
            handleOnStop()
            break
        case 'onStart':
            handleOnStart(params)
            break
        default:
            break
    }
})

// ========== handlers ==========
const handleOnStop = () => {
    setRunningStatus(false)
    // TODO
}

const handleOnStart = (params) => {
    chrome.storage.local.set({ 
        "afreehpURL": params.afreehp_url,
        "webappURL": params.webapp_url
    })
    setRunningStatus(true)
    
    
    try {
        initRecorder(params)
    } catch(err) {
        console.error("Error from roulette recorder: " + err.toString())
    }
}

// ========== status management ==========
const setRunningStatus = (isRunning) => {
    chrome.storage.local.set({ "isRunning": isRunning })
}

