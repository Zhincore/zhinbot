import { ApplicationCommandData, BaseCommandInteraction } from "discord.js";
import { pushToMetaArray, IInteractionHandler } from "./_utils";
import { CustomCommandOption, parseAutocompleters } from "./DiscordAutocompleter";

const symbol = Symbol("commands");

type _CommandType = ApplicationCommandData["type"];

export type DiscordCommandData<Type extends _CommandType> = Omit<ApplicationCommandData, "name"> & {
  name?: string;
  type?: Type;
  description?: Type extends "CHAT_INPUT" ? string : never;
  options?: CustomCommandOption[];
};

export type DiscordCommandExecutor = (interaction: BaseCommandInteraction) => Promise<void>;

export interface IDiscordCommand extends IInteractionHandler<BaseCommandInteraction> {
  commandData: ApplicationCommandData;
  execute: DiscordCommandExecutor;
}

/**
 * Can only be used inside Discord adapter
 */
export function DiscordCommand(data: DiscordCommandData<_CommandType>): MethodDecorator {
  return (target, method) => {
    const command: IDiscordCommand = {
      commandData: parseAutocompleters(target, {
        ...data,
        type: "type" in data ? data.type : "CHAT_INPUT",
        name: data.name ?? method.toString(),
      }),
      execute: target[method as keyof typeof target] as DiscordCommandExecutor,
    };

    pushToMetaArray(symbol, command, target);
  };
}

export function getDiscordCommands(target: any): IDiscordCommand[] | undefined {
  return Reflect.getMetadata(symbol, target);
}
