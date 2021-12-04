import { ApplicationCommandData } from "discord.js";
import { Service } from "typedi";
import { getDiscordCommands, IDiscordCommand } from "./DiscordCommand";
import { getDiscordSubcommands, IDiscordSubcommand } from "./DiscordSubcommand";
import { getDiscordHandlers, IDiscordHandler } from "./DiscordHandler";

export * from "./DiscordCommand";
export * from "./DiscordHandler";
export * from "./DiscordSubcommand";
export * from "./utils";

const symbol = Symbol("discordAdapter");

export type DiscordAdapterData = {
  supercomand?: ApplicationCommandData;
};

export type IDiscordAdapter = DiscordAdapterData & {
  commands?: IDiscordCommand[];
  subcommands?: IDiscordSubcommand[];
  handlers?: IDiscordHandler[];
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
  };
}
