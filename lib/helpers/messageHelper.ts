import { IModify, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IMessageAction, IMessageAttachment, MessageActionButtonsAlignment, MessageActionType, MessageProcessingType } from '@rocket.chat/apps-engine/definition/messages';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';
import { formatBytes } from './bytsConverter';
import { formatDate, timeSince } from './dates';
import usage from './usage';

export async function sendNotification(text: string, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  const icon = await read.getEnvironmentReader().getSettings().getValueById('jackett_icon');
  const username = await read.getEnvironmentReader().getSettings().getValueById('jackett_name');
  const sender = await read.getUserReader().getById('rocket.cat');

  modify.getNotifier().notifyUser(user, modify.getCreator().startMessage({
      sender,
      room,
      text,
      groupable: false,
      alias: username,
      avatarUrl: icon,
  }).getMessage());
}

export async function sendNotificationSingleAttachment(attachment: IMessageAttachment, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  const icon = await read.getEnvironmentReader().getSettings().getValueById('jackett_icon');
  const username = await read.getEnvironmentReader().getSettings().getValueById('jackett_name');
  const sender = await read.getUserReader().getById('rocket.cat');

  modify.getNotifier().notifyUser(user, modify.getCreator().startMessage({
      sender,
      room,
      groupable: false,
      alias: username,
      avatarUrl: icon,
      attachments: [attachment],
  }).getMessage());
}

export async function sendNotificationMultipleAttachments(attachments: Array<IMessageAttachment>, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  const icon = await read.getEnvironmentReader().getSettings().getValueById('jackett_icon');
  const username = await read.getEnvironmentReader().getSettings().getValueById('jackett_name');
  const sender = await read.getUserReader().getById('rocket.cat');

  modify.getNotifier().notifyUser(user, modify.getCreator().startMessage({
      sender,
      room,
      groupable: false,
      alias: username,
      avatarUrl: icon,
      attachments,
  }).getMessage());
}

export async function sendUsage(read: IRead, modify: IModify, user: IUser, room: IRoom, scope: string, additionalText?): Promise<void> {
  let text = '';

  let usageObj = usage[scope];
  if (!usageObj) {
    for (const p in usage) {
      if (usage.hasOwnProperty(p)) {
        if (usage[p].command === scope) {
          usageObj = usage[p];
        }
      }
    }
  }
  if (usageObj && usageObj.command && usageObj.usage && usageObj.description) {
    text = '*Usage: *' + usageObj.usage + '\n>' + usageObj.description;
  }

  if (additionalText) {
    text = additionalText + '\n' + text;
  }

  // tslint:disable-next-line:max-line-length
  await this.sendNotification(text, read, modify, user, room);
  return;
}

export async function sendIndexers(indexers, read: IRead, modify: IModify, user: IUser, room: IRoom, query?): Promise<void> {
  const attachments = new Array<IMessageAttachment>();
  // Initial attachment for results count
  attachments.push({
    collapsed: false,
    color: '#00CE00',
    title: {
      value: 'Results (' + indexers.length + ')',
    },
    text: query ? 'Query: `' + query + '`' : '',
  });

  // tslint:disable-next-line:prefer-for-of
  for (let x = 0; x < indexers.length; x++) {
    const indexer = indexers[x];

    let text = '';

    const fields = new Array();

    // Wanted to do actions for request, but can't pass tokens or headers, just urls...
    // TODO: Revisit when the API has matured and allows for complex HTTP requests with Bearer * headers.
    const actions = new Array<IMessageAction>();

    fields.push({
      short: true,
      title: 'Id',
      value: indexer.id,
    });
    fields.push({
      short: true,
      title: 'Type',
      value: indexer.type,
    });
    fields.push({
      short: true,
      title: 'Configured',
      value: indexer.configured,
    });
    fields.push({
      short: true,
      title: 'Language',
      value: indexer.language,
    });

    actions.push({
      type: MessageActionType.BUTTON,
      url: indexer.site_link,
      text: 'View Site',
      msg_in_chat_window: false,
      msg_processing_type: MessageProcessingType.SendMessage,
    });

    text += indexer.description;

    attachments.push({
      collapsed: indexers.length < 3 ? false : true,
      color: '#000000',
      title: {
        value: indexer.name,
        link: indexer.site_link,
      },
      fields,
      actions,
      actionButtonsAlignment: MessageActionButtonsAlignment.HORIZONTAL,
      text,
    });
  }

  await sendNotificationMultipleAttachments(attachments, read, modify, user, room);
}

