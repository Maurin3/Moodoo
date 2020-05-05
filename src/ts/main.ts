import { BrowserWindow, Menu, Tray, MenuItemConstructorOptions, shell } from 'electron';

import * as path from 'path';
import * as url from 'url';

import Store from './store';
import Connection from './connection';
import * as jayson from 'jayson';

const loginPage: string = '/src/html/login.html';
const messagePage: string = '/src/html/messages.html';

const fileProtocol: string = 'file:'

const windowSize: Store = new Store({
    configName: 'user-preferences',
    defaults: {
        windowBounds: { width: 800, height: 700 }
    }
});

const userInfos: Store = new Store({
    configName: 'user-login',
    defaults: {
        login: false,
        username: false,
        uid: false,
        db : false,
        url : false,
        password: false,
        profilePic: false
    }
});

export default class Main {
    static mainWindow : Electron.BrowserWindow;
    static application : Electron.App;
    static tray: Electron.Tray;
    static ipcMain: Electron.IpcMain;
    static BrowserWindow;

    private static onReady() {
        let { width, height } = windowSize.get('windowBounds');
        Main.mainWindow = new Main.BrowserWindow({ 
            width: width,
            height: height,
            backgroundColor: "#875A7B",
            title: 'Moodoo',
            icon: path.join(__dirname, '..', `/icons/png/48x48.png`),
            webPreferences: {
                nodeIntegration: true
            }
        });
        
        Main.createTray();
        Main.createMenu();
        if (userInfos.get('login')){
            Main.loadPages(messagePage, fileProtocol);
        }
        else{
            Main.loadPages(loginPage, fileProtocol);
        }
        Main.mainWindow.on('resize', Main.onResize);
        Main.mainWindow.on('close', Main.onClose);
        Main.mainWindow.webContents.on('new-window', Main.openExternalLinks);
    }

    private static onResize(){
        let { width, height } = Main.mainWindow.getBounds();
        windowSize.set('windowBounds', { width, height });
    }

    private static onClose (ev){
        ev.sender.hide();
        ev.preventDefault(); // prevent quit process
    }

    private static onAllCloseWindow (){
        Main.mainWindow.removeAllListeners("close");
        Main.mainWindow = null;
        if (! Main.tray.isDestroyed()) Main.tray.destroy();
        Main.application.quit();
    }

    private static logout(){
        userInfos.sets(
            ['login', 'username', 'uid', 'db', 'url', 'password', 'profilePic'], 
            [false, false, false, false, false, false, false]
        );
        Main.loadPages(loginPage, fileProtocol);
    }

    private static createTray(){
        Main.tray = new Tray(path.join(__dirname, '..', `/icons/png/48x48.png`));
        const contextMenu = Menu.buildFromTemplate([
            {
                label: 'Logout', click: (item, window, event) => {
                    Main.logout()
                }
            },
            {
                type: 'separator'
            },
            {
                label: 'Toggle', click: (item, window, event) => {
                    Main.mainWindow.show();
                }
            },
            {
                label: 'Quit', click: (item, window, event) => {
                    Main.onAllCloseWindow();
                }
            }
          ]);
        Main.tray.setToolTip('Moodoo');
        Main.tray.setContextMenu(contextMenu);
    }

    private static createMenu(){
        let isMac = process.platform === 'darwin';
        let editSubmenu: MenuItemConstructorOptions[] = [
            { role: 'undo' },
            { role: 'redo' },
            { type: 'separator' },
            { role: 'cut' },
            { role: 'copy' },
            { role: 'paste' },
            { role: 'delete' },
            { type: 'separator' },
            { role: 'selectAll' }
        ];
        let viewSubmenu: MenuItemConstructorOptions[] = [
            { role: 'reload' },
            { role: 'forceReload' },
            { role: 'toggleDevTools' },
            { type: 'separator' },
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { type: 'separator' },
            { role: 'togglefullscreen' }
        ];
        let windowSubmenu: MenuItemConstructorOptions[] = [
            { role: 'minimize' },
            { role: 'zoom' },
            { role: 'close' }
        ];
        let accountSubmenu: MenuItemConstructorOptions[] = [
            {
                label: 'Logout',
                visible: Boolean(userInfos.get('uid')),
                click () {
                    Main.logout()
                }
            }
        ]
        let template : MenuItemConstructorOptions[] = [
            // { role: 'fileMenu' }
            {
              label: 'File',
              submenu: [
                isMac ? { role: 'close' } : { role: 'quit' }
              ]
            },
            // { role: 'editMenu' }
            {
              label: 'Edit',
              type: 'submenu',
              submenu : editSubmenu,
            },
            // { role: 'viewMenu' }
            {
              label: 'View',
              submenu: viewSubmenu,
            },
            // { role: 'windowMenu' }
            {
              label: 'Window',
              submenu: windowSubmenu,
            },
            {
              role: 'help',
              submenu: [
                {
                  label: 'Learn More',
                  click: async () => {
                    await shell.openExternal('https://electronjs.org')
                  }
                }
              ]
            },
            {
                label: 'Account',
                submenu: accountSubmenu,
            }
          ];
        const menus = Menu.buildFromTemplate(template);
        Menu.setApplicationMenu(menus);
    }

    private static loadPages(page: string, protocol: string) {
        Main.mainWindow.loadURL(url.format({
            pathname: path.join(__dirname,'..', page),
            protocol: protocol,
            slashes: true
        }))
    }

    private static openExternalLinks(event, url){
        var wc = Main.mainWindow.webContents;
        if (url != wc.getURL()) {
            event.preventDefault();
            shell.openExternal(url);
        }
    }

    static main(app: Electron.App, ipcMain: Electron.IpcMain, browserWindow: typeof BrowserWindow) {
        // we pass the Electron.App object and the  
        // Electron.BrowserWindow into this function 
        // so this class has no dependencies. This 
        // makes the code easier to write tests for 
        Main.ipcMain = ipcMain;
        Main.BrowserWindow = browserWindow;
        Main.application = app;
        Main.application.on('ready', Main.onReady);
        Main.application.on('window-all-closed', Main.onAllCloseWindow);
        Main.ipcMain.on('loadMessages', (event, arg) => {
            if (arg){
                event.reply('received', true);
                Main.loadPages(messagePage, fileProtocol);
            }
        });
    }
}