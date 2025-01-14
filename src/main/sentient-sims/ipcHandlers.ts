import { IpcMainEvent, dialog, ipcMain, BrowserWindow } from 'electron';
import log from 'electron-log';
import { SettingsEnum } from './models/SettingsEnum';
import { SettingsService } from './services/SettingsService';
import { resolveHtmlPath } from '../util';

const settingsService = new SettingsService();

async function handleSelectDirectory() {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (!canceled) {
    return filePaths[0];
  }

  return null;
}

export default function ipcHandlers(mainWindow: BrowserWindow) {
  ipcMain.handle('dialog:selectDirectory', handleSelectDirectory);
  ipcMain.on(
    'set-setting',
    (_event: IpcMainEvent, setting: SettingsEnum, value: any) => {
      log.debug(`set-setting: ${setting.toString()}, value: ${value}`);
      settingsService.set(setting, value);
      mainWindow.webContents.send('setting-changed', setting, value);
    }
  );
  ipcMain.on('reset-setting', (_event: IpcMainEvent, setting: SettingsEnum) => {
    const value = settingsService.resetSetting(setting.toString());
    mainWindow.webContents.send('setting-changed', setting, value);
  });
  ipcMain.on('on-successful-auth', () => {
    mainWindow.loadURL(resolveHtmlPath('index.html'));
  });
}
