import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { JackettApp } from '../JackettApp';
import * as msgHelper from '../lib/helpers/messageHelper';
import usage from '../lib/helpers/usage';
import { AppPersistence } from '../lib/persistence';

export class JackettCommand implements ISlashCommand {
  public command = 'jackett';
  public i18nParamsExample = 'slashcommand_params';
  public i18nDescription = 'slashcommand_description';
  public providesPreview = false;

  public constructor(private readonly app: JackettApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    let text = '';

    for (const p in usage) {
      if (usage.hasOwnProperty(p)) {
        if (usage[p].command && usage[p].usage && usage[p].description) {
          text += usage[p].usage + '\n>' + usage[p].description + '\n';
        }
      }
    }

    const persistence = new AppPersistence(persis, read.getPersistenceReader());

    const serverAddress = await persistence.getUserServer(context.getSender());
    if (serverAddress) {
      text += '\n*Server: *' + serverAddress;
    } else {
      text += '\nNo Server on file!';
    }

    const apiKey = await persistence.getUserApiKey(context.getSender());
    if (apiKey) {
      text += '\n*API Key on file!*';
    } else {
      text += '\n*API Key not on file.*';
    }

    await msgHelper.sendNotificationSingleAttachment({
      collapsed: false,
      color: '#e4a00e',
      title: {
        value: 'Commands',
      },
      text,
    }, read, modify, context.getSender(), context.getRoom());
    return;
  }
}
