const { app, BrowserWindow } = require('electron')


let mainWindow = null
const singleInstanceLock = app.requestSingleInstanceLock()

const userData = JSON.stringify()
function createWindow () {
    mainWindow = new BrowserWindow({
        width: 480,
        minWidth: 480,
        maxWidth: 480,
        height: 550,
        minHeight: 550,
        maxHeight: 550,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    })
    mainWindow.loadFile('index.html')
}

app.whenReady().then(() => {
    if (!singleInstanceLock) {
        app.quit()
    } else {
        createWindow()
        app.on('activate', function () {
            if (BrowserWindow.getAllWindows().length === 0) createWindow()
        })
        app.on('second-instance', (event, commandLine, workingDirectory) => {
            if (mainWindow.isMinimized()) {
                mainWindow.restore()
            }
            mainWindow.focus()
        }) 
    }
})

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit()
})