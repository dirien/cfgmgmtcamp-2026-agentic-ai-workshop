---
title: Introduction
---

# Building AI-Assisted Operations: Agentic AI Workshop

Welcome to the **Agentic AI Workshop** at CfgMgmtCamp Ghent 2026! :wave:

In this hands-on workshop, you'll learn how to build AI-assisted operational workflows using Kubernetes-native AI agents. By the end of this workshop, you'll have a multi-agent system that can autonomously investigate and fix infrastructure issues.

## :dart: What You'll Build

<div class="mermaid">
graph TD
    A[Orchestrator Agent<br/>Coordinates investigation and remediation] --> B[K8s Agent<br/>Diagnose]
    A --> C[PromQL Agent<br/>Metrics]
    A --> D[Pulumi Agent<br/>Fix PRs]

    B --> E[kubectl<br/>MCP Server]
    C --> F[Prometheus<br/>MCP Server]
    D --> G[GitHub<br/>MCP Server]

    style A fill:#6366f1,stroke:#4f46e5,color:#fff
    style B fill:#22c55e,stroke:#16a34a,color:#fff
    style C fill:#22c55e,stroke:#16a34a,color:#fff
    style D fill:#22c55e,stroke:#16a34a,color:#fff
    style E fill:#f59e0b,stroke:#d97706,color:#fff
    style F fill:#f59e0b,stroke:#d97706,color:#fff
    style G fill:#f59e0b,stroke:#d97706,color:#fff
</div>

<script type="module">
  import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@11/dist/mermaid.esm.min.mjs';
  mermaid.initialize({ startOnLoad: true });
</script>

Your multi-agent system will:
- **Diagnose** Kubernetes issues (pods, deployments, events)
- **Analyze** metrics and resource utilization
- **Create** pull requests to fix infrastructure code

## :books: Workshop Chapters

| Chapter | Title | Duration |
|---------|-------|----------|
| [01](01-create-kubernetes-cluster) | Create Kubernetes Cluster | 30 min |
| [02](02-deploy-kagent-mcp) | Deploy Kagent & MCP | 45 min |
| [03](03-deploy-platform-workload) | Deploy Platform Workload | 30 min |
| [04](04-multi-agent-troubleshooting) | Multi-Agent Troubleshooting | 60 min |
| [05](05-housekeeping) | Cleanup | 15 min |

## :white_check_mark: Prerequisites

Before starting, make sure you have:

- [x] A [GitHub account](https://github.com/signup) with a personal access token
- [x] A [Pulumi account](https://app.pulumi.com/signup) (free tier is sufficient)
- [x] Basic understanding of Kubernetes concepts
- [x] Familiarity with TypeScript or YAML

## :rocket: Getting Started

### Option 1: GitHub Codespaces (Recommended)

Click the button below to open this repository in GitHub Codespaces with all tools pre-installed:

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/dirien/cfgmgmtcamp-2026-agentic-ai-workshop)

### Option 2: Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/dirien/cfgmgmtcamp-2026-agentic-ai-workshop.git
   cd cfgmgmtcamp-2026-agentic-ai-workshop/havana
   ```

2. Install the required tools:
   - [Pulumi CLI](https://www.pulumi.com/docs/install/)
   - [kubectl](https://kubernetes.io/docs/tasks/tools/)
   - [Node.js](https://nodejs.org/) (LTS version)
   - [doctl](https://docs.digitalocean.com/reference/doctl/how-to/install/) (DigitalOcean CLI)

3. Login to Pulumi:
   ```bash
   pulumi login
   ```

## :key: Workshop Credentials

Your instructor will provide:
- **LLM Endpoint**: Pre-configured DigitalOcean GenAI endpoint
- **LLM API Key**: Shared API key for the workshop (via Pulumi ESC)

These credentials are automatically available when you use the workshop's Pulumi ESC environment.

## :bulb: Tips for Success

1. **Follow the chapters in order** - Each chapter builds on the previous one
2. **Don't skip the verification steps** - They help catch issues early
3. **Ask questions!** - The instructors are here to help
4. **Experiment** - Try modifying the agents and see what happens

## :link: Resources

- [Pulumi Documentation](https://www.pulumi.com/docs/)
- [Kagent Documentation](https://kagent.dev/docs/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
- [DigitalOcean Kubernetes](https://docs.digitalocean.com/products/kubernetes/)

---

Ready to begin? Let's start with [Chapter 1: Create Kubernetes Cluster](01-create-kubernetes-cluster)!
