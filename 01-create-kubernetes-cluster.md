---
title: "Chapter 1: Create Kubernetes Cluster"
---

# Chapter 1: Create Kubernetes Cluster

In this chapter, you'll provision a DigitalOcean Kubernetes (DOKS) cluster using Pulumi. This cluster will host our AI agents and the workloads they'll manage.

## :dart: Goals

- Configure Pulumi ESC to access shared workshop credentials
- Provision a 2-node DOKS cluster in Frankfurt (fra1)
- Export the kubeconfig for kubectl access
- Verify cluster connectivity

## :clock1: Estimated Time: 30 minutes

---

## Step 1: Create and Configure Pulumi ESC Environment

:key: **Important**: For this workshop, everyone will use a DigitalOcean token managed via [Pulumi ESC](https://www.pulumi.com/docs/esc/) (Environments, Secrets, and Configuration). This ensures secure credential management without exposing tokens in code or environment variables.

### Create the ESC Environment

1. Navigate to [Pulumi Cloud](https://app.pulumi.com) and select your organization

2. Go to **Environments** in the left sidebar and click **Create environment**

3. Name your environment `workshop-infra-env` and click **Create**

4. In the environment editor, add the following YAML configuration:

```yaml
values:
  # DigitalOcean API Token
  digitalocean:
    token:
      fn::secret: "dop_v1_your_token_here"

  # Pulumi configuration values (available in Pulumi programs)
  pulumiConfig:
    digitalocean:token: ${digitalocean.token}

  # Environment variables (available in shell)
  environmentVariables:
    DIGITALOCEAN_TOKEN: ${digitalocean.token}
```

5. Replace `dop_v1_your_token_here` with your actual DigitalOcean API token
   - Get your token from the [DigitalOcean API dashboard](https://cloud.digitalocean.com/account/api/tokens)
   - The `fn::secret` function encrypts the value so it's never stored in plain text

6. Click **Save** to save the environment

### Use the ESC Environment in Your Pulumi Stack

Create or edit `Pulumi.dev.yaml` in the `01-solution/typescript` directory to import the ESC environment:

```yaml
environment:
  - <your-org>/workshop-infra-env
```

Replace `<your-org>` with your Pulumi organization name.

This imports the infrastructure ESC environment which provides:
- `DIGITALOCEAN_TOKEN` - API token for creating DigitalOcean resources (automatically set as environment variable)
- `digitalocean:token` - Same token available as Pulumi config for the DigitalOcean provider

### Verify the ESC Environment

To verify the ESC environment is working, run:

```bash
esc open <your-org>/workshop-infra-env
```

You should see output similar to:

```json
{
  "digitalocean": {
    "token": "[secret]"
  },
  "environmentVariables": {
    "DIGITALOCEAN_TOKEN": "[secret]"
  },
  "pulumiConfig": {
    "digitalocean:token": "[secret]"
  }
}
```

The `[secret]` values indicate your token is securely encrypted.

## Step 2: Create the Project Directory

Navigate to the solution directory and install dependencies:

```bash
cd 01-solution/typescript
npm install
```

## Step 3: Review the Code

Let's look at the Pulumi program that provisions our cluster:

```typescript
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
```

<details>
<summary>:page_facing_up: Click to see YAML version</summary>

```yaml
name: 01-k8s-cluster
runtime: yaml
description: DigitalOcean Kubernetes cluster for CfgMgmtCamp 2026 workshop

config:
  nodeCount:
    type: integer
    default: 2
  nodeSize:
    type: string
    default: s-4vcpu-8gb
  region:
    type: string
    default: fra1
  k8sVersion:
    type: string
    default: "1.34"

variables:
  k8sVersions:
    fn::invoke:
      function: digitalocean:getKubernetesVersions
      arguments:
        versionPrefix: ${k8sVersion}

resources:
  workshop-cluster:
    type: digitalocean:KubernetesCluster
    properties:
      name: cfgmgmtcamp-2026
      region: ${region}
      version: ${k8sVersions.latestVersion}
      nodePool:
        name: default-pool
        size: ${nodeSize}
        nodeCount: ${nodeCount}
        labels:
          workshop: cfgmgmtcamp-2026
          purpose: agentic-ai
      tags:
        - cfgmgmtcamp
        - workshop
        - "2026"

outputs:
  clusterName: ${workshop-cluster.name}
  clusterEndpoint: ${workshop-cluster.endpoint}
  clusterUrn: ${workshop-cluster.clusterUrn}
  kubeconfig: ${workshop-cluster.kubeConfigs[0].rawConfig}
```
</details>

## Step 4: Initialize the Stack

Create a new Pulumi stack for your deployment:

```bash
pulumi stack init dev
```

## Step 5: Deploy the Cluster

Run `pulumi up` to create the cluster:

```bash
pulumi up
```

Review the preview and select **yes** to proceed. The cluster creation takes approximately 5-10 minutes.

:coffee: This is a good time for a coffee break!

## Step 6: Configure kubectl

Once the cluster is ready, save the kubeconfig:

```bash
pulumi stack output kubeconfig --show-secrets > kubeconfig.yaml
export KUBECONFIG=$(pwd)/kubeconfig.yaml
```

## Step 7: Verify the Cluster

Check that the cluster is accessible:

```bash
kubectl get nodes
```

You should see output similar to:

```
NAME                       STATUS   ROLES    AGE   VERSION
default-pool-xxxxx-xxxxx   Ready    <none>   5m    v1.34.x
default-pool-xxxxx-xxxxx   Ready    <none>   5m    v1.34.x
```

Verify the cluster information:

```bash
kubectl cluster-info
```

## :white_check_mark: Checkpoint

Before proceeding, verify:

- [ ] `pulumi up` completed successfully
- [ ] `kubectl get nodes` shows 2 Ready nodes
- [ ] `kubectl cluster-info` shows the cluster endpoint

## :rocket: Stretch Goals

If you finish early, try these challenges:

1. **Add a second node pool**: Create a separate pool for workloads with different resource requirements
2. **Enable auto-scaling**: Configure the cluster autoscaler to scale between 2-4 nodes
3. **Add custom tags**: Add your name as a tag to identify your cluster

## :books: Learn More

- [DigitalOcean Kubernetes Documentation](https://docs.digitalocean.com/products/kubernetes/)
- [Pulumi DigitalOcean Provider](https://www.pulumi.com/registry/packages/digitalocean/)
- [Kubernetes Cluster Management](https://kubernetes.io/docs/tasks/administer-cluster/)

---

:arrow_forward: **Next**: [Chapter 2: Deploy Kagent & MCP](02-deploy-kagent-mcp)
