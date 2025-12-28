"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSheetsAndDrive = getSheetsAndDrive;
exports.getGoogleClient = getGoogleClient;
exports.getServiceAccountGoogleClient = getServiceAccountGoogleClient;
const googleapis_1 = require("googleapis");
function getSheetsAndDrive(authClient) {
    const sheets = googleapis_1.google.sheets({ version: 'v4', auth: authClient });
    const drive = googleapis_1.google.drive({ version: 'v3', auth: authClient });
    return { sheets, drive };
}
function getGoogleClient(authClient) {
    return getSheetsAndDrive(authClient);
}
function getServiceAccountGoogleClient(authClient) {
    return getSheetsAndDrive(authClient);
}
