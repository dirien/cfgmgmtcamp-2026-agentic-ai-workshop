---
title: "Chapter 4: Multi-Agent Troubleshooting"
---

# Chapter 4: Multi-Agent Troubleshooting

This is the grand finale! :tada: In this chapter, you'll create a multi-agent system where an **orchestrator agent** coordinates specialist agents to autonomously investigate and fix infrastructure issues.

## :dart: Goals

- Deploy the Pulumi Remote MCP server integration
- Create a Pulumi Agent that can fix infrastructure code
- Create an Orchestrator Agent that coordinates other agents
- Deploy a faulty workload and watch the agents fix it!

## :clock1: Estimated Time: 60 minutes

---

## The Multi-Agent Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Orchestrator Agent                           │
│  "Investigate why podinfo-faulty is not running and fix it"    │
└────────────────────────┬────────────────────────────────────────┘
                         │
         ┌───────────────┼───────────────┐
         │               │               │
         ▼               ▼               ▼
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│  K8s Agent  │  │ PromQL Agent│  │Pulumi Agent │
│             │  │             │  │             │
│ "Check pod  │  │ "Analyze    │  │ "Create a   │
│  status"    │  │  resources" │  │  fix PR"    │
└─────────────┘  └─────────────┘  └─────────────┘
```

## How A2A (Agent-to-Agent) Works

Kagent supports the **Agent-as-Tool** pattern where agents can delegate work to other agents:

1. Each agent exposes **skills** via `a2aConfig`
2. Other agents can reference agents as **tools**
3. The orchestrator decides which agent to call based on the task

```yaml
# Agent A can call Agent B
tools:
- type: Agent
  agent:
    ref: agent-b  # Reference by name
```

## Step 1: Navigate to the Solution Directory

```bash
cd 04-solution/typescript
npm install
```

## Step 2: Review the Code

This chapter creates three main components:

### Pulumi Remote MCP Server

Connect to Pulumi's Remote MCP for infrastructure management:

```typescript
// RemoteMCPServer for Pulumi
const pulumiMcp = new k8s.apiextensions.CustomResource("pulumi-remote-mcp", {
    apiVersion: "kagent.dev/v1alpha1",
    kind: "RemoteMCPServer",
    metadata: {
        name: "pulumi-remote-mcp",
        namespace: kagentNamespace,
    },
    spec: {
        url: "https://mcp.ai.pulumi.com/mcp",
        description: "Pulumi Remote MCP for infrastructure management and Pulumi Neo",
        protocol: "STREAMABLE_HTTP",
        headersFrom: [{
            secretKeyRef: {
                name: "pulumi-access-token",
                key: "token",
            },
            header: "Authorization",
            valueTemplate: "Bearer {{ .Value }}",
        }],
    },
});
```

### Pulumi Agent

An agent that uses Pulumi Neo to analyze and fix infrastructure:

```typescript
const pulumiAgent = new k8s.apiextensions.CustomResource("pulumi-agent", {
    apiVersion: "kagent.dev/v1alpha2",
    kind: "Agent",
    metadata: {
        name: "pulumi-agent",
        namespace: kagentNamespace,
    },
    spec: {
        description: "Infrastructure management agent using Pulumi Neo",
        type: "Declarative",
        declarative: {
            systemMessage: `You are a Pulumi infrastructure expert. Your role is to:
- Analyze infrastructure code and configurations
- Use Pulumi Neo to understand existing infrastructure
- Create pull requests with fixes for infrastructure issues`,
            modelConfig: "default",
            tools: [{
                type: "McpServer",
                mcpServer: {
                    name: "pulumi-remote-mcp",
                    kind: "RemoteMCPServer",
                },
            }],
            a2aConfig: {
                skills: [{
                    id: "create-fix-pr",
                    name: "Create Fix PR",
                    description: "Create a pull request to fix infrastructure issues",
                    tags: ["pulumi", "infrastructure", "pr"],
                }],
            },
        },
    },
});
```

### Orchestrator Agent

The mastermind that coordinates everything:

```typescript
const orchestratorAgent = new k8s.apiextensions.CustomResource("orchestrator-agent", {
    apiVersion: "kagent.dev/v1alpha2",
    kind: "Agent",
    metadata: {
        name: "orchestrator-agent",
        namespace: kagentNamespace,
    },
    spec: {
        description: "Incident orchestrator that coordinates specialist agents",
        type: "Declarative",
        declarative: {
            systemMessage: `You are an incident response orchestrator. When users report issues:
1. Use k8s-agent to diagnose Kubernetes problems
2. Use promql-agent to analyze metrics
3. Use pulumi-agent to create PRs for fixes

Coordinate the specialists and synthesize their findings.`,
            modelConfig: "default",
            tools: [
                { type: "Agent", agent: { ref: "k8s-agent" } },
                { type: "Agent", agent: { ref: "promql-agent" } },
                { type: "Agent", agent: { ref: "pulumi-agent" } },
            ],
        },
    },
});
```

### Faulty Deployment (The Bug!)

A deployment that's intentionally broken:

```typescript
const faultyDeployment = new k8s.apps.v1.Deployment("podinfo-faulty", {
    metadata: {
        name: "podinfo-faulty",
        namespace: appsNamespace,
    },
    spec: {
        replicas: 1,
        selector: { matchLabels: { app: "podinfo-faulty" } },
        template: {
            spec: {
                containers: [{
                    name: "podinfo",
                    image: "stefanprodan/podinfo:6.7.1",
                    resources: {
                        // BUG: 8Gi memory on 8GB nodes = can't schedule!
                        requests: { memory: "8Gi", cpu: "100m" },
                    },
                }],
            },
        },
    },
});
```

:bug: **The Bug**: This pod requests 8Gi of memory, but our nodes only have 8GB total (with system overhead). It will be stuck in Pending forever!

## Step 3: Configure the Stack

Set your Pulumi access token (needed for the Pulumi Remote MCP):

```bash
pulumi stack init dev
pulumi config set pulumiAccessToken --secret
# Enter your Pulumi access token when prompted
```

You can get a Pulumi access token from:
https://app.pulumi.com/account/tokens

## Step 4: Deploy Everything

```bash
pulumi up
```

This creates:
- Pulumi access token secret
- Pulumi Remote MCP server
- Pulumi Agent
- Orchestrator Agent
- Faulty podinfo deployment

## Step 5: Verify the Faulty Deployment

Check that the pod is stuck in Pending:

```bash
kubectl get pods -n apps -l app=podinfo-faulty
```

Expected output:
```
NAME                              READY   STATUS    RESTARTS   AGE
podinfo-faulty-xxxxxxxxx-xxxxx    0/1     Pending   0          1m
```

Check why it's pending:

```bash
kubectl describe pod -n apps -l app=podinfo-faulty
```

You should see an event like:
```
Events:
  Warning  FailedScheduling  Insufficient memory
