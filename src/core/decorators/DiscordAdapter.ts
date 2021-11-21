import { ApplicationCommandData } from "discord.js";
import { Service } from "typedi";

const symbol = Symbol("discordAdapter");

export type DiscordAdapterData = {
  supercomand?: ApplicationCommandData;
};

export function DiscordAdapter(data?: DiscordAdapterData): ClassDecorator {
  const service = Service();
  return (target) => {
    if (data) Reflect.defineMetadata(symbol, data, target);
    service(target);
  };
}

export function getDiscordAdapterData(target: any): DiscordAdapterData | undefined {
  return Reflect.getMetadata(symbol, target);
}
