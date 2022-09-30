import { ApplicationCommandData, ApplicationCommandType, Interaction } from "discord.js";
import { pushToMetaArray, IInteractionHandler } from "./_utils";
import { CustomCommandOption, parseAutocompleters } from "./DiscordAutocompleter";

const symbol = Symbol("commands");

type _CommandType = ApplicationCommandData["type"];

export type DiscordCommandData<Type extends _CommandType> = Omit<ApplicationCommandData, "name"> & {
  name?: string;
  type?: Type;
  description?: Type extends ApplicationCommandType.ChatInput ? string : never;
  options?: CustomCommandOption[];
};

export type DiscordCommandExecutor = (interaction: Interaction) => Promise<void>;

export interface IDiscordCommand extends IInteractionHandler<Interaction> {
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
        type: ApplicationCommandType.ChatInput,
        name: method.toString(),
        defaultMemberPermissions: "0",
        ...data,
      }),
      execute: target[method as keyof typeof target] as DiscordCommandExecutor,
    };

    pushToMetaArray(symbol, command, target);
  };
}

export function getDiscordCommands(target: any): IDiscordCommand[] | undefined {
  return Reflect.getMetadata(symbol, target);
}
