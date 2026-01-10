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
        // Grafana configuration
        grafana: {
            enabled: true,
            adminPassword: grafanaAdminPassword,
            service: {
                type: "LoadBalancer",
                port: 80,
            },
            "grafana.ini": {
                server: {
                    root_url: "%(protocol)s://%(domain)s/",
                },
            },
        },
        // Prometheus configuration
        prometheus: {
            prometheusSpec: {
                retention: "24h",
                resources: {
                    requests: {
                        memory: "512Mi",
                        cpu: "250m",
                    },
                    limits: {
                        memory: "1Gi",
                        cpu: "500m",
                    },
                },
                // Enable service monitor selection from all namespaces
                serviceMonitorSelectorNilUsesHelmValues: false,
                podMonitorSelectorNilUsesHelmValues: false,
            },
        },
        // Alertmanager configuration (minimal for workshop)
        alertmanager: {
            enabled: true,
            alertmanagerSpec: {
                resources: {
                    requests: {
                        memory: "64Mi",
                        cpu: "50m",
                    },
                    limits: {
                        memory: "128Mi",
                        cpu: "100m",
                    },
                },
            },
        },
        // Disable components not needed for workshop
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
        resources: {
            requests: {
                memory: "64Mi",
                cpu: "100m",
            },
            limits: {
                memory: "128Mi",
                cpu: "200m",
            },
        },
        service: {
            type: "ClusterIP",
        },
        serviceMonitor: {
            enabled: true,
            interval: "15s",
        },
    },
}, { dependsOn: [appsNs, prometheusStack] });

// Export namespaces
export const monitoringNamespace = monitoringNs.metadata.name;
export const appsNamespace = appsNs.metadata.name;

// Export Helm release statuses
export const metricsServerStatus = metricsServer.status;
export const prometheusStackStatus = prometheusStack.status;
export const podinfoStatus = podinfo.status;

// Note: Get Grafana LoadBalancer IP after deployment with:
// kubectl get svc -n monitoring kube-prometheus-stack-grafana
// Default credentials: admin / workshop-admin
