import fs from "fs/promises";
import { logDirName, createTestLogger } from "./logger.js";
export { default as performGraphqlTest, OperationType } from "./graphql-test.js";
export { getServerData } from "./server-data.js";
export { queryFirstId, queryLastId, queryNexyId } from "./query-data.js";
export { createTestLogger };

// clear previous logs
await fs.rm(logDirName, { force: true, recursive: true });
