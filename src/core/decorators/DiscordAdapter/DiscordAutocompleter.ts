import Discord, { AutocompleteInteraction, APIApplicationCommandOptionChoice } from "discord.js";
import { pushToMetaArray, IInteractionHandler, CustomCommandData, CustomSubData } from "./_utils";

const mappingSymbol = Symbol("mappingAutocompleters");
const symbol = Symbol("autocompleters");

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
  commandData: CustomCommandData,
  supercmd?: string,
): Discord.ApplicationCommandData;
export function parseAutocompleters(target: object, commandData: CustomSubData, supercmd?: string): CustomSubData;
export function parseAutocompleters(
  target: object,
  commandData: CustomCommandData | CustomSubData,
  supercmd?: string,
): any {
  if (!("options" in commandData)) return commandData;

  for (const option of commandData.options as CustomSubData[]) {
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
