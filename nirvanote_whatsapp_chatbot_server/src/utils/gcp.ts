import { google, Auth } from "googleapis";

let auth: Auth.GoogleAuth | null = null;

export async function initializeGcp() {
  auth = new google.auth.GoogleAuth({
    keyFile: "./gcp.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
  });
}

export async function getAuthClient() {
  if (!auth) {
    throw new Error("Auth not initialized");
  }
  let client = await auth.getClient();
  return client;
}
