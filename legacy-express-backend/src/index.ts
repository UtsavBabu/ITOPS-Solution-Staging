import { createApp } from "./app";
import { config } from "./config";
import { startScheduler } from "./scheduler/scheduler";

const app = createApp();

app.listen(config.port, () => {
  console.log(`ITOps Monitor API listening on port ${config.port}`);
  startScheduler();
});
