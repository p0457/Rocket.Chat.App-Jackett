import { IModify, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { AppPersistence } from '../persistence';
import * as msgHelper from './messageHelper';

export function setToken(headers, token: string) {
  headers.Cookie = token;
}

export async function getToken(context: SlashCommandContext, read: IRead, modify: IModify, persistence: AppPersistence) {
  const token = await persistence.getUserToken(context.getSender());

  if (!token) {
    await msgHelper.sendNotificationSingleAttachment({
      collapsed: false,
      color: '#e10000',
      title: {
        value: 'No token set!',
      },
      text: 'Please set a token using the command `/jackett-login [PASSWORD]`',
    }, read, modify, context.getSender(), context.getRoom());
  }

  return token;
}

export async function getServer(context: SlashCommandContext, read: IRead, modify: IModify, persistence: AppPersistence) {
  const serverAddress = await persistence.getUserServer(context.getSender());

  if (!serverAddress) {
    await msgHelper.sendNotificationSingleAttachment({
      collapsed: false,
      color: '#e10000',
      title: {
        value: 'No server set!',
      },
      text: 'Please set a server address using the command `/jackett set-server [SERVER ADDRESS]`',
    }, read, modify, context.getSender(), context.getRoom());
  }

  return serverAddress;
}
