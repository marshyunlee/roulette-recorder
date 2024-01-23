const util = require("util")
const io = require("socket.io-client")
const request = require('request')
const requestPromise = util.promisify(request)
const XMLHttpRequest = require('xhr2')
const fs = require('fs')
const path = require('path')
// require('console-stamp') (console, { format: ':date(yyyy/mm/dd HH:MM:ss.l)' })

// runtime variables
const logPath = path.join(process.resourcesPath, 'log.txt')
const portNumber = "13536"
const afreehpDomain = "http://afreehp.kr"
const sleep = ms => new Promise(res => setTimeout(res, ms));

// user configuration
var userConfig = {}

// transportation
var xhr = new XMLHttpRequest()
var isPosting = false

// just keep the keys to save API calls
// TODO - periodically clear the set to save mem... or is it even needed?
var keyCache = new Set()

// log streams
var logStream = fs.createWriteStream(logPath, {flags: 'a'})
const getTs = () => { return new Date().toLocaleString("ko-KR") }
const logInfo = (content) => { logStream.write(`[${getTs()}] INFO: ${content}\n`) }
const logError = (content) => { logStream.write(`[${getTs()}] ERROR: ${content}\n`) }

// postData sends a request to the Google sheet webapp's post endpoint
// this helper assumes that the data is always valid -- validation must be done by the caller
async function postData(data) {
    isPosting = true
    
    for (let i = 0; i < data.length; i++) {
        let curr = data[i]

        // skip if current is not roulette data
        if (
            curr.roulettedata !== undefined &&
            curr.roulettedata.list !== undefined &&
            curr.roulettedata.result <= curr.roulettedata.list.length - 1
            ) {

            const uid = curr.id
            const result = curr.roulettedata.list[curr.roulettedata.result]
            const time = curr.time
            const nickname = curr.name

            // cache check
            const key = `${uid}:${time}`
            if (keyCache.has(key)) {
                continue
            }
            
            keyCache.add(key)
            logInfo(`시간: ${time} ::: ${uid} - ${result}`)
            // send player uid and roulette result to Google sheet webapp's post API
            await xhr.open('POST', userConfig.webapp_url)
            xhr.setRequestHeader("Accept", "application/json")
            xhr.setRequestHeader("Content-Type", "application/json")
            let body =
            `{
                "id": "${uid}",
                "nickname": "${nickname}",
                "time": "${time}",
                "result": "${result}"
            }`
            await xhr.send(body)
            await sleep(10)
        }
    }
    isPosting = false
}

// handle connection to afreehp donation page service
function connectAfreehp() {
    if (userConfig.idx === undefined) {
        logError("Failed to locate afreehp.idx")
        return
    }

    const afreehpURL = afreehpDomain + ":" + portNumber
    const socketAfreehp = io(afreehpURL, {
        transports: ['websocket'],
        reconnection: true,
        reconnectionDelay: 10000,
        autoConnect: false
    })

    socketAfreehp.on("connect", () => {
        logInfo("Afreehp Connected")
        socketAfreehp.emit("page", { idx: userConfig.idx })
    })
    socketAfreehp.on("connect_error", (err) => logError("SocketEvent: Afreehp connect_error: " + err))
    socketAfreehp.on("close", () => logInfo("SocketEvent: Afreehp close"))
    socketAfreehp.on("error", () => logError("SocketEvent: Afreehp error"))

    socketAfreehp.on("cmd", (data) => {
        try {
            // alertlist check
            if (data.type === "alertload" && data.sub === "load" && data.data !== undefined && data.data.length > 0) {
                // retrieve all donation history
                postData(data.data)
            }
        } catch(err) {
            logError("Failed to parse a message from Afreehp page", err.toString())
        }
    })

    // // hto get all packet for debugging
    // let onEvent = socketAfreehp.onevent
    // socketAfreehp.onevent = (packet) => {
    //     onEvent.call(socketAfreehp, packet)
    //     packet.data = ["*"].concat(packet.data || [])
    //     onEvent.call(socketAfreehp, packet)
    // }    
    // // all events
    // socketAfreehp.on("*", (event, data) => {
    //     console.log(">>>>> listening to an wildcard event: " + event)
    //     console.log(data)
    // })

    setTimeout(() => {
        socketAfreehp.connect()
    }, 1000)

    // donation history fetch interval
    setInterval(() => {
        if (!isPosting) {
            socketAfreehp.emit("setupcmd", { type:"alertlist", sub:"load", idx:userConfig.idx, pageid:"0", subpage:"0" })
        }
    }, 5000)

    // cache set clear interval
    setInterval(() => {
        keyCache.clear()
    }, 360000)
}


async function initRecorder() {
    logInfo("=========================================")
    logInfo("Initializing afreehp donation page socket")
    try {
        let response = await requestPromise(userConfig.alertbox_url)
        if (response.statusCode == 200) {
            let idxMatch = response.body.match(/idx:\s*"([a-zA-Z0-9]+)",/)
            if (idxMatch !== null && idxMatch.length > 1) {
                userConfig.idx = idxMatch[1]
                logInfo(`Successfully acquired afreehp.idx : ${userConfig.idx}`)
            } else {
                logError("Get afreehp.idx parse failed.")
            }
        } else {
            logError("non-200 status code retrieved from alertbox_url. statusCode=" + response.statusCode)
        }
    } catch (err) {
        logError("Error occured during afreehp.idx parsing. error=" + err.toString())
    }

    connectAfreehp()
}

// this function always assumes that the parameters are valid URL
// the frontend caller MUST validate before calling
async function startRouletteRecorder(afreehpUrl, webappUrl) {
    userConfig.alertbox_url = afreehpUrl
    userConfig.webapp_url = webappUrl
    try {
        initRecorder()
    } catch (err) {
        logError(`init error: ${err}`)
        return false
    }
}

module.exports = { startRouletteRecorder }
