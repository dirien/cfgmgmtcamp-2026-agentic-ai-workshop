import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

// Configuration
const config = new pulumi.Config();
const llmApiKey = config.requireSecret("llmApiKey");
const llmEndpoint = config.get("llmEndpoint") || "https://inference.do-ai.run/v1";
const llmModel = config.get("llmModel") || "llama3.3-70b-instruct";

// Create kagent namespace
const kagentNs = new k8s.core.v1.Namespace("kagent", {
    metadata: { name: "kagent" },
});

// Create secret for LLM API key (must exist before kagent helm release)
// The secret name must match apiKeySecretRef and key must match apiKeySecretKey
const llmSecret = new k8s.core.v1.Secret("kagent-openai", {
    metadata: {
        name: "kagent-openai",
        namespace: kagentNs.metadata.name,
    },
    stringData: {
        "OPENAI_API_KEY": llmApiKey,
    },
}, { dependsOn: [kagentNs] });

// Install Kagent CRDs (includes kmcp-crds as dependency)
const kagentCrds = new k8s.helm.v3.Release("kagent-crds", {
    chart: "oci://ghcr.io/kagent-dev/kagent/helm/kagent-crds",
    namespace: kagentNs.metadata.name,
    version: "0.7.8",
    values: {
        kmcp: {
            enabled: true,
        },
    },
}, { dependsOn: [kagentNs] });

// Install Kagent with DigitalOcean GenAI as OpenAI-compatible provider
// Note: kagent chart includes kmcp as a dependency when kmcp.enabled is true
const kagent = new k8s.helm.v3.Release("kagent", {
    chart: "oci://ghcr.io/kagent-dev/kagent/helm/kagent",
    namespace: kagentNs.metadata.name,
    version: "0.7.8",
    values: {
        // Use consistent naming (agents expect "kagent-controller" service name)
        fullnameOverride: "kagent",
        // Configure the model provider
        providers: {
            default: "openAI",
            openAI: {
                provider: "OpenAI",
                model: llmModel,
                apiKeySecretRef: "kagent-openai",
                apiKeySecretKey: "OPENAI_API_KEY",
                config: {
                    baseUrl: llmEndpoint,
                    maxTokens: 4096,  // Required for Anthropic models via OpenAI-compatible endpoints
                },
            },
        },
        // UI configuration
        ui: {
            enabled: true,
            service: {
                type: "LoadBalancer",
                ports: {
                    port: 8080,
                },
            },
        },
        // Enable kmcp (included as subchart dependency)
        kmcp: {
            enabled: true,
        },
        // Enable built-in agents
        agents: {
            "k8s-agent": { enabled: true },
            "promql-agent": { enabled: true },
            "observability-agent": { enabled: true },
        },
        // Configure grafana-mcp with consistent naming
        "grafana-mcp": {
            fullnameOverride: "kagent-grafana-mcp",
            grafana: {
                url: "http://kube-prometheus-stack-grafana.monitoring:80",
            },
        },
    },
}, { dependsOn: [kagentCrds, llmSecret] });

// Export the namespace
export const namespace = kagentNs.metadata.name;

// Export status of Helm releases
export const kagentVersion = "0.7.8";
export const kagentReleaseName = kagent.name;

// Note: Get the LoadBalancer IP after deployment with:
// kubectl get svc -n kagent kagent-ui -o jsonpath='{.status.loadBalancer.ingress[0].ip}'
