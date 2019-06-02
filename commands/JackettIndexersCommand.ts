import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { JackettApp } from '../JackettApp';
import * as msgHelper from '../lib/helpers/messageHelper';
import { setToken } from '../lib/helpers/request';
import * as request from '../lib/helpers/request';
import { AppPersistence } from '../lib/persistence';

export class JackettIndexersCommand implements ISlashCommand {
  public command = 'jackett-indexers';
  public i18nParamsExample = 'slashcommand_indexers_params';
  public i18nDescription = 'slashcommand_indexers_description';
  public providesPreview = false;

  public constructor(private readonly app: JackettApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const [filterArg] = context.getArguments();

    let filter;
    if (filterArg) {
      filter = filterArg.toLowerCase().trim();
      const validFilters = ['configured', 'unconfigured', 'public', 'private'];
      if (!validFilters.includes(filter)) {
        await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Didn\'t understand your filter!');
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

  private async getIndexers(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persistence: AppPersistence) {
    const serverAddress = await request.getServer(context, read, modify, persistence);

    if (!serverAddress) {
      return;
    }

    const token = await request.getToken(context, read, modify, persistence);

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
}
