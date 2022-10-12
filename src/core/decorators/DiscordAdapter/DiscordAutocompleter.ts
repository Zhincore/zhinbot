import Discord, {
  AutocompleteInteraction,
  APIApplicationCommandOptionChoice,
  ApplicationCommandSubGroupData,
  ApplicationCommandSubCommandData,
} from "discord.js";
import { ApplicationCommandSubData } from "./DiscordSubcommand";
import { pushToMetaArray, IInteractionHandler } from "./_utils";

const mappingSymbol = Symbol("mappingAutocompleters");
const symbol = Symbol("autocompleters");

export type CustomCommandOptionData = Omit<
  Exclude<
    Discord.ApplicationCommandOptionData,
    Discord.ApplicationCommandSubCommandData | Discord.ApplicationCommandSubGroupData
  >,
  "autocomplete" | "description"
> & {
  /**
   * Id of the autocompleter
   */
  autocomplete?: string | false;
  required?: boolean;
  choices?: Discord.ApplicationCommandChoicesData["choices"];
  channel_types?: Discord.ApplicationCommandChannelOptionData["channel_types"];
};

type _RemoveTranslated<T> = Omit<T, "description">;
type _ReplaceOptions<T, Opts> = Omit<T, "options"> & { options?: Opts };

export type CustomCommandData = _ReplaceOptions<
  Discord.ApplicationCommandData,
  CustomCommandOptionData[] | CustomSubData[]
>;
type CustomSubCommandData = _ReplaceOptions<
  _RemoveTranslated<ApplicationCommandSubCommandData>,
  CustomCommandOptionData[]
>;
type CustomSubGroupData = _ReplaceOptions<_RemoveTranslated<ApplicationCommandSubGroupData>, CustomSubCommandData[]>;
export type CustomSubData = CustomSubCommandData | CustomSubGroupData;

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
export function parseAutocompleters(
  target: object,
  commandData: CustomSubData,
  supercmd?: string,
): ApplicationCommandSubData;
export function parseAutocompleters(
  target: object,
  commandData: CustomCommandData | CustomSubData,
  supercmd?: string,
): any {
  if (!("options" in commandData)) return commandData;

  for (const option of commandData.options as CustomCommandOptionData[]) {
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
