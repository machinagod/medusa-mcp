#!/usr/bin/env python3
"""
MCP Skill Executor
==================
Handles dynamic communication with the MCP server.
"""

import json
import sys
import asyncio
import argparse
from pathlib import Path

# Check if mcp package is available
try:
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client
    HAS_MCP = True
except ImportError:
    HAS_MCP = False
    print("Warning: mcp package not installed. Install with: pip install mcp", file=sys.stderr)


class MCPExecutor:
    """Execute MCP tool calls dynamically."""

    def __init__(self, server_config):
        if not HAS_MCP:
            raise ImportError("mcp package is required. Install with: pip install mcp")

        self.server_config = server_config

    def _build_server_params(self) -> StdioServerParameters:
        return StdioServerParameters(
            command=self.server_config["command"],
            args=self.server_config.get("args", []),
            env=self.server_config.get("env"),
        )

    async def _with_session(self, func):
        """Helper to run an operation with a fresh MCP session."""
        server_params = self._build_server_params()

        # stdio_client is an async context manager in recent mcp versions
        async with stdio_client(server_params) as (read_stream, write_stream):
            async with ClientSession(read_stream, write_stream) as session:
                await session.initialize()
                return await func(session)

    async def list_tools(self):
        """Get list of available tools."""
        async def _run(session):
            response = await session.list_tools()
            return [
                {
                    "name": tool.name,
                    "description": tool.description,
                }
                for tool in response.tools
            ]

        return await self._with_session(_run)

    async def describe_tool(self, tool_name: str):
        """Get detailed schema for a specific tool."""
        async def _run(session):
            response = await session.list_tools()
            for tool in response.tools:
                if tool.name == tool_name:
                    return {
                        "name": tool.name,
                        "description": tool.description,
                        "inputSchema": tool.inputSchema,
                    }
            return None

        return await self._with_session(_run)

    async def call_tool(self, tool_name: str, arguments: dict):
        """Execute a tool call."""
        async def _run(session):
            response = await session.call_tool(tool_name, arguments)
            return response.content

        return await self._with_session(_run)

    async def close(self):
        """Close MCP connection (no-op, kept for API compatibility)."""
        return None


async def main():
    parser = argparse.ArgumentParser(description="MCP Skill Executor")
    parser.add_argument("--call", help="JSON tool call to execute")
    parser.add_argument("--describe", help="Get tool schema")
    parser.add_argument("--list", action="store_true", help="List all tools")
    
    args = parser.parse_args()
    
    # Load server config
    config_path = Path(__file__).parent / "mcp-config.json"
    if not config_path.exists():
        print(f"Error: Configuration file not found: {config_path}", file=sys.stderr)
        sys.exit(1)
        
    with open(config_path) as f:
        config = json.load(f)
    
    if not HAS_MCP:
        print("Error: mcp package not installed", file=sys.stderr)
        print("Install with: pip install mcp", file=sys.stderr)
        sys.exit(1)
    
    executor = MCPExecutor(config)
    
    try:
        if args.list:
            tools = await executor.list_tools()
            print(json.dumps(tools, indent=2))
            
        elif args.describe:
            schema = await executor.describe_tool(args.describe)
            if schema:
                print(json.dumps(schema, indent=2))
            else:
                print(f"Tool not found: {args.describe}", file=sys.stderr)
                sys.exit(1)
                
        elif args.call:
            call_data = json.loads(args.call)
            result = await executor.call_tool(
                call_data["tool"],
                call_data.get("arguments", {})
            )
            
            # Format result
            if isinstance(result, list):
                for item in result:
                    if hasattr(item, 'text'):
                        print(item.text)
                    else:
                        print(json.dumps(item.__dict__ if hasattr(item, '__dict__') else item, indent=2))
            else:
                print(json.dumps(result.__dict__ if hasattr(result, '__dict__') else result, indent=2))
        else:
            parser.print_help()
            
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)
    finally:
        await executor.close()


if __name__ == "__main__":
    asyncio.run(main())
