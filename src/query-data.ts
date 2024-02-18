// read table name
const databaseName = process.env.DATABASE_URL?.substring(process.env.DATABASE_URL.lastIndexOf("/") + 1);

type IdContainer = {
  id: number;
};

const queryIds = async (prismaClient: any, model: string): Promise<IdContainer[]> => {
  const response = await prismaClient[model].findMany({ select: { id: true }, orderBy: { id: "asc" } });
  return response;
};

const queryFirstId = async (prismaClient: any, model: string): Promise<IdContainer | undefined> => {
  const response = await queryIds(prismaClient, model);
  return response.length >= 0 ? response[0] : undefined;
};

const queryLastId = async (prismaClient: any, model: string): Promise<IdContainer | undefined> => {
  const response = await queryIds(prismaClient, model);
  return response.length >= 0 ? response[response.length - 1] : undefined;
};

const queryNexyId = async (prismaClient: any, model: string): Promise<number> => {
  await prismaClient.$queryRaw<{ AUTO_INCREMENT: string }[]>`SET PERSIST information_schema_stats_expiry = 0;`;
  const result = await prismaClient.$queryRaw<
    { AUTO_INCREMENT: string }[]
  >`SELECT AUTO_INCREMENT FROM information_schema.tables WHERE table_name = ${model} AND TABLE_SCHEMA = ${databaseName};`;
  return parseInt(result[0].AUTO_INCREMENT);
};

export { queryFirstId, queryLastId, queryNexyId };
