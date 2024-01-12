const util = require("util");
const io = require("socket.io-client");
const request = require('request');
const requestPromise = util.promisify(request);
const XMLHttpRequest = require('xhr2');
require('console-stamp')(console, { 
    format: ':date(yyyy/mm/dd HH:MM:ss.l)' 
});

// runtime variables
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

// postData sends a request to the Google sheet webapp's post endpoint
// param examples: [URL]?id=asdf&result=손편지
// this helper assumes that the data is always valid -- validation must be done by the caller
async function postData(data) {
    isPosting = true
    
    for (let i = 0; i < data.length; i++) {
        let curr = data[i]
        
        // skip if current is not roulette data
        if (curr.roulettedata !== undefined &&
            curr.roulettedata.list !== undefined &&
            curr.roulettedata.result <= curr.roulettedata.list.length - 1)
            {
            
            const uid = curr.id
            const result = curr.roulettedata.list[curr.roulettedata.result]
            const time = curr.time            

            // cache check
            const key = `${uid}:${time}`
            if (keyCache.has(key)) {
                continue
            }
            
            keyCache.add(key)
            console.log(`시간: ${time} ::: ${uid} - ${result}`)
            // send player uid and roulette result to Google sheet webapp's post API
            await xhr.open('POST', userConfig.webapp_url)
            xhr.setRequestHeader("Accept", "application/json")
            xhr.setRequestHeader("Content-Type", "application/json")
            let body =
            `{
                "id": "${uid}",
                "time": "${time}",
                "result": "${result}"
            }`
            await xhr.send(body)
            await sleep(2000)
        }
    }
    isPosting = false
}

// handle connection to afreehp donation page service
function connectAfreehp() {
    if (userConfig.idx === undefined) {
        console.log("Failed to locate afreehp.idx")
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
        console.log("Afreehp Connected")
        socketAfreehp.emit("page", { idx: userConfig.idx })
    })
    socketAfreehp.on("connect_error", (err) => console.error("SocketEvent: Afreehp connect_error: " + err))
    socketAfreehp.on("close", () => console.log("SocketEvent: Afreehp close"))
    socketAfreehp.on("error", () => console.error("SocketEvent: Afreehp error"))
    
    socketAfreehp.on("cmd", (data) => {
        try {
            // alertlist check
            if (data.type === "alertload" && data.sub === "load" && data.data !== undefined && data.data.length > 0) {
                // retrieve all donation history
                postData(data.data)
            }
        } catch(err) {
            console.error("Failed to parse a message from Afreehp page", err.toString())
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

    setInterval(() => {
        if (!isPosting) {
            socketAfreehp.emit("setupcmd", { type:"alertlist", sub:"load", idx:userConfig.idx, pageid:"0", subpage:"0" })
        }
    }, 10000)
}


async function main() {
    console.log("Initializing afreehp donation page socket")
    try {
        let response = await requestPromise(userConfig.alertbox_url)
        if (response.statusCode == 200) {
            let idxMatch = response.body.match(/idx:\s*"([a-zA-Z0-9]+)",/)
            if (idxMatch !== null && idxMatch.length > 1) {
                userConfig.idx = idxMatch[1]
                console.log(`Successfully acquired afreehp.idx : ${userConfig.idx}\n`)
            } else {
                console.error("Get afreehp.idx parse failed.\n")
            }
        } else {
            console.error("non-200 status code retrieved from alertbox_url. statusCode=" + response.statusCode)
        }
    } catch (err) {
        console.error("Error occured during afreehp.idx parsing. error=" + err.toString())
    }

    connectAfreehp()
}

try {
    userConfig = require('./config.json')
    if (userConfig.alertbox_url !== undefined || userConfig.webapp_url !== undefiend) {
        main()
    } else {
        console.error("invalid user configuration. Make sure to populate all fields")
    }
} catch (err) {
    console.error("failed during main process. error=" + err)
}

