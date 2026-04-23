import { getEnv } from "../config/env.js";
import { createHttpApp } from "./http-app.js";

const env = getEnv();
const app = createHttpApp(env);

export default {
  port: env.KOBSIDIAN_HTTP_PORT,
  hostname: env.KOBSIDIAN_HTTP_HOST,
  fetch: app.fetch,
};
