import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { Role } from "@eurikatech/user";

// load configutation
dotenv.config();
const secret = process.env.TOKEN_SECRET ?? "";
const generateToken = (role: Role, user?: { name?: string; aud?: string; sub?: string }) => {
  return jwt.sign(
    {
      role: Role[role],
      name: user?.name ?? "0960009710",
      aud: user?.aud ?? "Establishment1",
      sub: user?.sub ?? "Mayas Faraj"
    },
    secret
  );
};

export default generateToken;
