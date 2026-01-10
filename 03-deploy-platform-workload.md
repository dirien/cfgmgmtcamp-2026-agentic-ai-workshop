---
title: "Chapter 3: Deploy Platform Workload"
---

# Chapter 3: Deploy Platform Workload

In this chapter, you'll deploy the monitoring stack that our AI agents will use to analyze the cluster. This includes Prometheus for metrics collection, Grafana for visualization, and a sample application (Podinfo) for testing.

## :dart: Goals

- Deploy Metrics Server for resource metrics
- Deploy kube-prometheus-stack (Prometheus + Grafana + Alertmanager)
- Deploy Podinfo as a sample application with metrics
- Enable the PromQL agent to query metrics

## :clock1: Estimated Time: 30 minutes

---

## Why Do We Need Monitoring?

Our AI agents need data to make informed decisions:

- **k8s-agent** queries the Kubernetes API for pod status, events, and configurations
- **promql-agent** queries Prometheus for metrics like CPU, memory, and application performance

Without Prometheus, the promql-agent has no data source to query!

## Step 1: Navigate to the Solution Directory

```bash
cd 03-solution/typescript
npm install
```

## Step 2: Review the Code

Here's the Pulumi program that deploys the monitoring stack:

```typescript
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

// Configuration
const config = new pulumi.Config();
const grafanaAdminPassword = config.getSecret("grafanaAdminPassword") || pulumi.secret("workshop-admin");

// Create monitoring namespace
const monitoringNs = new k8s.core.v1.Namespace("monitoring", {
    metadata: { name: "monitoring" },
});

// Create apps namespace for sample application
const appsNs = new k8s.core.v1.Namespace("apps", {
    metadata: { name: "apps" },
});

// Install Metrics Server (required for kubectl top and HPA)
const metricsServer = new k8s.helm.v3.Release("metrics-server", {
    chart: "metrics-server",
    repositoryOpts: {
        repo: "https://kubernetes-sigs.github.io/metrics-server/",
    },
    namespace: "kube-system",
    version: "3.12.2",
    values: {
        args: [
            "--kubelet-insecure-tls",
        ],
    },
});

// Install kube-prometheus-stack (Prometheus, Grafana, Alertmanager)
const prometheusStack = new k8s.helm.v3.Release("kube-prometheus-stack", {
    chart: "kube-prometheus-stack",
    repositoryOpts: {
        repo: "https://prometheus-community.github.io/helm-charts",
    },
    namespace: monitoringNs.metadata.name,
    version: "66.3.1",
    values: {
        grafana: {
            enabled: true,
            adminPassword: grafanaAdminPassword,
            service: {
                type: "LoadBalancer",
                port: 80,
            },
        },
        prometheus: {
            prometheusSpec: {
                retention: "24h",
                serviceMonitorSelectorNilUsesHelmValues: false,
                podMonitorSelectorNilUsesHelmValues: false,
            },
        },
        alertmanager: { enabled: true },
        // Disable components not available in managed K8s
        kubeEtcd: { enabled: false },
        kubeControllerManager: { enabled: false },
        kubeScheduler: { enabled: false },
        kubeProxy: { enabled: false },
    },
}, { dependsOn: [monitoringNs] });

// Deploy Podinfo as sample application
const podinfo = new k8s.helm.v3.Release("podinfo", {
    chart: "podinfo",
    repositoryOpts: {
        repo: "https://stefanprodan.github.io/podinfo",
    },
    namespace: appsNs.metadata.name,
    version: "6.7.1",
    values: {
        replicaCount: 2,
        serviceMonitor: {
            enabled: true,
            interval: "15s",
        },
    },
}, { dependsOn: [appsNs, prometheusStack] });

// Exports
export const monitoringNamespace = monitoringNs.metadata.name;
export const appsNamespace = appsNs.metadata.name;
```

<details>
<summary>:page_facing_up: Click to see YAML version</summary>

