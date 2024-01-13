const { app, BrowserWindow } = require('electron')


let mainWindow = null
const singleInstanceLock = app.requestSingleInstanceLock()

const userData = JSON.stringify()
function createWindow () {
    mainWindow = new BrowserWindow({
        width: 400,
        minWidth: 400,
        maxWidth: 400,
        height: 500,
        minHeight: 500,
        maxHeight: 500,
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