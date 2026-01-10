# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Pulumi TypeScript project that provisions DigitalOcean GenAI Serverless Inference API keys for the CfgMgmtCamp 2026 workshop. It creates model access keys via the DigitalOcean GenAI API and outputs configuration for workshop participants to use with kagent.

## Commands

```bash
# Install dependencies
npm install

# Preview changes
pulumi preview

# Deploy infrastructure
pulumi up

# Destroy infrastructure
pulumi destroy

# Build TypeScript (rarely needed, Pulumi handles this)
npm run build
```

## Configuration

The project uses Pulumi ESC (Environment Secrets Config) for secrets management. The `dev` stack imports credentials from the `pulumi-idp/auth` environment.

**Config options (in Pulumi.yaml):**
- `keyName`: Name for the DigitalOcean API key (default: `cfgmgmtcamp-workshop-2026`)
- `model`: LLM model to use (default: `anthropic-claude-opus-4.5`)

**Required secrets:**
- `digitalocean:token`: DigitalOcean API token (provided via ESC environment)

## Architecture

Single-file Pulumi program (`index.ts`) that:
1. Creates a DigitalOcean GenAI model access key via curl command
2. Parses the API response to extract the secret key
3. Exports outputs for workshop configuration (LLM endpoint, model, API key)
4. Includes cleanup logic to delete the key on `pulumi destroy`

The DigitalOcean GenAI inference endpoint is OpenAI-compatible, allowing use with tools expecting OpenAI format.