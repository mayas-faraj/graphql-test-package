import jwt from "jsonwebtoken";
import dotenv from "dotenv";

// load configutation
dotenv.config();
const secret = process.env.TOKEN_SECRET ?? "";
const generateToken = (role: string, user?: { name?: string; aud?: string; sub?: string }) => {
  return jwt.sign(
    {
      roles: [role],
      name: user?.name ?? "0960009710",
      aud: user?.aud ?? "Establishment1",
      sub: user?.sub ?? "Mayas Faraj"
    },
    secret
  );
};

export default generateToken;
