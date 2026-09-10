import { ApiError, apiHandler, jsonOk } from "@/lib/api";
import { publicUser } from "@/lib/tokens";

export const GET = apiHandler(async ({ user }) => {
  if (!user) throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
  return jsonOk(publicUser(user));
}, { auth: true });
