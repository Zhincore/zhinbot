import { ApplicationCommandData } from "discord.js";
import { Service } from "typedi";
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

export function DiscordAdapter(data: DiscordAdapterData = {}): ClassDecorator {
  const service = Service();
  return (target) => {
    Reflect.defineMetadata(symbol, data, target);
    service(target);
  };
}

export function getDiscordAdapterData(target: any): IDiscordAdapter | undefined {
  const adapterData: DiscordAdapterData | undefined = Reflect.getMetadata(symbol, target.constructor);
  if (!adapterData) return;

  return {
    ...adapterData,
    commands: getDiscordCommands(target),
    subcommands: getDiscordSubcommands(target),
    handlers: getDiscordHandlers(target),
    autocompleters: getAutocompleters(target),
    autocompleteMappings: getAutocompleterMappings(target),
  };
}
