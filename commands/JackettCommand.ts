import { IHttp, IModify, IPersistence, IRead } from '@rocket.chat/apps-engine/definition/accessors';
import { ISlashCommand, SlashCommandContext } from '@rocket.chat/apps-engine/definition/slashcommands';
import { JackettApp } from '../JackettApp';
import * as msgHelper from '../lib/helpers/messageHelper';

enum Command {
  Help = 'help',
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
      text: 'TODO: ',
      }, read, modify, context.getSender(), context.getRoom());
    return;
  }
}
