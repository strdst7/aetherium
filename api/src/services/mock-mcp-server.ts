#!/usr/bin/env node
import * as readline from "readline";

const fakeTools = [
  { name: "echo", description: "Echoes the input", parameters: { type: "object", properties: { message: { type: "string" } } } },
  { name: "add", description: "Adds two numbers", parameters: { type: "object", properties: { a: { type: "number" }, b: { type: "number" } } } },
  { name: "query", description: "Queries the database", parameters: { type: "object", properties: { collection: { type: "string" }, filter: { type: "object" } } } },
];

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.on("line", (line) => {
  try {
    const request = JSON.parse(line);

    if (request.method === "discover") {
      console.log(JSON.stringify({
        jsonrpc: "2.0",
        id: request.id,
        result: { tools: fakeTools },
      }));
    } else if (request.method === "execute") {
      const { name, arguments: args } = request.params;
      let result;

      if (name === "echo") {
        result = { success: true, data: args.message };
      } else if (name === "add") {
        result = { success: true, data: args.a + args.b };
      } else if (name === "query") {
        result = { success: true, data: [{ id: "1", name: "test" }] };
      } else {
        result = { success: false, error: `Unknown tool: ${name}` };
      }

      console.log(JSON.stringify({
        jsonrpc: "2.0",
        id: request.id,
        result,
      }));
    } else {
      console.log(JSON.stringify({
        jsonrpc: "2.0",
        id: request.id,
        error: { code: -32601, message: "Method not found" },
      }));
    }
  } catch (error) {
    console.log(JSON.stringify({
      jsonrpc: "2.0",
      error: { code: -32700, message: "Parse error" },
    }));
  }
});

// Keep process alive
process.stdin.on("end", () => {
  process.exit(0);
});
