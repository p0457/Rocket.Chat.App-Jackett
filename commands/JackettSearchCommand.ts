import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { JackettApp } from '../JackettApp';
import * as msgHelper from '../lib/helpers/messageHelper';
import * as request from '../lib/helpers/request';
import { AppPersistence } from '../lib/persistence';

export class JackettSearchCommand implements ISlashCommand {
  public command = 'jackett-search';
  public i18nParamsExample = 'slashcommand_search_params';
  public i18nDescription = 'slashcommand_search_description';
  public providesPreview = false;

  public constructor(private readonly app: JackettApp) {}

  public async executor(context: SlashCommandContext, read: IRead, modify: IModify, http: IHttp, persis: IPersistence): Promise<void> {
    const trackersOrQuery = context.getArguments().join(' ');

    if (!trackersOrQuery) {
      await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Query not provided!');
      return;
    }

    let query = trackersOrQuery;
    let commandUsed = query;

    const persistence = new AppPersistence(persis, read.getPersistenceReader());

    const serverAddress = await persistence.getUserServer(context.getSender());

    let url = `${serverAddress}/api/v2.0/indexers/all/results`;

    if (!serverAddress) {
      await msgHelper.sendNotification('No server found! Use `/jacket-set-server` to set the server.', read, modify, context.getSender(), context.getRoom());
      return;
    }

    const apikey = await persistence.getUserApiKey(context.getSender());

    if (!apikey) {
      await msgHelper.sendNotification('No API Key found! Use `/jacket-set-apikey` to set the API Key.', read, modify, context.getSender(), context.getRoom());
      return;
    }

    let m;

    // PAGE
    const pageRegex = /p=([0-9][0-9]?)/gm; // Shouldn't be more than 99 pages...
    let pageText = '';
    let pageTextToRemove = '';
    let page = 1;

    // tslint:disable-next-line:no-conditional-assignment
    while ((m = pageRegex.exec(trackersOrQuery)) !== null) {
        // This is necessary to avoid infinite loops with zero-width matches
        if (m.index === pageRegex.lastIndex) {
          pageRegex.lastIndex++;
        }
        m.forEach((match, groupIndex) => {
          if (groupIndex === 0) {
            pageTextToRemove = match;
          } else if (groupIndex === 1) {
            pageText = match;
          }
        });
    }

    if (pageText && pageText !== '' && pageTextToRemove && pageTextToRemove !== '') {
      // Attempt to parse
      page = Math.round(parseFloat(pageText));
      if (isNaN(page) || page <= 0) {
        page = 1;
      }
      // Update query
      query = query.replace(pageTextToRemove, '');
      // Update command used (which can trigger page changes)
      commandUsed = commandUsed.replace(pageTextToRemove, '');
      if (!query) {
        await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Query was invalid!');
        return;
      }
    }

    // FILTERS
    const filtersRegex = /filters=\((.*?)\) /gm;
    let filtersText = '';
    let filtersTextToRemove = '';
    const filters = new Array();

    // tslint:disable-next-line:no-conditional-assignment
    while ((m = filtersRegex.exec(trackersOrQuery)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === filtersRegex.lastIndex) {
        filtersRegex.lastIndex++;
      }
      m.forEach((match, groupIndex) => {
        if (groupIndex === 0) {
          filtersTextToRemove = match;
        } else if (groupIndex === 1) {
          filtersText = match;
        }
      });
    }

    if (filtersText && filtersText !== '' && filtersTextToRemove && filtersTextToRemove !== '') {
      // Set filters array
      const tempFilters = filtersText.split(',');
      tempFilters.forEach((filter) => {
        if (filter.indexOf('>') !== -1) {
          const tempRelationFilter = filter.split('>');
          if (tempRelationFilter.length === 2) {
            filters.push({
              name: tempRelationFilter[0],
              greaterThan: tempRelationFilter[1],
            });
          }
        } else if (filter.indexOf('<') !== -1) {
          const tempRelationFilter = filter.split('>');
          if (tempRelationFilter.length === 2) {
            filters.push({
              name: tempRelationFilter[0],
              lessThan: tempRelationFilter[1],
            });
          }
        } else { // Just word filter
          filters.push({
            name: filter,
          });
        }
      });
      // Update query
      query = query.replace(filtersTextToRemove, '');
      if (!query) {
        await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Query was invalid!');
        return;
      }
    }

    // TRACKERS
    const trackersRegex = /trackers=\((.*?)\) /gm;
    let trackersText = '';
    let trackersTextToRemove = '';

    // tslint:disable-next-line:no-conditional-assignment
    while ((m = trackersRegex.exec(trackersOrQuery)) !== null) {
      // This is necessary to avoid infinite loops with zero-width matches
      if (m.index === trackersRegex.lastIndex) {
        trackersRegex.lastIndex++;
      }
      m.forEach((match, groupIndex) => {
        if (groupIndex === 0) {
          trackersTextToRemove = match;
        } else if (groupIndex === 1) {
          trackersText = match;
        }
      });
    }

    if (trackersText && trackersText !== '' && trackersTextToRemove && trackersTextToRemove !== '') {
      // Set special url
      let trackerTextForUrl = '';
      const trackers = trackersText.split(',');
      trackers.forEach((tracker) => {
        trackerTextForUrl += '&Tracker[]=' + tracker.toLowerCase().trim();
      });
      trackerTextForUrl = '?' + trackerTextForUrl.substring(1, trackerTextForUrl.length); // Replace first '&' with '?'
      url += trackerTextForUrl;
      // Update query
      query = query.replace(trackersTextToRemove, '');
      if (!query) {
        await msgHelper.sendUsage(read, modify, context.getSender(), context.getRoom(), this.command, 'Query was invalid!');
        return;
      }
    }

    const params = {
      apikey,
      Query: query,
    };

    const searchResponse = await http.get(url, {
      params,
    });

    try {
      const searchResults = JSON.parse(searchResponse.content || '');
      // Format URL to pull up query in browser
      // TODO: Test
      searchResults._JackettURLDisplay = `${serverAddress}/api/v2.0/indexers/all/results?apikey=${apikey}&Query=${query}`;
      const trackers = trackersText.split(',');
      trackers.forEach((tracker) => {
        searchResults._JackettURLDisplay += '&Tracker[]=' + tracker.toLowerCase().trim();
      });
      // Set search strings if needed
      searchResults.Results.forEach((result) => {
        let searchString = '';
        if (result.Title) {
          searchString += ` ${result.Title} `;
        }
        if (result.CategoryDesc) {
          searchString += ` ${result.CategoryDesc} `;
        }
        result._SearchString = searchString.toLowerCase();
      });
      // Filter out if necessary
      let actualResults = searchResults.Results;
      if (filters && filters.length > 0) {
        filters.forEach((filter) => {
          // Do greater/less filters first
          if (filter.greaterThan && !isNaN(filter.greaterThan)) {
            if (filter.name === 'seeders') {
              actualResults = actualResults.filter((result) => {
                return result.Seeders ? result.Seeders > filter.greaterThan : true;
              });
            } else if (filter.name === 'size') {
              actualResults = actualResults.filter((result) => {
                return result.Size ? result.Size > filter.greaterThan : true;
              });
            }
          } else if (filter.lessThan && !isNaN(filter.lessThan)) {
            if (filter.name === 'seeders') {
              actualResults = actualResults.filter((result) => {
                return result.Seeders ? result.Seeders < filter.lessThan : true;
              });
            } else if (filter.name === 'size') {
              actualResults = actualResults.filter((result) => {
                return result.Size ? result.Size < filter.lessThan : true;
              });
            }
          } else { // Word filter
            actualResults = actualResults.filter((result) => {
              return result._SearchString.toLowerCase().trim().indexOf(filter.name.toLowerCase().trim()) !== -1;
            });
          }
        });
      }
      searchResults.Results = actualResults;
      let queryDisplay = '';
      if (trackersText) {
        queryDisplay += `trackers=(${trackersText}) `;
      }
      if (filtersText) {
        queryDisplay += `filters=(${filtersText}) `;
      }
      queryDisplay += query;
      // Artificially limit for now
      let pages = Math.round(searchResults.Results.length / 20);
      if (pages === 0) {
        pages = 1;
      }
      if (page > pages) {
        page = 1;
        // TODO: Notify user that the page did not exist
      }
      searchResults._FullCount = searchResults.Results.length;
      searchResults._Pages = pages;
      searchResults._CurrentPage = page;
      const startIdx = (20 * (page - 1));
      let endIdx = 20 * page;
      if (endIdx > searchResults.Results.length) {
        endIdx = searchResults.Results.length;
      }
      // tslint:disable-next-line:prefer-for-of
      for (let x = 0; x < searchResults.Results.length; x++) {
        searchResults.Results[x]._IndexDisplay = x + 1;
      }
      searchResults.Results = searchResults.Results.slice(startIdx, endIdx); // {(0, 20, 40), (20, 40, 60)}
      const command = '/jackett-search ' + commandUsed;
      await msgHelper.sendSearchResults(searchResults, queryDisplay, command, read, modify, context.getSender(), context.getRoom());
      return;
    } catch (e) {
      console.log('Failed to parse or send response!', e);
      await msgHelper.sendNotification('Failed to parse or send response!', read, modify, context.getSender(), context.getRoom());
      return;
    }
  }
}
