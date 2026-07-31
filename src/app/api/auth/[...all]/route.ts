import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

// Catch-all handler exposing all better-auth endpoints under /api/auth/*
// (sign-in/email, sign-out, get-session, ...).
export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler(auth);
