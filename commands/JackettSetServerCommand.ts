import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { JackettApp } from '../JackettApp';
import * as msgHelper from '../lib/helpers/messageHelper';
import * as request from '../lib/helpers/request';
import { AppPersistence } from '../lib/persistence';

export class JackettSetServerCommand implements ISlashCommand {
  public command = 'jackett-set-server';
  public i18nParamsExample = 'slashcommand_setserver_params';
  public i18nDescription = 'slashcommand_setserver_description';
  public providesPreview = false;

  public constructor(private readonly app: JackettApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [serverAddress] = context.getArguments();

    if (!serverAddress) {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Server address not provided!');
      return;
    }

    const urlRegex = new RegExp('^(https?:\\/\\/)?' + // protocol
    '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.)+[a-z]{2,}|' + // domain name
    '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
    '(\\:\\d+)?(\\/[-a-z\\d%_.~+]*)*' + // port and path
    '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
    '(\\#[-a-z\\d_]*)?$', 'i'); // fragment locator
    const isValidUrl = !!urlRegex.test(serverAddress);

    if (!isValidUrl) {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Server address was not valid!');
      return;
    }

    let server = serverAddress.trim();

    if (server.substring(server.length - 1) === '/') {
      server = server.substring(0, server.length - 1);
    }

    const persistence = new AppPersistence(persis, read.getPersistenceReader());

    await persistence.setUserServer(server, context.getSender());

    await msgHelper.sendNotificationSingleAttachment({
      collapsed: false,
      color: '#00CE00',
      title: {
        value: 'Successfully set server!',
        link: server,
      },
    }, read, modify, context.getSender(), context.getRoom());
  }
}