export async function sendSearchResults(results, query: string, command: string, read: IRead, modify: IModify, user: IUser, room: IRoom): Promise<void> {
  const attachments = new Array<IMessageAttachment>();
  // Initial attachment for results count
  let resultsText = '*Query: *`' + query.trim() + '`';
  resultsText += '\n*Current Page* ' + results._CurrentPage;
  resultsText += '\n*Pages* ' + results._Pages;
  if (results.Indexers && Array.isArray(results.Indexers) && results.Indexers.length > 0) {
    resultsText += '\n*Results Breakdown:*\n';
    results.Indexers.forEach((indexer) => {
      if (indexer.Name && indexer.Results) {
        resultsText += '----*' + indexer.Name + ': *' + indexer.Results + '\n';
      }
    });
    if (resultsText.endsWith('\n')) {
      resultsText = resultsText.substring(0, resultsText.length - 1); // Remove last '\n'
    }
    resultsText += '\n\n_Results above do not reflect any filters, and are limited to 20 items per page_';
  }
  const resultsActions = new Array();
  if (results._CurrentPage > 1) {
    resultsActions.push({
      type: MessageActionType.BUTTON,
      text: 'Previous Page',
      msg: command.trim() + ' p=' + (results._CurrentPage - 1).toString(),
      msg_in_chat_window: true,
      msg_processing_type: MessageProcessingType.RespondWithMessage,
    });
  }
  if (results._Pages > results._CurrentPage) {
    resultsActions.push({
      type: MessageActionType.BUTTON,
      text: 'Next Page',
      msg: command.trim() + ' p=' + (results._CurrentPage + 1).toString(),
      msg_in_chat_window: true,
      msg_processing_type: MessageProcessingType.RespondWithMessage,
    });
  }
  resultsActions.push({
    type: MessageActionType.BUTTON,
    text: 'Search Again',
    msg: command.trim(),
    msg_in_chat_window: true,
    msg_processing_type: MessageProcessingType.RespondWithMessage,
  });
  attachments.push({
    collapsed: false,
    color: '#00CE00',
    title: {
      value: 'Results (' + results._FullCount + ')',
    },
    text: resultsText,
    actions: resultsActions,
    actionButtonsAlignment: MessageActionButtonsAlignment.HORIZONTAL,
  });

  if (results.Results && Array.isArray(results.Results)) {
    results.Results.forEach(async (searchResult) => {
      let text = '';

      if (searchResult.Seeders) {
        text += '*Seeders :*' + searchResult.Seeders + '\n';
      }
      if (searchResult.Peers) {
        text += '*Peers :*' + searchResult.Peers + '\n';
      }

      const fields = new Array();

      if (searchResult.CategoryDesc) {
        fields.push({
          short: true,
          title: 'Category',
          value: searchResult.CategoryDesc,
        });
      }
      if (searchResult.PublishDate) {
        fields.push({
          short: true,
          title: 'Published',
          value: formatDate(searchResult.PublishDate) + ' _(' + timeSince(searchResult.PublishDate) + ')',
        });
      }
      if (searchResult.Size) {
        fields.push({
          short: true,
          title: 'Size',
          value: formatBytes(searchResult.Size),
        });
      }
      if (searchResult.Files) {
        fields.push({
          short: true,
          title: 'Files',
          value: searchResult.Files,
        });
      }

      // Wanted to do actions for request, but can't pass tokens or headers, just urls...
      const actions = new Array<IMessageAction>();

      if (searchResult.Guid) {
        actions.push({
          type: MessageActionType.BUTTON,
          url: searchResult.Guid,
          text: 'View on Site',
          msg_in_chat_window: false,
          msg_processing_type: MessageProcessingType.SendMessage,
        });
      }
      if (searchResult.Link) {
        actions.push({
          type: MessageActionType.BUTTON,
          url: searchResult.Link,
          text: 'Download Link',
          msg_in_chat_window: false,
          msg_processing_type: MessageProcessingType.SendMessage,
        });
      }
      if (searchResult.MagnetUri) {
        actions.push({
          type: MessageActionType.BUTTON,
          url: searchResult.MagnetUri,
          text: 'Magnet Link',
          msg_in_chat_window: false,
          msg_processing_type: MessageProcessingType.SendMessage,
        });

        let magnetLinkHandlerCommand = await read.getEnvironmentReader().getSettings().getValueById('jackett_magnet_handler');
        if (magnetLinkHandlerCommand && magnetLinkHandlerCommand.length > 1) {
          magnetLinkHandlerCommand = magnetLinkHandlerCommand.trim();
          actions.push({
            type: MessageActionType.BUTTON,
            text: 'Magnet Link (Handler)',
            msg: `${magnetLinkHandlerCommand} ${searchResult.MagnetUri}`,
            msg_in_chat_window: true,
            msg_processing_type: MessageProcessingType.RespondWithMessage,
          });
        }
      }

      let indexDisplay = searchResult._IndexDisplay.toString();
      if (results._FullCount >= 1000) {
        if (searchResult._IndexDisplay < 10) {
          indexDisplay = `000${searchResult._IndexDisplay.toString()}`;
        } else if (searchResult._IndexDisplay < 100) {
          indexDisplay = `00${searchResult._IndexDisplay.toString()}`;
        } else if (searchResult._IndexDisplay < 1000) {
          indexDisplay = `0${searchResult._IndexDisplay.toString()}`;
        }
      } else if (results._FullCount >= 100) {
        if (searchResult._IndexDisplay < 10) {
          indexDisplay = `00${searchResult._IndexDisplay.toString()}`;
        } else if (searchResult._IndexDisplay < 100) {
          indexDisplay = `0${searchResult._IndexDisplay.toString()}`;
        }
      } else if (results._FullCount >= 10) {
        if (searchResult._IndexDisplay < 10) {
          indexDisplay = `0${searchResult._IndexDisplay.toString()}`;
        }
      }

      attachments.push({
        collapsed: results.Results.length < 5 ? false : true,
        color: '#000000',
        title: {
          value: `(#${indexDisplay}) ${searchResult.Title}`,
          link: results._JackettURLDisplay,
        },
        fields,
        actions,
        actionButtonsAlignment: MessageActionButtonsAlignment.HORIZONTAL,
        text,
      });
    });
  }

  await sendNotificationMultipleAttachments(attachments, read, modify, user, room);
}
