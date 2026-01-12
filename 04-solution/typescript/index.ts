import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

// Configuration
const config = new pulumi.Config();
const pulumiAccessToken = config.requireSecret("pulumiAccessToken");

// Get the current Pulumi organization dynamically
const pulumiOrg = pulumi.getOrganization();

// Namespaces (assumed to exist from previous chapters)
const kagentNamespace = "kagent";
const appsNamespace = "apps";

// Create secret for Pulumi access token and org header
const pulumiSecret = new k8s.core.v1.Secret("pulumi-access-token", {
    metadata: {
        name: "pulumi-access-token",
        namespace: kagentNamespace,
    },
    stringData: {
        authorization: pulumi.interpolate`Bearer ${pulumiAccessToken}`,
        org: pulumiOrg,
    },
});

// RemoteMCPServer for Pulumi
const pulumiMcp = new k8s.apiextensions.CustomResource("pulumi-remote-mcp", {
    apiVersion: "kagent.dev/v1alpha2",
    kind: "RemoteMCPServer",
    metadata: {
        name: "pulumi-remote-mcp",
        namespace: kagentNamespace,
    },
    spec: {
        url: "https://mcp.ai.pulumi.com/mcp",
        description: "Pulumi Remote MCP for infrastructure management and Pulumi Neo",
        protocol: "STREAMABLE_HTTP",
        headersFrom: [
            {
                name: "Authorization",
                valueFrom: {
                    name: "pulumi-access-token",
                    key: "authorization",
                    type: "Secret",
                },
            },
            {
                name: "X-Pulumi-Org",
                valueFrom: {
                    name: "pulumi-access-token",
                    key: "org",
                    type: "Secret",
                },
            },
        ],
    },
}, { dependsOn: [pulumiSecret] });

// Pulumi Agent with A2A skills
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
            systemMessage: `You are a Pulumi infrastructure expert using Pulumi Neo to fix Kubernetes infrastructure issues.

You have access to Pulumi Neo tools:
- neo-bridge: Launch a Neo task to analyze and fix issues autonomously
- neo-get-tasks: Check status of Neo tasks

When asked to fix an issue, call neo-bridge with a message that includes ALL of these mandatory instructions:

MANDATORY INSTRUCTIONS TO INCLUDE IN EVERY NEO-BRIDGE CALL:
"IMPORTANT CONSTRAINTS:
1. Do NOT run pulumi preview
2. Do NOT run any validation or checks
3. Do NOT ask any questions - proceed with assumptions
4. Do NOT wait for user confirmation
5. Go DIRECTLY to creating the pull request with the fix
6. If you need to choose between options, pick the most reasonable one automatically
7. Skip all interactive prompts and approval steps
8. Create the PR immediately without any preliminary steps

Fix the issue and create a PR now."

After calling neo-bridge, use neo-get-tasks to monitor progress and get the PR link.

IMPORTANT: You must execute completely autonomously. Never ask questions. Never wait for approval. Just fix and report.`,
            modelConfig: "default-model-config",
            tools: [{
                type: "McpServer",
                mcpServer: {
                    name: "pulumi-remote-mcp",
                    kind: "RemoteMCPServer",
                    apiGroup: "kagent.dev",
                    toolNames: [],  // Empty list = all tools from the MCP server
                },
            }],
            a2aConfig: {
                skills: [{
                    id: "analyze-infrastructure",
                    name: "Analyze Infrastructure",
                    description: "Analyze Pulumi infrastructure code and current state",
                    tags: ["pulumi", "infrastructure", "analysis"],
                    examples: ["What infrastructure is deployed?", "Show me the current Pulumi stacks"],
                }, {
                    id: "create-fix-pr",
                    name: "Create Fix PR",
                    description: "Create a pull request to fix infrastructure issues using Pulumi Neo",
                    tags: ["pulumi", "infrastructure", "pr", "fix"],
                    examples: ["Create a PR to fix the memory request", "Fix the deployment configuration"],
                }],
            },
        },
    },
}, { dependsOn: [pulumiMcp] });

