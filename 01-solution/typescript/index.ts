import * as digitalocean from "@pulumi/digitalocean";
import * as pulumi from "@pulumi/pulumi";

// Configuration
const config = new pulumi.Config();
const nodeCount = config.getNumber("nodeCount") || 2;
const nodeSize = config.get("nodeSize") || "s-4vcpu-8gb";
const region = config.get("region") || "fra1";
const k8sVersion = config.get("k8sVersion") || "1.34";

// Get the latest available Kubernetes version that matches our prefix
const k8sVersions = digitalocean.getKubernetesVersionsOutput({
    versionPrefix: k8sVersion,
});

// Create a DigitalOcean Kubernetes cluster
const cluster = new digitalocean.KubernetesCluster("workshop-cluster", {
    name: "cfgmgmtcamp-2026",
    region: region,
    version: k8sVersions.latestVersion,
    nodePool: {
        name: "default-pool",
        size: nodeSize,
        nodeCount: nodeCount,
        labels: {
            "workshop": "cfgmgmtcamp-2026",
            "purpose": "agentic-ai",
        },
    },
    tags: ["cfgmgmtcamp", "workshop", "2026"],
});

// Export cluster details
export const clusterName = cluster.name;
export const clusterEndpoint = cluster.endpoint;
export const clusterUrn = cluster.clusterUrn;

// Export kubeconfig for kubectl access
export const kubeconfig = cluster.kubeConfigs[0].rawConfig;
