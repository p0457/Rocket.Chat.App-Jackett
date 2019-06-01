import { IModify, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { IMessageAction, IMessageAttachment, MessageActionButtonsAlignment, MessageActionType, MessageProcessingType } from '@rocket.chat/apps-engine/definition/messages';
import { IRoom } from '@rocket.chat/apps-engine/definition/rooms';
import { IUser } from '@rocket.chat/apps-engine/definition/users';

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
