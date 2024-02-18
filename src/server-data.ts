import dotenv from "dotenv";
import fetch from "node-fetch";

// read config
dotenv.config();
const backendUrl = `${process.env.URL}:${process.env.PORT}/${process.env.SERVICE_NAME}`;

// define header schema
type HeaderType = {
  "Content-Type": string;
  Authorization?: string;
}

// main function
export const getServerData = async (query: string, variables?: object, token?: string) => {
  // define header
  const headers: HeaderType = { "Content-Type": "application/json" };
  if (token !== undefined) headers["Authorization"] = `Bearer ${token}`;

  // fetch operation
  const response = await fetch(backendUrl, {
    headers,
    method: "post",
    body: JSON.stringify({ query, variables })
  });

  // return result
  const jsonResponse = await response.json();
  return jsonResponse;
};
