import Discord, { AutocompleteInteraction, APIApplicationCommandOptionChoice } from "discord.js";
import { ApplicationCommandSub_Data } from "./DiscordSubcommand";
import { pushToMetaArray, IInteractionHandler } from "./_utils";

const mappingSymbol = Symbol("mappingAutocompleters");
const symbol = Symbol("autocompleters");

export type CustomCommandOptionData = Omit<Discord.ApplicationCommandOptionData, "autocomplete"> & {
  /**
   * Id of the autocompleter
   */
  autocomplete?: string | false;
  required?: boolean;
  choices?: Discord.ApplicationCommandChoicesData["choices"];
};
type _CustomSubcommandOption = Omit<Discord.ApplicationCommandSubCommandData, "options"> & {
  options?: CustomCommandOptionData[];
};
export type CustomCommandOption = CustomCommandOptionData | _CustomSubcommandOption;

export type CustomAppCmdData = Omit<Discord.ApplicationCommandData, "options"> & { options?: CustomCommandOption[] };
export type CustomAppSubcmdData = Omit<ApplicationCommandSub_Data, "options"> & { options?: CustomCommandOption[] };

export type Autocompleter = (
  interaction: AutocompleteInteraction,
) => APIApplicationCommandOptionChoice | Promise<APIApplicationCommandOptionChoice>;

export interface IAutocompleterMapping {
  commandName: string;
  subcommandName?: string;
  optionName: string;
  /**
   * Id of the autocompleter
   */
  id: string;
}

export interface IAutocompleter extends IInteractionHandler<AutocompleteInteraction> {
  id: string;
  execute: Autocompleter;
}

export function parseAutocompleters(
  target: object,
  commandData: CustomAppCmdData,
  supercmd?: string,
): Discord.ApplicationCommandData;
export function parseAutocompleters(
  target: object,
  commandData: CustomAppSubcmdData,
  supercmd?: string,
): ApplicationCommandSub_Data;
export function parseAutocompleters(
  target: object,
  commandData: CustomAppCmdData | CustomAppSubcmdData,
  supercmd?: string,
): any {
  if (!("options" in commandData)) return commandData;

  for (const option of commandData.options as CustomCommandOption[]) {
    if ("options" in option) {
      parseAutocompleters(target, option, commandData.name);
    } else if (option.autocomplete) {
      const mapping: IAutocompleterMapping = {
        commandName: supercmd ?? commandData.name,
        subcommandName: supercmd ? commandData.name : undefined,
        optionName: option.name,
        id: option.autocomplete + "",
      };
      pushToMetaArray(mappingSymbol, mapping, target);
      (option as Discord.ApplicationCommandOptionData).autocomplete = true;
    }
  }

  return commandData;
}

export function getAutocompleterId(command: string, option: string, superCommand?: string, subcommand?: string) {
  return (superCommand ? superCommand + "." : "") + command + (subcommand ? "." + subcommand : "") + ":" + option;
}

export function DiscordAutocompleter(id: string): MethodDecorator {
  return (target, method) => {
    const command: IAutocompleter = {
      id,
      execute: target[method as keyof typeof target] as Autocompleter,
    };

    pushToMetaArray(symbol, command, target);
  };
}

export function getAutocompleters(target: any): IAutocompleter[] | undefined {
  return Reflect.getMetadata(symbol, target);
}

export function getAutocompleterMappings(target: any): IAutocompleterMapping[] | undefined {
  return Reflect.getMetadata(mappingSymbol, target);
}
