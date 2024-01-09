const util = require("util");
const io = require("socket.io-client");
const request = require('request');
const requestPromise = util.promisify(request);
const XMLHttpRequest = require('xhr2');
const { Builder, By, Key, until } = require('selenium-webdriver');
const { Browser } = require('selenium-webdriver/lib/capabilities')
const { Chrome, Options } = require('selenium-webdriver/chrome')
require('console-stamp')(console, { 
    format: ':date(yyyy/mm/dd HH:MM:ss.l)'
});

// !!!!! please update this configs before use
var userConfig = {
    // afreehp's donation page URL
    "alertbox_url": "[URL]",
    // google sheet's webapp endpoint URL
    "webapp_url": "[URL]"
}

// runtime variables
const portNumber = "13536"
const afreehpDomain = "http://afreehp.kr"
var xhr = new XMLHttpRequest()

// async function extractRouletteResult() {
//     try {
//         let response = await requestPromise("http://afreehp.kr/setup/alertlist")
//         if (response.statusCode == 200) {
//             let idxMatch = response.body.match(/idx:\s*"([a-zA-Z0-9]+)",/)
//             if (idxMatch !== null && idxMatch.length > 1) {
//                 userConfig.idx = idxMatch[1]
//                 console.log(`Successfully acquired afreehp.idx : ${userConfig.idx}\n`)
//             } else {
//                 console.error("Get afreehp.idx parse failed.\n")
//             }
//         } else {
//             console.error("non-200 status code retrieved from alertbox_utl. statusCode=" + response.statusCode)
//         } 
//     } catch(err) {
//         console.error("Error occured during afreehp.idx parsing. error=" + err.toString())
//     }
    
//     return "UNKNOWN"
// }

// postData sends a request to the Google sheet webapp's post endpoint
// param examples: [URL]?id=afreehp&result=test
// this helper assumes that the data is always valid -- validation must be done by the caller
async function postData(data) {
    const uid = data.data.id
    const result = "공포게임" // !!! plceholder
    // const result = await extractRouletteResult()

    console.log(`${userConfig.webapp_url}?id=${uid}&result=${result}`)

    // ===== send player uid and roulette result to Google sheet webapp's post API
    xhr.open('POST', userConfig.webapp_url)
    xhr.setRequestHeader("Accept", "application/json")
    xhr.setRequestHeader("Content-Type", "application/json")
    let body =
    `{
        "id": "${uid}",
        "result": "${result}"
    }`
    xhr.send(body)
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

    // // to get all packet for debugging
    // let onEvent = socketAfreehp.onevent
    // socketAfreehp.onevent = (packet) => {
    //     onEvent.call(socketAfreehp, packet)
    //     packet.data = ["*"].concat(packet.data || [])
    //     onEvent.call(socketAfreehp, packet)
    // }
    
    // // all events
    // socketAfreehp.on("*", (event, data) => {
    //     console.log("reacting to wildcard event: " + event)
    //     console.log(data)
    //     handleData(data)
    // })

    
    socketAfreehp.on("connect", () => {
        console.log("Afreehp Connected")
        // emit idx to fetch the alarms
        socketAfreehp.emit("page", {
            idx: userConfig.idx
        })
    })
    
    socketAfreehp.on("error", () => {
        console.error("SocketEvent: Afreehp error")
    })
    
    socketAfreehp.on("close", () => {
        console.log("SocketEvent: Afreehp close")
    })

    socketAfreehp.on("connect_error", (err) => {
        console.error("SocketEvent: Afreehp connect_error")
        console.error(err)
    })

    // cmd and donation test
    socketAfreehp.on("cmd", (data) => {
        // socketAfreehp.send("pagecmd", { type:"alertload", sub:"load", idx:userConfig.idx, pageid:"E9WvDzplmI0Ge16ouRVv" })
        try {
            // donation data check
            if (data.data !== undefined && data.data.value !== undefined && data.data.type !== undefined) {
                if (data.data.broad === "afreeca") {
                    // donation handling
                    if (data.data.type == "star" && data.data.value == 33) {
                        postData(data)
                    }
                } else {
                    console.log("non-afreeca platform message was retrieved")
                }
            }
            // alertlist check
            else if (data.type == "alertlist") {
                console.log("this is alertlist")                
            }
        } catch(err) {
            console.error("Failed to parse a message from Afreehp page", err.toString())
        }
    })

    setTimeout(() => {
        socketAfreehp.connect()
    }, 1000)
}

async function initRecorder() {
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
            console.error("non-200 status code retrieved from alertbox_utl. statusCode=" + response.statusCode)
        }
    } catch (err) {
        console.error("Error occured during afreehp.idx parsing. error=" + err.toString())
    }

    connectAfreehp()
}
