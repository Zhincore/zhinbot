import { config as dotenv } from "dotenv";

dotenv();

if (process.env.NODE_ENV === "production") process.env.TF_CPP_MIN_LOG_LEVEL = "2";
