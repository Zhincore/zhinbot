import {
  ApplicationCommandData,
  ApplicationCommandOptionData,
  ApplicationCommandOptionType,
  ApplicationCommandType,
} from "discord.js";
import { IBotModule } from "~/core";

const headlineTypes = [
  ApplicationCommandOptionType.Subcommand,
  ApplicationCommandOptionType.SubcommandGroup,
  ...Object.values(ApplicationCommandType),
  undefined,
];

type SubData = ApplicationCommandData | ApplicationCommandOptionData;

export function getMarkdown(module: IBotModule<any>, commands: ApplicationCommandData[]): string {
  const output = ["# " + module.nameFriendly, ""];

  if (module.description) output.push(module.description, "");

  output.push(...traverseData(commands));

  return output.join("\n");
}

function traverseData(subcommands: SubData[], trace: string[] = []) {
  const output: string[] = [];
  let isOptions = false;

  if (!headlineTypes.includes(subcommands[0].type)) {
    isOptions = true;
    output.push("Options:", "");
  }

  for (const subcommand of subcommands) {
    if (isOptions) {
      output.push(getOption(subcommand));
    } else {
      const localTrace = [...trace, subcommand.name];
      output.push(...getHeadline(subcommand, localTrace));

      if ("options" in subcommand && subcommand.options && subcommand.options.length) {
        output.push(...traverseData(subcommand.options, localTrace));
      }
    }
  }

  if (isOptions) output.push("");

  return output;
}

function getHeadline(data: SubData, trace: string[]) {
  const prefix = {
    [ApplicationCommandType.ChatInput]: "/",
    [ApplicationCommandType.User]: "User option: ",
    [ApplicationCommandType.Message]: "Message option: ",
  }[data.type as 1];
  const output = [`${"#".repeat(trace.length + 1)} ${prefix}${trace.join(" ")}`];
  if ("description" in data && data.description) output.push("", data.description);
  output.push("");
  return output;
}

function getOption(data: SubData) {
  let item = `- \`${data.name}\``;
  if ("type" in data && data.type) item += ` &ndash; ${ApplicationCommandOptionType[data.type]}`;
  item += "required" in data && data.required ? " (required)" : " (optional)";
  if ("description" in data && data.description) item += ` &ndash; ${data.description}`;
  return item;
}
