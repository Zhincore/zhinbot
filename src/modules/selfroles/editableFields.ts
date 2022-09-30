import { Prisma } from "@prisma/client";
import { CustomCommandOptionData } from "@core/decorators";
import { ApplicationCommandOptionType } from "discord.js";

type Field = Prisma.SelfRolesItemScalarFieldEnum;

export const editableFields: Partial<Record<Field, CustomCommandOptionData>> = {
  name: {
    type: ApplicationCommandOptionType.String,
    description: "Name of the self-roles item (used as an id)",
    name: "name",
    required: true,
  },
  title: {
    type: ApplicationCommandOptionType.String,
    description: "Title of the embed",
    name: "title",
    required: true,
  },
  color: {
    type: ApplicationCommandOptionType.String,
    description: "Color of the embed (color name/hex/idk)",
    name: "color",
    required: true,
  },
  message: {
    type: ApplicationCommandOptionType.String,
    description: "Message to show alongside the embed",
    name: "message",
    required: true,
  },
  showHelp: {
    type: ApplicationCommandOptionType.Boolean,
    description: "Show hint on how to use the self-roles",
    name: "showhelp",
    required: true,
  },
  showRoles: {
    type: ApplicationCommandOptionType.Boolean,
    description: "Show description of roles in embed",
    name: "showroles",
    required: true,
  },
  showName: {
    type: ApplicationCommandOptionType.Boolean,
    description: "Show ID of the self-roles item in embed",
    name: "showname",
    required: true,
  },
  channelId: {
    type: ApplicationCommandOptionType.Channel,
    description: "Id of channel where the item should live",
    name: "channel",
    required: true,
  },
  description: {
    type: ApplicationCommandOptionType.String,
    description: "Description to show in the embed",
    name: "description",
  },
  messageId: {
    type: ApplicationCommandOptionType.String,
    description: "!Advanced! Change id of tracked message",
    name: "messageid",
  },
};

export const editableFieldNameToField = Object.entries(editableFields).reduce<Record<string, Field>>(
  (acc, [field, item]) => {
    acc[item.name] = field as Field;
    return acc;
  },
  {},
);
