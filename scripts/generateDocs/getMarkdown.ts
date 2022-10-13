import {
  ApplicationCommandData,
  ApplicationCommandOptionData,
  ApplicationCommandOptionType,
  ApplicationCommandType,
} from "discord.js";

const headlineTypes = [
  ApplicationCommandOptionType.Subcommand,
  ApplicationCommandOptionType.SubcommandGroup,
  ApplicationCommandType.ChatInput,
];

type SubData = ApplicationCommandData | ApplicationCommandOptionData;

export function getMarkdown(moduleName: string, commands: ApplicationCommandData[]): string {
  const output = ["# " + moduleName, ""];

  const addHeadline = (data: SubData, trace: string[]) => {
    output.push(`${"#".repeat(trace.length + 1)} /${trace.join(" ")}`, "");
    if ("description" in data) output.push(data.description, "");
    if ("options" in data && data.options) traverse(data.options, trace);
  };

  const addOption = (data: SubData) => {
    let item = `- \`${data.name}\``;
    if ("type" in data && data.type) item += ` &ndash; ${ApplicationCommandOptionType[data.type]}`;
    item += "required" in data && data.required ? " (required)" : " (optional)";
    if ("description" in data) item += ` &ndash; ${data.description}`;
    output.push(item);
  };

  const traverse = (subcommands: SubData[], trace: string[] = []) => {
    let first = true;
    for (const subcommand of subcommands) {
      if (!subcommand.type) continue;

      if (headlineTypes.includes(subcommand.type)) {
        const localTrace = [...trace, subcommand.name];
        addHeadline(subcommand, localTrace);
      } else {
        if (first) {
          output.push("Options:", "");
          first = false;
        }
        addOption(subcommand);
      }
    }
    output.push("");
  };
  traverse(commands);

  return output.join("\n");
}
