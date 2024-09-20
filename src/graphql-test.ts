import { test, describe } from "node:test";
import assert from "node:assert";
import dotenv from "dotenv";
import { Logger } from "winston";
import { getServerData } from "./server-data.js";
import generateToken from "./token-generator.js";

// supress callstack error
Error.stackTraceLimit = 0;

// read backend url
dotenv.config();
const port = parseInt(process.env.PORT ?? "4000");
const backendUrl = `${process.env.URL}:${port}/${process.env.SERVICE_NAME}`;

// define operation type
export enum OperationType {
  Create,
  Find,
  Read,
  Read_Own,
  Update,
  Update_Own,
  Upsert,
  Delete,
  Login
}

/*
  testing algorithim
  * test all valid values for all valid roles
  * log first valid value or all valid values with first valid roles
  * test all boundary values with first valid role
  * test first valid value for all invalid roles
  * log first error invalud roles with the first valid value
  * test all error invalid values with first valid role
  * log all error invalid values with first valid role
*/

const performGraphqlTest = async (
  type: OperationType,
  query: string,
  requiredParameters?: string[],
  uniqueFields?: string[],
  validValues?: object[],
  boundaryValues?: object[],
  invalidValues?: object[],
  validRoles?: string[],
  invalidRoles?: string[],
  note?: string,
  config?: {
    modelName: string;
    subModelName?: string;
    logger?: Logger;
    logAllValidValuesResult?: boolean;
    skipUpdateNextValidValues?: boolean;
    specificLogRoles?: string[];
    user?: {
      name: string;
      aud: string;
      sub: string;
    };
  }
) => {
  // resolve emtpy values, roles
  const testValidValues: (object | undefined)[] = validValues === undefined || validValues.length === 0 ? [undefined] : validValues;
  const testBoundaryValues = boundaryValues === undefined || boundaryValues.length === 0 ? [] : boundaryValues;
  const testInvalidValues = invalidValues === undefined || invalidValues.length === 0 ? [] : invalidValues;
  const testValidRoles: (string | undefined)[] = validRoles === undefined || validRoles.length === 0 ? [undefined] : validRoles;
  const testInvalidRoles = invalidRoles === undefined || invalidRoles.length === 0 ? [] : invalidRoles;

  // check role for logger
  const allowRoleLog = config?.specificLogRoles === undefined || config.specificLogRoles?.some((role) => testValidRoles.includes(role));

  // perform test of valid values for every valid role
  describe(`${OperationType[type]} ${config?.modelName}${config?.subModelName ? ` ${config.subModelName}` : ""} valid values`, () => {
    // for each role
    testValidRoles.map(async (role, roleIndex) => {
      // calculate token
      let token: string | undefined = undefined;
      if (role !== undefined) token = generateToken(role, config?.user);

      // for each value
      testValidValues.map(async (value, validIndex) => {
        // perform test
        test(`testing valid role: [${role !== undefined ? role : "none"}] for valid value index: ${validIndex}`, async () => {
          // add random for unique fields
          const processedValue = value !== undefined && uniqueFields !== undefined ? randomizeUniqueFileds(value, uniqueFields) : value;

          // get the result
          let response: unknown;
          const isFirstTest = validIndex === 0 && roleIndex === 0;
          const isDeleteOperation = type === OperationType.Delete;
          const isSkipNextUpdate = type === OperationType.Update && config?.skipUpdateNextValidValues === true;

          if (isFirstTest || !(isDeleteOperation || isSkipNextUpdate)) {
            response = await getServerData(query, processedValue, token);
            assert.ok(
              typeof response === "object" && response !== null && response.hasOwnProperty("data") && !response.hasOwnProperty("errors"),
              JSON.stringify(response, undefined, 2)
            );
          } else response = { message: `delete skipped for valid index [${validIndex}]` };

          if (roleIndex === 0 && (validIndex === 0 || config?.logAllValidValuesResult === true) && allowRoleLog) {
            // log schema
            if (roleIndex === 0 && validIndex === 0) {
              // log h2
              config?.logger?.info(`### ${OperationType[type].replace("_", " ")} ${config?.modelName}${config?.subModelName ? ` ${config.subModelName}` : ""}`);
              config?.logger?.info("");

              // log valid roles
              if (validRoles === undefined || validRoles.length === 0) config?.logger?.info("This operation doesn't required authoriazation under any role.");
              else if (validRoles.length === 1)
                config?.logger?.info(
                  `Only the user under [${validRoles[0]}] role can ${OperationType[type].replace("_", " ").toLowerCase()} this model type.`
                );
              else {
                config?.logger?.info(`These types of roles can ${OperationType[type].replace("_", " ").toLowerCase()} this model type:`);
                config?.logger?.info("");
                validRoles.map((role) => config?.logger?.info(`- ${role}`));
                config?.logger?.info("");
              }

              // log invalid roles
              if (invalidRoles !== undefined && invalidRoles.length > 0)
                config?.logger?.info(
                  `The user under other roles like [${invalidRoles.map((role) => role).join(", ")}] don't able to perform this operation.`
                );

              // log unique fields
              if (uniqueFields !== undefined && uniqueFields.length > 0)
                config?.logger?.info(`The fields [${uniqueFields.join(", ")}] are unique in the database table of group.`);

              // log required variables
              if (requiredParameters === undefined || requiredParameters.length === 0) config?.logger?.info("This operation does not require any variables.");
              else if (requiredParameters.length === 1) config?.logger?.info(`The only required variable for this operation is ${requiredParameters[0]}.`);
              else {
                config?.logger?.info("The required variables of this operation are:");
                config?.logger?.info("");
                requiredParameters.map((param) => config?.logger?.info(`- ${param}`));
              }
              config?.logger?.info("");
              config?.logger?.info("The graphql query is");
              config?.logger?.info("");
              config?.logger?.info("```json");
              config?.logger?.info(JSON.stringify(value !== undefined ? { query, variables: value } : { query }, undefined, 4));
              config?.logger?.info("```");
              config?.logger?.info("");

              // log bash command
              config?.logger?.info("And the cli commad to execute this query is:");
              config?.logger?.info("");
              config?.logger?.info("```bash");
              config?.logger?.info(
                `curl -X POST -H "Content-Type: application/json" ${
                  token !== undefined ? `-H "Authorization: BEARER ${token}"` : ""
                } -d '{ "query": "${query}"${value !== undefined ? `, "variables": ${JSON.stringify(value)}` : ""}}' ${backendUrl} | jq`
              );
              config?.logger?.info("```");
              config?.logger?.info("");

              // log note
              if (note) config?.logger?.info(`**Note:** ${note}`);
            } else {
              config?.logger?.info("and for the input variable:");
              config?.logger?.info("");
              config?.logger?.info("```json");
              config?.logger?.info(JSON.stringify(value, undefined, 4));
              config?.logger?.info("```");
              config?.logger?.info("");
            }

            // log result
            config?.logger?.info("if the operation success, the response schema is:");
            config?.logger?.info("");
            config?.logger?.info("```json");
            config?.logger?.info(JSON.stringify(response, undefined, 4));
            config?.logger?.info("```");
            config?.logger?.info("");
          }
        });
      });
    });
  });

  // calcuate first valid token if exists
  const normalToken = testValidRoles[0] !== undefined ? generateToken(testValidRoles[0], config?.user) : undefined;

  // perform test of boundary values for first valid role
  describe(`${OperationType[type]} ${config?.modelName}${config?.subModelName ? ` ${config.subModelName}` : ""} boundary values`, () => {
    // for each value
    testBoundaryValues.map(async (value, boundaryIndex) => {
      // perform test
      test(`testing valid role: [${
        testValidRoles[0] !== undefined ? testValidRoles[0] : "none"
      }] for boundary value index: ${boundaryIndex}`, async () => {
        // add random for unique fields
        const processedValue = uniqueFields !== undefined ? randomizeUniqueFileds(value, uniqueFields) : value;

        const response: unknown = await getServerData(query, processedValue, normalToken);
        assert.ok(
          typeof response === "object" && response !== null && response.hasOwnProperty("data") && !response.hasOwnProperty("errors"),
          JSON.stringify(response, undefined, 2)
        );
      });
    });
  });

  // perform test of invalid roles for first valid value
  describe(`${OperationType[type]} ${config?.modelName}${config?.subModelName ? ` ${config.subModelName}` : ""} Error roles`, () => {
    // for each value
    testInvalidRoles.map(async (role, roleIndex) => {
      // perform test
      test(`testing invalid role: [${role !== undefined ? role : "none"}] for valid value index: 0`, async () => {
        const response: unknown = await getServerData(query, testValidValues[0], generateToken(role, config?.user));
        assert.ok(typeof response === "object" && response !== null && response.hasOwnProperty("errors"), JSON.stringify(response, undefined, 2));

        if (roleIndex === 0 && allowRoleLog) {
          // log result
          config?.logger?.info("if the user under invalid role, the response schema is:");
          config?.logger?.info("");
          config?.logger?.info("```json");
          config?.logger?.info(JSON.stringify(response, undefined, 4));
          config?.logger?.info("```");
          config?.logger?.info("");
        }
      });
    });
  });

  // perform test of invalid values for first valid role
  describe(`${OperationType[type]} ${config?.modelName}${config?.subModelName ? ` ${config.subModelName}` : ""} invalid values`, () => {
    // for each value
    testInvalidValues.map(async (value, boundaryIndex) => {
      // perform test
      test(`testing valid role: [${testValidRoles[0] !== undefined ? testValidRoles[0] : "none"}] for invalid value: ${boundaryIndex}`, async () => {
        const response: unknown = await getServerData(query, value, normalToken);
        assert.ok(typeof response === "object" && response !== null && response.hasOwnProperty("errors"), JSON.stringify(response, undefined, 2));

        // log result
        if (allowRoleLog) {
          config?.logger?.info("if the value are invalid:");
          config?.logger?.info("");
          config?.logger?.info("```json");
          config?.logger?.info(JSON.stringify(value, undefined, 4));
          config?.logger?.info("```");
          config?.logger?.info("");

          config?.logger?.info("the response is:");
          config?.logger?.info("");
          config?.logger?.info("```json");
          config?.logger?.info(JSON.stringify(response, undefined, 4));
          config?.logger?.info("```");
          config?.logger?.info("");
        }
      });
    });
  });
};

export const randomizeUniqueFileds = (value: object, uniqueFields: string[]) => {
  // randomize value
  const getRandomizeValue = (value: unknown) => {
    const random = Math.ceil(Math.random() * 10000);
    return typeof value === "number" ? (value = parseInt(`${value}${random}`)) : `${value}-${random}`;
  };
  // concat random string for unique fields for two levels
  const processedValue = structuredClone(value);
  uniqueFields.map((field) => {
    const dotIndex = field.indexOf(".");
    if (dotIndex >= 0) {
      const field1 = field.substring(0, dotIndex);
      const field2 = field.substring(dotIndex + 1);
      if (field1 in processedValue && field2 in processedValue[field1]) processedValue[field1][field2] = getRandomizeValue(processedValue[field1][field2]);
    } else if (field in processedValue) processedValue[field] = getRandomizeValue(processedValue[field]);
  });

  return processedValue;
};

export default performGraphqlTest;
