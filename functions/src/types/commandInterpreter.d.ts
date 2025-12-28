import { db } from "src/services/firebase";
declare module "../ai/commandInterpreter" {
  export function executeCommand(command: { name: string; args?: any }, uid?: string, tenantId?: string): Promise<any>;
}



