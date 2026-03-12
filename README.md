[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/sgfgov-medusa-mcp-badge.png)](https://mseep.ai/app/sgfgov-medusa-mcp)


# `medusa-mcp`

## Overview

`medusa-mcp` is a **Model Context Protocol (MCP) server** designed for integration with the Medusa JavaScript SDK. It provides a scalable backend layer for managing and interacting with Medusa’s data models, enabling automation, orchestration, and intelligent service extensions.

---

## 🧩 What is an MCP Server?

An **MCP server** is a modular, extensible backend that:

- Enables **real-time service orchestration**
- Supports **standardized, high-throughput communication**
- Acts as a **bridge between AI/automation tools and real-world systems**

These servers are used in areas like AI, IoT, and enterprise software to connect various services and automate tasks using standardized protocols like JSON-RPC.

### 🔑 Key Features

- **Modular Architecture** – Composable services for flexibility  
- **High Efficiency** – Optimized for speed and scale  
- **Extensible Design** – Add new capabilities easily  
- **Cross-Environment Deployment** – Cloud, on-prem, or hybrid  
- **AI-Ready Interfaces** – Integrate LLMs and tools seamlessly  

### 🧠 Role in AI Systems

MCP servers allow AI agents to:

- Access real-time data from APIs, files, or databases  
- Automate business processes (e.g., order fulfillment, pricing updates)  
- Interact with external services in a secure and controlled way  

---






---

## 🚀 Medusa JS + MCP

Using `medusa-mcp`, Medusa JS can:

- Automate workflows (e.g., inventory or pricing adjustments)
- Connect with external tools (email, analytics, etc.)
- Use AI agents to analyze trends and trigger actions  
- Enable scalable, modular architecture for commerce platforms

---

## ✨ Features

- ✅ **Model Context Protocol (MCP)** support  
- 📈 **Scalable** infrastructure  
- 🧱 **Extensible** plugin architecture  
- 🔗 **Integrated** with Medusa JS SDK  

---

## 🛠️ Installation

Clone the repository and install dependencies:

```bash
npm install
```

Build the project:

```bash
npm run build
```

---

## ▶️ Usage

Start the server:

```bash
npm start
```

Test using the MCP Inspector:

```bash
npx @modelcontextprotocol/inspector ./dist/index.js
```

> **Note:** Restart the Inspector and your browser after each rebuild.

---

## 🛠️ Generating a Claude Skill from this MCP server

You can convert this MCP server into a Claude Skill using the `mcp-to-skill.py` script from the [`mcp-to-skill-converter` project](https://github.com/GBSOSS/-mcp-to-skill-converter/blob/main/mcp_to_skill.py), which is included in this repo as `mcp-to-skill.py`.

1. **Build the MCP server** (so the command in the config works):

   ```bash
   npm run build
   ```

2. **Ensure Python and the `mcp` package are available**:

   ```bash
   pip install mcp
   ```

3. **Generate a Skill for this server** using the provided `mcp-to-skill.json` config:

   ```bash
   python mcp-to-skill.py --mcp-config mcp-to-skill.json --output-dir ./skills/medusa-mcp
   ```

   This will create:
   - `SKILL.md` – instructions for Claude  
   - `executor.py` – MCP communication handler  
   - `mcp-config.json` – MCP server configuration  
   - `package.json` – minimal dependencies for the skill

4. **Install the Skill for Claude**:

   ```bash
   cd skills/medusa-mcp
   pip install mcp
   cp -r . ~/.claude/skills/medusa-mcp
   ```

Claude will automatically discover the new Skill on next startup.

---

## 🌍 Environment Variables

| Variable              | Description                          |
|-----------------------|--------------------------------------|
| `MEDUSA_BACKEND_URL`  | Your Medusa backend URL              |
| `PUBLISHABLE_KEY`     | Your Medusa publishable API key      |
| `MEDUSA_USERNAME`     | Medusa admin username (for admin)    |
| `MEDUSA_PASSWORD`     | Medusa admin password (for admin)    |

Server runs at: [http://localhost:3000](http://localhost:3000)

---

## 🧠 Architecture Diagram

Here's how the `medusa-mcp` server fits into a typical setup with Medusa JS and external systems:

```

       +-------------------------+
       |     AI Assistant /      |
       |     LLM / Automation    |
       +-----------+-------------+
                   |
                   v
    +--------------+--------------+
    |     MCP Server (medusa-mcp) |
    |-----------------------------|
    | - JSON-RPC Communication    |
    | - AI-Ready Interface        |
    | - Plugin Support            |
    +------+----------------------+
                   |                             
                   +
                   |                                                         
                   v                                                         
         +-------------------+
         | Medusa Backend    |
         | (Products, Orders)|
         +-------------------+
                   |
                   |
                   v
           +--------------+
           | Medusa Store |
           | Frontend     |
           +--------------+
                   |
                   |
                   v
      +-------------------------+
      | External Services / API |
      | (e.g., Payments, Email) |
      +-------------------------+
```


## 🧪 Customization

To tailor the server to your Medusa setup:

> Replace `admin.json` and `store.json` with your own OAS definitions for fine-grained control.

- Replace the OpenAPI schemas in the `oas/` folder:
  - `admin.json` – Admin endpoints
  - `store.json` – Storefront endpoints

Use the [`@medusajs/medusa-oas-cli`](https://www.npmjs.com/package/@medusajs/medusa-oas-cli) to regenerate these files.

You can also **fork this project** to build your own custom MCP-powered Medusa integration.

---

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) guide.

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
