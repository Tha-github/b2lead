import { getIronSession } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId: string;
  role: "operator" | "client";
  name: string;
}

const sessionOptions = {
  password: process.env.SESSION_SECRET ?? "b2lead-secret-key-must-be-32-chars-long!!",
  cookieName: "b2lead-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  },
};

export async function getSession() {
  return getIronSession<SessionData>(cookies(), sessionOptions);
}
