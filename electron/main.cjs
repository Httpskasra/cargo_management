const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');

let server;

async function listenWithFallback(handler, startPort = 3090) {
  for (let port = startPort; port < startPort + 20; port++) {
    try {
      const s = http.createServer((req, res) => handler(req, res));
      await new Promise((resolve, reject) => {
        s.once('error', reject);
        s.listen(port, '0.0.0.0', () => { s.removeListener('error', reject); resolve(); });
      });
      return { server: s, port };
    } catch (error) {
      if (error && error.code === 'EADDRINUSE') continue;
      throw error;
    }
  }
  throw new Error('No free Cargo Manager port was found.');
}

async function bootServer(){
  const dataDir=app.getPath('userData');
  const db=path.join(dataDir,'cargo.db');
  const schemaDb=path.join(__dirname,'..','prisma','cargo.db');
  if(!fs.existsSync(db) && fs.existsSync(schemaDb)) fs.copyFileSync(schemaDb,db);
  process.env.DATABASE_URL=`file:${db.replace(/\\/g,'/')}`;
  process.env.CARGO_DATA_DIR=dataDir;
  process.env.NODE_ENV='production';

  const next=require('next');
  const nextApp=next({dev:false,dir:path.join(__dirname,'..')});
  await nextApp.prepare();
  const handler=nextApp.getRequestHandler();
  const result=await listenWithFallback(handler, Number(process.env.CARGO_PORT || 3090));
  server=result.server;
  process.env.CARGO_PORT=String(result.port);
  process.env.PORT=String(result.port);
  console.log(`Cargo Manager LAN server: http://0.0.0.0:${result.port}`);
  return result.port;
}

async function createWindow(){
  const port=await bootServer();
  const win=new BrowserWindow({
    width:1440,height:920,minWidth:1000,minHeight:700,
    backgroundColor:'#f6f8fc',autoHideMenuBar:true,
    title:'Cargo Manager',
    webPreferences:{contextIsolation:true,sandbox:true}
  });
  await win.loadURL(`http://127.0.0.1:${port}`);
}

app.whenReady().then(createWindow);
app.on('window-all-closed',()=>{if(server)server.close(); if(process.platform!=='darwin')app.quit()});
