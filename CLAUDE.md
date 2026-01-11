# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Workshop materials for "Building AI-Assisted Operations: Agentic AI Workshop" at CfgMgmtCamp Ghent 2026. Teaches participants to build multi-agent architectures using Kagent (CNCF sandbox project) for automating DevOps investigations.

## Repository Structure

- **Workshop chapters** (00-05 markdown files): Sequential hands-on exercises
- **Solution directories** (`01-solution/` through `04-solution/`): Each contains `typescript/` and `yaml/` implementations
- **`esc/`**: Pulumi ESC environment templates for secrets management
- **`instructor/do-genai-setup/`**: Instructor tooling for provisioning DigitalOcean GenAI API keys
- **`_layouts/`, `_includes/`, `_config.yml`**: Jekyll site configuration for GitHub Pages

## Commands

### Pulumi Projects (in solution directories)

```bash
# Install dependencies (TypeScript solutions)
npm install

# Preview infrastructure changes
pulumi preview

# Deploy infrastructure
pulumi up

# Tear down infrastructure
pulumi destroy
```

### Jekyll Site (local preview)

```bash
bundle exec jekyll serve
```

## Architecture

### Workshop Flow

1. **Chapter 01**: Create DigitalOcean Kubernetes cluster using `@pulumi/digitalocean`
2. **Chapter 02**: Deploy Kagent + kmcp via Helm charts with OpenAI-compatible LLM provider
3. **Chapter 03**: Deploy monitoring stack (kube-prometheus-stack, metrics-server) and sample app (podinfo)
4. **Chapter 04**: Configure multi-agent troubleshooting with orchestrator pattern using A2A (Agent-to-Agent)

### Agent Architecture (Chapter 04)

- **Orchestrator Agent**: Coordinates specialist agents for incident response
- **k8s-agent**: Kubernetes diagnostics (built-in to Kagent)
- **promql-agent**: PromQL query generation (built-in to Kagent)
- **observability-agent**: Prometheus metrics execution and Grafana dashboards (built-in to Kagent)
- **pulumi-agent**: Infrastructure fixes via Pulumi Neo MCP (creates PRs)

### Key Technologies

- **Kagent CRDs**: `Agent` (v1alpha2), `RemoteMCPServer` (v1alpha1)
- **Helm Charts**: `kagent-crds` and `kagent` from `ghcr.io/kagent-dev/kagent/helm/`
- **MCP**: Model Context Protocol for tool integration (Pulumi MCP at `https://mcp.ai.pulumi.com/mcp`)
- **ESC**: Pulumi Environments for secrets (DigitalOcean token, LLM API key, Pulumi access token)

## Configuration

Solutions use Pulumi ESC environments for credentials. Key config values:

| Chapter | Config Key | Description |
|---------|------------|-------------|
| 01 | `digitalocean:token` | DigitalOcean API token (via ESC) |
| 02 | `llmApiKey` | LLM API key for Kagent |
| 02 | `llmEndpoint` | OpenAI-compatible endpoint (default: DigitalOcean GenAI) |
| 04 | `pulumiAccessToken` | Pulumi Cloud token for Neo MCP |

## Development Environment

Use GitHub Codespaces or the devcontainer which includes: kubectl, helm, pulumi, doctl, node (LTS), docker-in-docker.
