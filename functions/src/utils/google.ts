import { db } from "src/services/firebase";
import { google } from 'googleapis';

export function getSheetsAndDrive(authClient?: any) {
  const sheets = (google as any).sheets({ version: 'v4', auth: authClient });
  const drive  = (google as any).drive({ version: 'v3', auth: authClient });
  return { sheets, drive };
}

export function getGoogleClient(authClient?: any) {
  return getSheetsAndDrive(authClient);
}

export function getServiceAccountGoogleClient(authClient?: any) {
  return getSheetsAndDrive(authClient);
}



