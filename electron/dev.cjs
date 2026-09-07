const { app, BrowserWindow } = require('electron')
app.whenReady().then(async()=>{
  const win=new BrowserWindow({width:1440,height:920,minWidth:1000,minHeight:700,backgroundColor:'#f6f8fc',autoHideMenuBar:true,webPreferences:{contextIsolation:true,sandbox:true}})
  await win.loadURL('http://127.0.0.1:3090')
})
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit()})
