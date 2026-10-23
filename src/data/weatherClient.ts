import { OpenMeteoClient } from "./openMeteo";

/** One page-session validated cache, shared by the single-year and comparison flows. */
export const weatherClient = new OpenMeteoClient();
