import {
  ApplicationCommandChoicesData,
  ApplicationCommandNonOptionsData,
  ApplicationCommandChannelOptionData,
} from "discord.js";
import { Prisma } from "@prisma/client";

type Field = Prisma.SelfRolesItemScalarFieldEnum;

export const editableFields: Partial<
  Record<Field, ApplicationCommandChoicesData | ApplicationCommandNonOptionsData | ApplicationCommandChannelOptionData>
> = {
  title: {
    type: "STRING",
    description: "Title of the embed",
    name: "title",
    required: true,
  },
  color: {
    type: "STRING",
    description: "Color of the embed (color name/hex/idk)",
    name: "color",
    required: true,
  },
  message: {
    type: "STRING",
    description: "Message to show alongside the embed",
    name: "message",
    required: true,
  },
  showHelp: {
    type: "BOOLEAN",
    description: "Show hint on how to use the self-roles",
    name: "showhelp",
    required: true,
  },
  showRoles: {
    type: "BOOLEAN",
    description: "Show description of roles in embed",
    name: "showroles",
    required: true,
  },
  maxRoles: {
    type: "INTEGER",
    min_value: 0,
    description: "Maximum number of roles a user can choose from this self-roles item",
    name: "maxroles",
    required: true,
  } as ApplicationCommandChoicesData,
  showId: {
    type: "BOOLEAN",
    description: "Show ID of the self-roles item in embed",
    name: "showid",
    required: true,
  },
  channelId: {
    type: "CHANNEL",
    description: "Id of channel where the item should live",
    name: "channel",
    required: true,
  },
  description: {
    type: "STRING",
    description: "Description to show in the embed",
    name: "description",
  },
  messageId: {
    type: "STRING",
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
