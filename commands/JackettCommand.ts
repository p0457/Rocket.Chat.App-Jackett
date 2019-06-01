import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { JackettApp } from '../JackettApp';
import * as msgHelper from '../lib/helpers/messageHelper';
import { AppPersistence } from '../lib/persistence';
import { setToken } from '../lib/helpers/request';

enum Command {
  Help = 'help',
  SetServer = 'set-server',
  Login = 'login',
  Indexers = 'indexers',
}

export class JackettCommand implements ISlashCommand {
  public command = 'jackett';
  public i18nParamsExample = 'slashcommand_params';
  public i18nDescription = 'slashcommand_description';
  public providesPreview = false;

  public constructor(private readonly app: JackettApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [command] = context.getArguments();

    switch (command) {
      case Command.Help:
        await this.processHelpCommand(context, read, modify, http, persis);
        break;
      case Command.SetServer:
        await this.processSetServerCommand(context, read, modify, http, persis);
        break;
      case Command.Login:
        await this.processLoginCommand(context, read, modify, http, persis);
        break;
      case Command.Indexers:
        await this.processIndexersCommand(context, read, modify, http, persis);
        break;
      default:
        await this.processHelpCommand(context, read, modify, http, persis);
        break;
    }
  }

  private async processHelpCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    await msgHelper.sendNotificationSingleAttachment({
      collapsed: false,
      color: '#e4a00e',
      title: {
        value: 'Jackett App Help Commands',
      },
      text: '`/jackett help`\n>Show this help menu\n'
        + '`/jackett set-server [SERVER ADDRESS]`\n>Set the Jackett Server Address\n'
        + '`/jackett login [PASSWORD]`\n>Login to you Jackett Server\n'
        + '`/jackett indexers (configured|unconfigured|public|private)`\n>Show all indexers, optionally filter by configured/public',
    }, read, modify, context.getSender(), context.getRoom());
    return;
  }

  private async processSetServerCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [, serverAddress] = context.getArguments();

    if (!serverAddress) {
      await msgHelper.sendNotification('Usage: `/jackett set-server [SERVER ADDRESS]`', read, modify, context.getSender(), context.getRoom());
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
      await msgHelper.sendNotification('Usage: `/jackett set-server [SERVER ADDRESS]`', read, modify, context.getSender(), context.getRoom());
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

  private async getServer(context: SlashCommandContext, read: IRead, modify: IModify, persistence: AppPersistence) {
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

  private async getToken(context: SlashCommandContext, read: IRead, modify: IModify, persistence: AppPersistence) {
    const token = await persistence.getUserToken(context.getSender());

    if (!token) {
      await msgHelper.sendNotificationSingleAttachment({
        collapsed: false,
        color: '#e10000',
        title: {
          value: 'No token set!',
        },
        text: 'Please set a token using the command `/jackett login [PASSWORD]`',
      }, read, modify, context.getSender(), context.getRoom());
    }

    return token;
  }

  private async getIndexers(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persistence: AppPersistence) {
    const serverAddress = await this.getServer(context, read, modify, persistence);

    if (!serverAddress) {
      return;
    }

    const token = await this.getToken(context, read, modify, persistence);

    if (!token) {
      return;
    }

    const headers = {};
    setToken(headers, token);

    const url = serverAddress + '/api/v2.0/indexers';

    const indexersResult = await http.get(url, {headers});

    if (indexersResult && indexersResult.statusCode === 200 && indexersResult.content) {
      return JSON.parse(indexersResult.content);
    }
  }

  private async processLoginCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [, password] = context.getArguments();

    if (!password) {
      await msgHelper.sendNotification('Usage: `/jackett login [PASSWORD]`', read, modify, context.getSender(), context.getRoom());
      return;
    }

    const persistence = new AppPersistence(persis, read.getPersistenceReader());

    const serverAddress = await this.getServer(context, read, modify, persistence);

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

  private async processIndexersCommand(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [, filterArg] = context.getArguments();

    let filter;
    if (filterArg) {
      filter = filterArg.toLowerCase().trim();
      const validFilters = ['configured', 'unconfigured', 'public', 'private'];
      if (!validFilters.includes(filter)) {
        await msgHelper.sendNotification('Didn\'t understand your filter!\nUsage: `/jackett indexers (configured|unconfigured|public|private)`', read, modify, context.getSender(), context.getRoom());
        return;
      }
    }
    
    const persistence = new AppPersistence(persis, read.getPersistenceReader());

    const indexers = await this.getIndexers(context, read, modify, http, persistence);

    if (!indexers || !Array.isArray(indexers)) {
      return;
    }

    let filteredIndexers = indexers;
    if (filter) {
      if (filter === 'configured') {
        filteredIndexers = indexers.filter((indexer) => {
          return indexer.configured === true;
        });
      } else if (filter === 'unconfigured') {
        filteredIndexers = indexers.filter((indexer) => {
          return indexer.configured === false;
        });
      } else if (filter === 'public') {
        filteredIndexers = indexers.filter((indexer) => {
          return indexer.type === 'public';
        });
      } else if (filter === 'private') {
        filteredIndexers = indexers.filter((indexer) => {
          return indexer.type === 'private';
        });
      }
    }

    await msgHelper.sendIndexers(filteredIndexers, read, modify, context.getSender(), context.getRoom());
  }
}
