import { ApplicationCommandData, ApplicationCommandType, Interaction } from "discord.js";
import { TranslationService } from "~/core/Translation.service";
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
export function DiscordCommand(data: (trans: TranslationService) => DiscordCommandData<_CommandType>): MethodDecorator {
  return (target, method) => {
    const command = (trans: TranslationService): IDiscordCommand => ({
      commandData: parseAutocompleters(target, {
        type: ApplicationCommandType.ChatInput,
        name: method.toString(),
        defaultMemberPermissions: "0",
        ...data(trans),
      }),
      execute: target[method as keyof typeof target] as DiscordCommandExecutor,
    });

    pushToMetaArray(symbol, command, target);
  };
}

export function getDiscordCommands(target: any): ((trans: TranslationService) => IDiscordCommand)[] | undefined {
  return Reflect.getMetadata(symbol, target);
}
