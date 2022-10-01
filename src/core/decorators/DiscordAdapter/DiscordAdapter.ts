import { ApplicationCommandData } from "discord.js";
import { Service } from "typedi";
import { TranslationService } from "~/core/Translation.service";
import {
  getAutocompleters,
  getAutocompleterMappings,
  IAutocompleter,
  IAutocompleterMapping,
} from "./DiscordAutocompleter";
import { getDiscordCommands, IDiscordCommand } from "./DiscordCommand";
import { getDiscordSubcommands, IDiscordSubcommand } from "./DiscordSubcommand";
import { getDiscordHandlers, IDiscordHandler } from "./DiscordHandler";

const symbol = Symbol("discordAdapter");

export type DiscordAdapterData = {
  supercomand?: ApplicationCommandData;
};

export type IDiscordAdapter = DiscordAdapterData & {
  commands?: IDiscordCommand[];
  subcommands?: IDiscordSubcommand[];
  handlers?: IDiscordHandler[];
  autocompleters?: IAutocompleter[];
  autocompleteMappings?: IAutocompleterMapping[];
};

export function DiscordAdapter(data: (trans: TranslationService) => DiscordAdapterData = () => ({})): ClassDecorator {
  const service = Service();
  return (target) => {
    Reflect.defineMetadata(symbol, data, target);
    service(target);
  };
}

export function getDiscordAdapterData(target: any, trans: TranslationService): IDiscordAdapter | undefined {
  const adapterData: ((trans: TranslationService) => DiscordAdapterData) | undefined = Reflect.getMetadata(
    symbol,
    target.constructor,
  );
  if (!adapterData) return;

  return {
    ...adapterData(trans),
    commands: getDiscordCommands(target)?.map((v) => v(trans)),
    subcommands: getDiscordSubcommands(target)?.map((v) => v(trans)),
    handlers: getDiscordHandlers(target),
    autocompleters: getAutocompleters(target),
    autocompleteMappings: getAutocompleterMappings(target),
  };
}