```

## Step 6: The Demo - Watch the Magic! :magic_wand:

1. Open the Kagent dashboard
2. Select **orchestrator-agent** from the sidebar
3. Send this message:

```
Investigate why podinfo-faulty is not running and fix it
```

4. Watch as the orchestrator:
   - **Calls k8s-agent**: "What's the status of podinfo-faulty?"
   - **Analyzes the response**: "Pod is Pending due to insufficient memory"
   - **Calls promql-agent**: "What's the available memory on nodes?"
   - **Synthesizes findings**: "The 8Gi request exceeds node capacity"
   - **Calls pulumi-agent**: "Create a PR to fix the memory request"

5. The Pulumi agent will use Pulumi Neo to:
   - Find the Pulumi stack managing this deployment
   - Create a pull request with `memory: "128Mi"` instead of `"8Gi"`

## Understanding the Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                         USER                                      │
│        "Investigate why podinfo-faulty is not running"           │
└─────────────────────────────┬────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR AGENT                            │
│                                                                  │
│  1. "I need to check the pod status first"                      │
│     → Calls k8s-agent                                            │
│                                                                  │
│  2. "The pod is Pending. Let me check resources"                │
│     → Calls promql-agent                                         │
│                                                                  │
│  3. "Found the issue: 8Gi request on 8GB nodes"                 │
│     → Calls pulumi-agent to create fix                           │
│                                                                  │
│  4. "PR created! Memory request changed to 128Mi"               │
└──────────────────────────────────────────────────────────────────┘
```

## Step 7: Review the PR

If you have a GitHub repository connected to Pulumi Neo, check for a new pull request with:

- **Title**: Fix memory request for podinfo-faulty
- **Changes**: `memory: "8Gi"` → `memory: "128Mi"`
- **Description**: Explanation of the issue and fix

## :white_check_mark: Checkpoint

Verify:

- [ ] `podinfo-faulty` pod is in Pending state
- [ ] All agents are visible in the Kagent dashboard
- [ ] Orchestrator can successfully call other agents
- [ ] The investigation produces correct diagnosis
- [ ] (Bonus) A PR was created to fix the issue

## Troubleshooting

### "Agent not found" errors

Make sure the k8s-agent and promql-agent from Chapter 2 are still running:
```bash
kubectl get agents -n kagent
```

### Pulumi MCP connection issues

Verify the secret and MCP server:
```bash
kubectl get secrets -n kagent | grep pulumi
kubectl get remotemcpservers -n kagent
```

### LLM timeout errors

The DigitalOcean GenAI endpoint might be slow. Wait and retry, or check the model config:
```bash
kubectl get modelconfig -n kagent -o yaml
```

## :rocket: Stretch Goals

1. **Add Human-in-the-Loop**: Modify the orchestrator to ask for confirmation before creating PRs
2. **Create a Slack Agent**: Add notifications when issues are detected
3. **Add Custom Tools**: Create an MCP server with tools specific to your infrastructure
4. **Implement Rollback**: Add an agent that can rollback failed deployments

## :books: Learn More

- [Kagent A2A Agents](https://kagent.dev/docs/kagent/examples/a2a-agents)
- [Pulumi Remote MCP](https://www.pulumi.com/docs/pulumi-cloud/ai/)
- [Model Context Protocol Spec](https://spec.modelcontextprotocol.io/)
- [Kubernetes Scheduling](https://kubernetes.io/docs/concepts/scheduling-eviction/)

## :tada: Congratulations!

You've built a multi-agent system that can:
- Diagnose Kubernetes issues autonomously
- Analyze metrics and resource utilization
- Create pull requests to fix infrastructure code

This is just the beginning! The patterns you've learned can be extended to:
- Incident response automation
- Self-healing infrastructure
- AI-assisted operations (AIOps)
- And much more!

---

:arrow_forward: **Next**: [Chapter 5: Housekeeping](05-housekeeping)