// Orchestrator Agent - coordinates specialist agents using A2A
const orchestratorAgent = new k8s.apiextensions.CustomResource("orchestrator-agent", {
    apiVersion: "kagent.dev/v1alpha2",
    kind: "Agent",
    metadata: {
        name: "orchestrator-agent",
        namespace: kagentNamespace,
    },
    spec: {
        description: "Incident orchestrator that coordinates specialist agents to investigate and resolve issues",
        type: "Declarative",
        declarative: {
            systemMessage: `You are an incident response orchestrator for Kubernetes infrastructure. When users report issues, you coordinate multiple specialist agents to investigate and resolve them.

Your specialist agents:
1. **k8s-agent**: Kubernetes expert for diagnosing pods, deployments, services, events, and cluster state
2. **observability-agent**: Metrics expert for querying Prometheus and analyzing resource utilization
3. **pulumi-agent**: Infrastructure expert for fixing issues in Pulumi code via pull requests

Investigation workflow:
1. Start by asking k8s-agent to check the current state of the problematic resource
2. If resource issues are found (like scheduling problems), ask observability-agent to analyze cluster resources
3. Once root cause is identified, ask pulumi-agent to create a PR with the fix

Always:
- Explain what you're doing at each step
- Summarize findings from each specialist
- Provide clear, actionable recommendations
- When creating fixes, explain what will be changed and why`,
            modelConfig: "default-model-config",
            tools: [
                // Reference other agents as tools (A2A pattern)
                {
                    type: "Agent",
                    agent: {
                        kind: "Agent",
                        apiGroup: "kagent.dev",
                        name: "k8s-agent",
                    },
                },
                {
                    type: "Agent",
                    agent: {
                        kind: "Agent",
                        apiGroup: "kagent.dev",
                        name: "observability-agent",
                    },
                },
                {
                    type: "Agent",
                    agent: {
                        kind: "Agent",
                        apiGroup: "kagent.dev",
                        name: "pulumi-agent",
                    },
                },
            ],
            a2aConfig: {
                skills: [{
                    id: "incident-response",
                    name: "Incident Response",
                    description: "Investigate and resolve infrastructure incidents by coordinating specialist agents",
                    tags: ["incident", "orchestration", "troubleshooting"],
                    examples: [
                        "Why is my deployment failing?",
                        "Investigate podinfo-faulty and fix it",
                        "My pods are stuck in Pending state",
                        "Debug why the application is not starting",
                    ],
                }],
            },
        },
    },
}, { dependsOn: [pulumiAgent] });

// Deploy faulty workload for demo
// This deployment has a memory request of 8Gi on nodes with only 8GB total RAM
// The pod will be stuck in Pending due to insufficient resources
const faultyDeployment = new k8s.apps.v1.Deployment("podinfo-faulty", {
    metadata: {
        name: "podinfo-faulty",
        namespace: appsNamespace,
        labels: {
            app: "podinfo-faulty",
            purpose: "workshop-demo",
        },
        annotations: {
            "pulumi.com/skipAwait": "true",  // Don't wait for ready - this deployment is intentionally broken
            "workshop.cfgmgmtcamp.org/bug": "Memory request too high for node capacity",
            "workshop.cfgmgmtcamp.org/expected-state": "Pending",
        },
    },
    spec: {
        replicas: 1,
        selector: {
            matchLabels: { app: "podinfo-faulty" },
        },
        template: {
            metadata: {
                labels: { app: "podinfo-faulty" },
            },
            spec: {
                containers: [{
                    name: "podinfo",
                    image: "stefanprodan/podinfo:6.9.4",
                    ports: [{
                        containerPort: 9898,
                        name: "http",
                    }],
                    resources: {
                        // BUG: 8Gi memory request on 8GB nodes = pod cannot be scheduled!
                        requests: {
                            memory: "8Gi",
                            cpu: "100m",
                        },
                        limits: {
                            memory: "8Gi",
                            cpu: "200m",
                        },
                    },
                    readinessProbe: {
                        httpGet: {
                            path: "/readyz",
                            port: "http",
                        },
                    },
                    livenessProbe: {
                        httpGet: {
                            path: "/healthz",
                            port: "http",
                        },
                    },
                }],
            },
        },
    },
}, {
    // Skip waiting for this deployment - it's intentionally broken for the demo
    customTimeouts: { create: "10s", update: "10s" },
});

// Export agent names for reference
export const pulumiAgentName = pulumiAgent.metadata.name;
export const orchestratorAgentName = orchestratorAgent.metadata.name;
export const faultyDeploymentName = faultyDeployment.metadata.name;

// Instructions for the demo
export const demoInstructions = pulumi.interpolate`
Demo Instructions:
==================
1. Verify the faulty deployment is stuck in Pending:
   kubectl get pods -n ${appsNamespace} -l app=podinfo-faulty

2. Open the Kagent dashboard (get IP with: kubectl get svc -n kagent)

3. Select the 'orchestrator-agent' in the chat interface

4. Send this message:
   "Investigate why podinfo-faulty is not running and fix it"

5. Watch the orchestrator:
   - Delegate to k8s-agent to check pod status
   - Delegate to observability-agent to analyze node resources
   - Delegate to pulumi-agent to create a fix PR

6. Click the Neo task link to approve and create the PR

7. The fix should change memory request from 8Gi to 128Mi
`;
