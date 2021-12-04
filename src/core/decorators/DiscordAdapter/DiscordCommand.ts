import { ApplicationCommandData, BaseCommandInteraction } from "discord.js";
import { pushToMetaArray, IInteractionHandler } from "./utils";

const symbol = Symbol("commands");

export type DiscordCommandData = Omit<ApplicationCommandData, "name"> & {
  name?: string;
  description: string;
};

export type DiscordCommandExecutor = (interaction: BaseCommandInteraction) => Promise<void>;

export interface IDiscordCommand extends IInteractionHandler<BaseCommandInteraction> {
  commandData: ApplicationCommandData;
  execute: DiscordCommandExecutor;
}

/**
 * Can only be used inside Discord adapter
 */
export function DiscordCommand(data: DiscordCommandData): MethodDecorator {
  return (target, method) => {
    const commandmethod: IDiscordCommand = {
      commandData: {
        ...data,
        name: data.name ?? method.toString(),
      },
      execute: target[method as keyof typeof target] as DiscordCommandExecutor,
    };

    pushToMetaArray(symbol, commandmethod, target);
  };
}

export function getDiscordCommands(target: any): IDiscordCommand[] | undefined {
  return Reflect.getMetadata(symbol, target);
}
