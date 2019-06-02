import {
  IConfigurationExtend, IEnvironmentRead, ILogger,
} from '@rocket.chat/apps-engine/definition/accessors';
import { App } from '@rocket.chat/apps-engine/definition/App';
import { IAppInfo } from '@rocket.chat/apps-engine/definition/metadata';
import { SettingType } from '@rocket.chat/apps-engine/definition/settings';
import { JackettCommand } from './commands/JackettCommand';
import { JackettIndexersCommand } from './commands/JackettIndexersCommand';
import { JackettLoginCommand } from './commands/JackettLoginCommand';
import { JackettSearchCommand } from './commands/JackettSearchCommand';
import { JackettSetApiKeyCommand } from './commands/JackettSetApiKeyCommand';
import { JackettSetServerCommand } from './commands/JackettSetServerCommand';

export class JackettApp extends App {
    constructor(info: IAppInfo, logger: ILogger) {
        super(info, logger);
    }

    protected async extendConfiguration(configuration: IConfigurationExtend, environmentRead: IEnvironmentRead): Promise<void> {
      await configuration.settings.provideSetting({
        id: 'jackett_name',
        type: SettingType.STRING,
        packageValue: 'Jackett',
        required: true,
        public: false,
        i18nLabel: 'customize_name',
        i18nDescription: 'customize_name_description',
      });

      await configuration.settings.provideSetting({
        id: 'jackett_icon',
        type: SettingType.STRING,
        packageValue: 'https://github.com/tgardner851/Rocket.Chat.App-Jackett/raw/master/icon.png',
        required: true,
        public: false,
        i18nLabel: 'customize_icon',
        i18nDescription: 'customize_icon_description',
      });

      await configuration.slashCommands.provideSlashCommand(new JackettCommand(this));
      // await configuration.slashCommands.provideSlashCommand(new JackettIndexersCommand(this));
      // await configuration.slashCommands.provideSlashCommand(new JackettLoginCommand(this));
      await configuration.slashCommands.provideSlashCommand(new JackettSetServerCommand(this));
      await configuration.slashCommands.provideSlashCommand(new JackettSearchCommand(this));
      await configuration.slashCommands.provideSlashCommand(new JackettSetApiKeyCommand(this));
    }
}
