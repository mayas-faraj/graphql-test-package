import winston from "winston";

export const logDirName = "./__logs__";

// config logger
export const createTestLogger = (modelName?: string) => {
  if (modelName === undefined) modelName = "(unnamed model)";
  const logger = winston.createLogger({
    format: winston.format.simple(),
    transports: [
      new winston.transports.File({
        filename: `${logDirName}/${modelName}.md`,
        format: winston.format.printf((info) => info.message),
        options: { flags: "a" }
      })
    ]
  });

  logger.info(`## ${modelName.charAt(0).toUpperCase() + modelName.substring(1)}`);
  logger.info("");
  
  return logger;
};
