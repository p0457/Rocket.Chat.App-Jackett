import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { JackettApp } from '../JackettApp';
import * as msgHelper from '../lib/helpers/messageHelper';
import { AppPersistence } from '../lib/persistence';

export class JackettSetApiKeyCommand implements ISlashCommand {
  public command = 'jackett-set-apikey';
  public i18nParamsExample = 'slashcommand_setapikey_params';
  public i18nDescription = 'slashcommand_setapikey_description';
  public providesPreview = false;

  public constructor(private readonly app: JackettApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [apiKey] = context.getArguments();

    if (!apiKey) {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'API Key not provided!');
      return;
    }

    const apiKeyActual = apiKey.trim();

    const persistence = new AppPersistence(persis, read.getPersistenceReader());

    await persistence.setUserApiKey(apiKeyActual, context.getSender());

    await msgHelper.sendNotificationSingleAttachment({
      collapsed: false,
      color: '#00CE00',
      title: {
        value: 'Successfully set API Key!',
      },
    }, read, modify, context.getSender(), context.getRoom());
  }
}