```yaml
name: 03-platform-workload
runtime: yaml
description: Deploy monitoring stack and sample application

config:
  grafanaAdminPassword:
    type: string
    secret: true
    default: workshop-admin

resources:
  monitoring-ns:
    type: kubernetes:core/v1:Namespace
    properties:
      metadata:
        name: monitoring

  apps-ns:
    type: kubernetes:core/v1:Namespace
    properties:
      metadata:
        name: apps

  metrics-server:
    type: kubernetes:helm.sh/v3:Release
    properties:
      chart: metrics-server
      repositoryOpts:
        repo: https://kubernetes-sigs.github.io/metrics-server/
      namespace: kube-system
      version: "3.12.2"
      values:
        args:
          - --kubelet-insecure-tls

  kube-prometheus-stack:
    type: kubernetes:helm.sh/v3:Release
    properties:
      chart: kube-prometheus-stack
      repositoryOpts:
        repo: https://prometheus-community.github.io/helm-charts
      namespace: ${monitoring-ns.metadata.name}
      version: "66.3.1"
      values:
        grafana:
          enabled: true
          adminPassword: ${grafanaAdminPassword}
          service:
            type: LoadBalancer
            port: 80
        prometheus:
          prometheusSpec:
            retention: 24h
            serviceMonitorSelectorNilUsesHelmValues: false
            podMonitorSelectorNilUsesHelmValues: false
        alertmanager:
          enabled: true
        kubeEtcd:
          enabled: false
        kubeControllerManager:
          enabled: false
        kubeScheduler:
          enabled: false
        kubeProxy:
          enabled: false
    options:
      dependsOn:
        - ${monitoring-ns}

  podinfo:
    type: kubernetes:helm.sh/v3:Release
    properties:
      chart: podinfo
      repositoryOpts:
        repo: https://stefanprodan.github.io/podinfo
      namespace: ${apps-ns.metadata.name}
      version: "6.7.1"
      values:
        replicaCount: 2
        serviceMonitor:
          enabled: true
          interval: 15s
    options:
      dependsOn:
        - ${apps-ns}
        - ${kube-prometheus-stack}

outputs:
  monitoringNamespace: ${monitoring-ns.metadata.name}
  appsNamespace: ${apps-ns.metadata.name}
```
</details>

## Step 3: Deploy the Stack

Initialize a stack and deploy:

```bash
pulumi stack init dev
pulumi up
```

:warning: This deployment takes 3-5 minutes as it installs several Helm charts.

## Step 4: Verify the Deployment

Check that all pods are running:

```bash
# Check monitoring stack
kubectl get pods -n monitoring

# Check metrics server
kubectl get pods -n kube-system | grep metrics

# Check sample application
kubectl get pods -n apps
```

## Step 5: Access Grafana

Get the Grafana LoadBalancer IP:

```bash
GRAFANA_IP=$(kubectl get svc -n monitoring kube-prometheus-stack-grafana -o jsonpath='{.status.loadBalancer.ingress[0].ip}')
echo "Grafana URL: http://$GRAFANA_IP"
```

Login credentials:
- **Username**: admin
- **Password**: workshop-admin (or your configured password)

## Step 6: Test Metrics Server

Verify that `kubectl top` works:

```bash
# View node resource usage
kubectl top nodes

# View pod resource usage
kubectl top pods -n apps
```

## Step 7: Test the PromQL Agent

Now that Prometheus is running, the promql-agent can query metrics!

1. Open the Kagent dashboard
2. Select **promql-agent**
3. Try these queries:
   - "What is the CPU usage of pods in the apps namespace?"
   - "Show me memory usage for the podinfo deployment"
   - "Are there any pods with high CPU throttling?"

## Step 8: Explore Prometheus

Forward the Prometheus port locally:

```bash
kubectl port-forward -n monitoring svc/kube-prometheus-stack-prometheus 9090:9090
```

Open http://localhost:9090 to access the Prometheus UI and try queries like:

```promql
# Container CPU usage
rate(container_cpu_usage_seconds_total{namespace="apps"}[5m])

# Container memory usage
container_memory_working_set_bytes{namespace="apps"}

# Podinfo HTTP requests
rate(http_requests_total{app="podinfo"}[5m])
```

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                   kube-system                           │
│  ┌──────────────┐                                       │
│  │Metrics Server│ → kubectl top, HPA                    │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                   monitoring                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  Prometheus  │  │   Grafana    │  │ Alertmanager │  │
│  │   (metrics)  │  │   (dashboards) │  │   (alerts)   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────┐
│                      apps                               │
│  ┌──────────────┐                                       │
│  │   Podinfo    │ → sample app with ServiceMonitor     │
│  │  (2 replicas)│                                       │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
```

## :white_check_mark: Checkpoint

Before proceeding, verify:

- [ ] All pods in `monitoring` namespace are Running
- [ ] Metrics Server is running in `kube-system`
- [ ] Podinfo is running with 2 replicas in `apps`
- [ ] `kubectl top nodes` shows resource usage
- [ ] promql-agent can answer questions about metrics

## :rocket: Stretch Goals

1. **Create a Custom Dashboard**: Import or create a Grafana dashboard for Podinfo metrics
2. **Test Alerting**: Check the Alertmanager UI for any firing alerts
3. **Explore ServiceMonitor**: Run `kubectl get servicemonitor -A` to see how Prometheus discovers metrics

## :books: Learn More

- [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)
- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Metrics Server](https://github.com/kubernetes-sigs/metrics-server)

---

:arrow_forward: **Next**: [Chapter 4: Multi-Agent Troubleshooting](04-multi-agent-troubleshooting)
