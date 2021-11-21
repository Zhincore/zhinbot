import { ApplicationCommandOptionType } from "discord.js";
import { Prisma } from "@prisma/client";

export enum FieldTransform {
  COLOR,
}

export const editableFields: Partial<
  Record<
    string,
    { name: Prisma.ReactRolesItemScalarFieldEnum; type: ApplicationCommandOptionType; transform?: FieldTransform }
  >
> = {
  messageid: { type: "STRING", name: "messageId" },
  channelid: { type: "CHANNEL", name: "channelId" },
  title: { type: "STRING", name: "title" },
  color: { type: "STRING", name: "color", transform: FieldTransform.COLOR },
  description: { type: "STRING", name: "description" },
  message: { type: "STRING", name: "message" },
  showhelp: { type: "BOOLEAN", name: "showHelp" },
  showid: { type: "BOOLEAN", name: "showId" },
  showroles: { type: "BOOLEAN", name: "showRoles" },
};
