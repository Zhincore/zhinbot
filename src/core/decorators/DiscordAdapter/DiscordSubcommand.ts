import { ApplicationCommandSubCommandData, ApplicationCommandSubGroupData, BaseCommandInteraction } from "discord.js";
import { DiscordCommandExecutor } from "./DiscordCommand";
import { pushToMetaArray, IInteractionHandler } from "./_utils";
import { CustomCommandOption, CustomAppSubcmdData, parseAutocompleters } from "./DiscordAutocompleter";

const symbol = Symbol("subcommands");

export type ApplicationCommandSub_Data = ApplicationCommandSubCommandData | ApplicationCommandSubGroupData;

type _D<T extends "subcmd" | "group"> = T extends "subcmd"
  ? ApplicationCommandSubCommandData
  : ApplicationCommandSubGroupData;
export type DiscordSubcommandData<T extends "subcmd" | "group"> = Omit<_D<T>, "name" | "type" | "options"> & {
  name?: string;
  type?: _D<T>["type"];
  description: string;
  options?: T extends "subcmd" ? CustomCommandOption[] : DiscordSubcommandData<"subcmd">[];
};

export type DiscordSubcommandExecutor = (interaction: BaseCommandInteraction) => Promise<void>;

export interface IDiscordSubcommand extends IInteractionHandler<BaseCommandInteraction> {
  commandData: ApplicationCommandSub_Data;
  execute: DiscordCommandExecutor;
}

/**
 * Can only be used inside Discord adapter
 */
export function DiscordSubcommand(data: DiscordSubcommandData<"subcmd">): MethodDecorator;
export function DiscordSubcommand(data: DiscordSubcommandData<"group">): MethodDecorator;
export function DiscordSubcommand(data: DiscordSubcommandData<any>): MethodDecorator {
  return (target, method) => {
    const subcommand: IDiscordSubcommand = {
      commandData: parseAutocompleters(target, {
        ...data,
        type: data.type ?? "SUB_COMMAND",
        name: data.name ?? method.toString(),
      } as CustomAppSubcmdData),
      execute: target[method as keyof typeof target] as DiscordCommandExecutor,
    };

    pushToMetaArray(symbol, subcommand, target);
  };
}

export function getDiscordSubcommands(target: any): IDiscordSubcommand[] | undefined {
  return Reflect.getMetadata(symbol, target);
}
