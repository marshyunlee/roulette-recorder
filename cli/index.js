const util = require("util");
const io = require("socket.io-client");
const request = require('request');
const requestPromise = util.promisify(request);
const XMLHttpRequest = require('xhr2');
require('console-stamp')(console, { 
    format: ':date(yyyy/mm/dd HH:MM:ss.l)' 
});

const portNumber = "13536"
const afreehpDomain = "http://afreehp.kr"
var xhr = new XMLHttpRequest()

// !!!!! please update this configs before use
var userConfig = {
    // afreehp's donation page URL
    "alertbox_url": "http://afreehp.kr/page/VZiXlq2ax8bYmqSVwJY",
    // google sheet's webapp endpoint URL
    "webapp_url": "https://script.google.com/macros/s/AKfycbzQtltuWMADmVGLFKlPayZSn298pfraoFNAXAfIz1rmlgIQDYaIp0bJ4vBd1obETnIx/exec"
}

// postData sends a request to the Google sheet webapp's post endpoint
// param examples: [URL]?id=gkslql456&result=손편지
// this helper assumes that the data is always valid -- validation must be done by the caller
async function postData(data) {
    const uid = data.data.id
    // TODO dynamically fetch roulette result from afreehp alartlist
    const result = "공포게임" // !!! plceholder

    console.log(data)
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

function handleData(data) {
    try {
        if (data.data !== undefined && data.data.value !== undefined && data.data.type !== undefined) {
            if (data.data.broad === "afreeca") {
                if (data.data.type == "star" && data.data.value == 33) {
                    postData(data)
                }
            } else {
                console.log("non-afreeca platform message was retrieved")
            }
        }
    } catch(err) {
        console.error("Failed to parse a message from Afreehp page", err.toString())
    }
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
    //     console.log("reacting to event: " + event)
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
        handleData(data)
    })

    setTimeout(() => {
        socketAfreehp.connect()
    }, 1000)
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
            console.error("non-200 status code retrieved from alertbox_utl. statusCode=" + response.statusCode)
        } 
    } catch(err) {
        console.error("Error occured during afreehp.idx parsing. error=" + err.toString())
    }

    connectAfreehp()
}

// runtime
try {
    main()
} catch(err) {
    console.error("Error from main function: " + err.toString())
}