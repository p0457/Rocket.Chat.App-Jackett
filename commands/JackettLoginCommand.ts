import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { JackettApp } from '../JackettApp';
import * as msgHelper from '../lib/helpers/messageHelper';
import * as request from '../lib/helpers/request';
import { AppPersistence } from '../lib/persistence';

export class JackettLoginCommand implements ISlashCommand {
  public command = 'jackett-login';
  public i18nParamsExample = 'slashcommand_login_params';
  public i18nDescription = 'slashcommand_login_description';
  public providesPreview = false;

  public constructor(private readonly app: JackettApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [password] = context.getArguments();

    if (!password) {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Password not provided!');
      return;
    }

    const persistence = new AppPersistence(persis, read.getPersistenceReader());

    const serverAddress = await request.getServer(context, read, modify, persistence);

    if (!serverAddress) {
      return;
    }

    const url = serverAddress + '/UI/Dashboard';

    const loginResult = await http.post(url, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Connection': 'keep-alive',
      },
      data: {
        password,
      },
    });

    console.log('****1', loginResult);

    if (loginResult && loginResult.headers && loginResult.headers['Set-Cookie']) {
      const cookie = loginResult.headers['Set-Cookie'];

      if (!cookie) {
        await msgHelper.sendNotificationSingleAttachment({
          collapsed: false,
          color: '#e10000',
          title: {
            value: 'Failed to set token!',
          },
          text: 'Please try again.',
        }, read, modify, context.getSender(), context.getRoom());
        return;
      }

      await persistence.setUserToken(cookie, context.getSender());

      await msgHelper.sendNotificationSingleAttachment({
        collapsed: false,
        color: '#00CE00',
        title: {
          value: 'Logged in!',
          link: serverAddress,
        },
        text: '*Token: *' + cookie,
      }, read, modify, context.getSender(), context.getRoom());

    } else {
      await msgHelper.sendNotificationSingleAttachment({
        collapsed: false,
        color: '#e10000',
        title: {
          value: 'Failed to login!',
        },
        text: 'Please try again.',
      }, read, modify, context.getSender(), context.getRoom());
    }
  }
}
