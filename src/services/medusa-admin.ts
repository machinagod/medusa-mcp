import Medusa from "@medusajs/js-sdk";
import { config } from "dotenv";
import { z, ZodTypeAny } from "zod";
import adminJson from "../oas/admin.oas.json";
import { AdminJson, SdkRequestType, Parameter } from "../types/admin-json";
import { defineTool, InferToolHandlerInput } from "../utils/define-tools";
import type { BackendCall } from "../tools/types";
import { clampToolName, isApiSafePropertyKey } from "../utils/tool-name";
import { isAdminPathAllowed } from "../utils/admin-allowlist";

config();

const MEDUSA_BACKEND_URL =
    process.env.MEDUSA_BACKEND_URL ?? "http://localhost:9000";

const MEDUSA_USERNAME = process.env.MEDUSA_USERNAME ?? "medusa_user";
const MEDUSA_PASSWORD = process.env.MEDUSA_PASSWORD ?? "medusa_pass";

export default class MedusaAdminService {
    sdk: Medusa;
    adminToken = "";
    constructor() {
        this.sdk = new Medusa({
            baseUrl: MEDUSA_BACKEND_URL,
            debug: process.env.NODE_ENV === "development",
            publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
            auth: {
                type: "jwt"
            }
        });
    }

    async init(): Promise<void> {
        const res = await this.sdk.auth.login("user", "emailpass", {
            email: MEDUSA_USERNAME,
            password: MEDUSA_PASSWORD
        });
        this.adminToken = res.toString();
    }

    wrapPath(refPath: string, refFunction: SdkRequestType) {
        return defineTool((z) => {
            let name;
            let description;
            let parameters: Parameter[] = [];
            let method = "get";
            if ("get" in refFunction) {
                method = "get";
                name = refFunction.get.operationId;
                description = refFunction.get.description;
                const rawParams = (refFunction.get as any).parameters;
                if (Array.isArray(rawParams)) {
                    parameters = rawParams;
                } else if (!rawParams) {
                    parameters = [];
                } else {
                    parameters = [rawParams];
                }
            } else if ("post" in refFunction) {
                method = "post";
                name = refFunction.post.operationId;
                description = refFunction.post.description;
                const rawParams = (refFunction.post as any).parameters;
                if (Array.isArray(rawParams)) {
                    parameters = rawParams;
                } else if (!rawParams) {
                    parameters = [];
                } else {
                    parameters = [rawParams];
                }
            } else if ("delete" in refFunction) {
                method = "delete";
                name = (refFunction.delete as any).operationId;
                description = (refFunction.delete as any).description;
                const rawParams = (refFunction.delete as any).parameters;
                if (Array.isArray(rawParams)) {
                    parameters = rawParams;
                } else if (!rawParams) {
                    parameters = [];
                } else {
                    parameters = [rawParams];
                }
            }
            if (!name) {
                throw new Error("No name found for path: " + refPath);
            }
            return {
                name: clampToolName(`Admin${name}`),
                description: `This tool helps store administors. ${description}`,
                inputSchema: {
                    ...(parameters ?? [])
                        .filter((p) => p.in != "header")
                        .filter((p) => isApiSafePropertyKey(p.name))
                        .reduce((acc, param) => {
                            switch (param.schema.type) {
                                case "string":
                                    acc[param.name] = z.string().optional();
                                    break;
                                case "number":
                                    acc[param.name] = z.number().optional();
                                    break;
                                case "boolean":
                                    acc[param.name] = z.boolean().optional();
                                    break;
                                case "array":
                                    acc[param.name] = z
                                        .array(z.string())
                                        .optional();
                                    break;
                                case "object":
                                    acc[param.name] = z.object({}).optional();
                                    break;
                                default:
                                    acc[param.name] = z.string().optional();
                            }
                            return acc;
                        }, {} as any)
                },

                handler: async (
                    input: InferToolHandlerInput<Record<string, ZodTypeAny>>
                ): Promise<any> => {
                    const query = new URLSearchParams(input as any);
                    const body = Object.entries(input).reduce(
                        (acc, [key, value]) => {
                            if (
                                parameters.find(
                                    (p) => p.name === key && p.in === "body"
                                )
                            ) {
                                acc[key] = value;
                            }
                            return acc;
                        },
                        {} as Record<string, any>
                    );
                    if (method === "get") {
                        const response = await this.sdk.client.fetch(refPath, {
                            method: method,
                            headers: {
                                "Content-Type": "application/json",
                                "Accept": "application/json",
                                "Authorization": `Bearer ${this.adminToken}`
                            },
                            query
                        });
                        return response;
                    } else {
                        const response = await this.sdk.client.fetch(refPath, {
                            method: method,
                            headers: {
                                "Content-Type": "application/json",
                                "Accept": "application/json",
                                "Authorization": `Bearer ${this.adminToken}`
                            },
                            body: JSON.stringify(body)
                        });
                        return response;
                    }
                }
            };
        });
    }

    defineTools(admin = adminJson as any): any[] {
        const paths = Object.entries(admin.paths) as [string, SdkRequestType][];
        const tools = paths
            .filter(([path]) => isAdminPathAllowed(path))
            .map(([path, refFunction]) => this.wrapPath(path, refFunction));
        return tools;
    }

    /**
     * Authenticated request to any backend route; returns parsed JSON. Handed to
     * auto-discovered tool modules (see tools/registry) as `ctx.request`.
     */
    request: BackendCall = (method, path, opts = {}) => {
        const query = opts.query
            ? Object.fromEntries(
                  Object.entries(opts.query).filter(([, v]) => v !== undefined)
              )
            : undefined;
        return this.sdk.client.fetch(path, {
            method,
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                Authorization: `Bearer ${this.adminToken}`
            },
            ...(query ? { query } : {}),
            ...(opts.body ? { body: JSON.stringify(opts.body) } : {})
        });
    };
}
