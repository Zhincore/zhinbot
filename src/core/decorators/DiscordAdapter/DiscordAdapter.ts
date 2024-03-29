import { ChatInputApplicationCommandData } from "discord.js";
import { Service } from "typedi";
import { Bot } from "@core/Bot/index.js";
import {
  getAutocompleters,
  getAutocompleterMappings,
  IAutocompleter,
  IAutocompleterMapping,
} from "./DiscordAutocompleter.js";
import { getDiscordCommands, IDiscordCommand } from "./DiscordCommand.js";
import { getDiscordSubcommands, IDiscordSubcommand } from "./DiscordSubcommand.js";
import { getDiscordHandlers, IDiscordHandler } from "./DiscordHandler.js";
import { AnnotWithBot, RemoveTranslated } from "./_utils.js";

const symbol = Symbol("discordAdapter");

export type DiscordAdapterData = {
  supercomand?: RemoveTranslated<ChatInputApplicationCommandData>;
};

export type IDiscordAdapter = DiscordAdapterData & {
  commands?: IDiscordCommand[];
  subcommands?: IDiscordSubcommand[];
  handlers?: IDiscordHandler[];
  autocompleters?: IAutocompleter[];
  autocompleteMappings?: IAutocompleterMapping[];
};

export function DiscordAdapter(data: AnnotWithBot<DiscordAdapterData> = {}): ClassDecorator {
  const service = Service();
  return (target) => {
    Reflect.defineMetadata(symbol, data, target);
    service(target);
  };
}

export function getDiscordAdapterData(target: any, bot: Bot): IDiscordAdapter | undefined {
  const adapterData: ((bot: Bot) => DiscordAdapterData) | DiscordAdapterData | undefined = Reflect.getMetadata(
    symbol,
    target.constructor,
  );
  if (!adapterData) return;

  return {
    ...(typeof adapterData === "function" ? adapterData(bot) : adapterData),
    commands: getDiscordCommands(target)?.map((v) => v(bot)),
    subcommands: getDiscordSubcommands(target)?.map((v) => v(bot)),
    handlers: getDiscordHandlers(target),
    autocompleters: getAutocompleters(target),
    autocompleteMappings: getAutocompleterMappings(target),
  };
}
