# Momentum Cloud Functions

This directory contains the backend source code for the Momentum Platform API.

## Local Development

1.  From this directory, run `npm install`.
2.  Create a `.env` file from `.env.example` and populate it with your configuration.
3.  Run `npm run build` to compile the TypeScript code.
4.  To run with emulators, navigate to the project root and run `firebase emulators:start`.

## Deployment

1.  Run `npm run build` to ensure the code is compiled.
2.  From the project root, run `firebase deploy --only functions`.
