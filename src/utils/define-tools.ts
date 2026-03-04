import { z } from "zod";
import type { ZodTypeAny } from "zod";
import { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
    CallToolResult,
    ServerRequest,
    ServerNotification
} from "@modelcontextprotocol/sdk/types.js";

/** Inferred input type for a tool whose inputSchema is a record of Zod schemas. */
export type InferToolHandlerInput<T extends Record<string, ZodTypeAny>> = {
    [K in keyof T]: z.infer<T[K]>;
};

export type ToolDefinition<T extends Record<string, ZodTypeAny>, O> = {
    name: string;
    description: string;
    inputSchema: T;
    handler: (input: InferToolHandlerInput<T>) => Promise<O>;
};

type CallToolResultContent = {
    content: CallToolResult["content"];
    isError?: boolean;
    statusCode?: number;
};

export function defineTool<T extends Record<string, ZodTypeAny>, O>(
    cb: (zod: typeof z) => ToolDefinition<T, O>
): Omit<ToolDefinition<T, O>, "handler"> & {
    handler: (
        input: InferToolHandlerInput<T>,
        _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
    ) => Promise<CallToolResultContent>;
} {
    const tool = cb(z);

    const wrappedHandler = async (
        input: InferToolHandlerInput<T>,
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- MCP server passes extra as second argument
        _extra: RequestHandlerExtra<ServerRequest, ServerNotification>
    ): Promise<CallToolResultContent> => {
        try {
            const result = await tool.handler(input);
            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(result, null, 2)
                    }
                ]
            };
        } catch (error) {
            return {
                content: [
                    {
                        type: "text",
                        text: `Error: ${
                            error instanceof Error
                                ? error.message
                                : String(error)
                        }`
                    }
                ],
                isError: true
            };
        }
    };

    return {
        ...tool,
        handler: wrappedHandler
    };
}
