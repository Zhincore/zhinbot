import { Prisma } from "@prisma/client";
import { ApplicationCommandOptionType } from "discord.js";
import { CustomCommandOptionData } from "@core/decorators";

type Field = Prisma.SelfRolesItemScalarFieldEnum;

export const editableFields: Partial<Record<Field, CustomCommandOptionData>> = {
  name: {
    type: ApplicationCommandOptionType.String,
    name: "name",
    required: true,
  },
  title: {
    type: ApplicationCommandOptionType.String,
    name: "title",
    required: true,
  },
  color: {
    type: ApplicationCommandOptionType.String,
    name: "color",
    required: true,
  },
  message: {
    type: ApplicationCommandOptionType.String,
    name: "message",
    required: true,
  },
  showHelp: {
    type: ApplicationCommandOptionType.Boolean,
    name: "showhelp",
    required: true,
  },
  showRoles: {
    type: ApplicationCommandOptionType.Boolean,
    name: "showroles",
    required: true,
  },
  showName: {
    type: ApplicationCommandOptionType.Boolean,
    name: "showname",
    required: true,
  },
  channelId: {
    type: ApplicationCommandOptionType.Channel,
    name: "channel",
    required: true,
  },
  description: {
    type: ApplicationCommandOptionType.String,
    name: "description",
  },
  messageId: {
    type: ApplicationCommandOptionType.String,
    name: "messageid",
  },
};

export const editableFieldNameToField = Object.entries(editableFields).reduce((acc, [field, item]) => {
  acc[item.name] = field as Field;
  return acc;
}, {} as Record<string, Field>);
