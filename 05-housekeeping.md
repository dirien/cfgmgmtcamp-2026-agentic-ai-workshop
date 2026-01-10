---
title: "Chapter 5: Housekeeping"
---

# Chapter 5: Housekeeping

Time to clean up! :broom: In this chapter, we'll destroy all the resources we created to avoid unnecessary charges on your DigitalOcean account.

## :dart: Goals

- Destroy all Pulumi stacks in reverse order
- Verify all resources are cleaned up
- Save any work you want to keep

## :clock1: Estimated Time: 15 minutes

---

## Before You Begin

:warning: **Warning**: This will permanently delete all resources. Make sure to:

1. Save any work or configurations you want to keep
2. Export any Grafana dashboards you created
3. Note any custom agents you'd like to recreate later

## Step 1: Destroy Chapter 4 Resources

The multi-agent setup and faulty deployment:

```bash
cd 04-solution/typescript
pulumi destroy --yes
pulumi stack rm dev --yes
```

## Step 2: Destroy Chapter 3 Resources

The monitoring stack and sample application:

```bash
cd ../03-solution/typescript
pulumi destroy --yes
pulumi stack rm dev --yes
```

## Step 3: Destroy Chapter 2 Resources

Kagent, kmcp, and all AI agents:

```bash
cd ../02-solution/typescript
pulumi destroy --yes
pulumi stack rm dev --yes
```

## Step 4: Destroy Chapter 1 Resources

The DigitalOcean Kubernetes cluster:

```bash
cd ../01-solution/typescript
pulumi destroy --yes
pulumi stack rm dev --yes
```

:warning: This step takes 5-10 minutes as DigitalOcean deprovisions the cluster.

## Step 5: Verify Cleanup

### Check Pulumi Cloud

Visit [app.pulumi.com](https://app.pulumi.com) and verify that all stacks are removed.

### Check DigitalOcean Console

Visit the [DigitalOcean Console](https://cloud.digitalocean.com/kubernetes) and verify:

- [ ] No Kubernetes clusters named `cfgmgmtcamp-2026`
- [ ] No orphaned Load Balancers
- [ ] No orphaned Volumes

### Check for Orphaned Resources

If you see any orphaned resources in DigitalOcean, you can delete them manually:

```bash
# List all Kubernetes clusters
doctl kubernetes cluster list

# Delete a cluster manually if needed
doctl kubernetes cluster delete <cluster-id>

# List all Load Balancers
doctl compute load-balancer list

# List all Volumes
doctl compute volume list
```

## One-Command Cleanup (Alternative)

If you prefer to clean everything at once, create this script:

```bash
#!/bin/bash
# cleanup.sh - Run from the havana directory

set -e

echo "Destroying Chapter 4..."
cd 04-solution/typescript && pulumi destroy --yes && pulumi stack rm dev --yes --force 2>/dev/null || true
cd ../..

echo "Destroying Chapter 3..."
cd 03-solution/typescript && pulumi destroy --yes && pulumi stack rm dev --yes --force 2>/dev/null || true
cd ../..

echo "Destroying Chapter 2..."
cd 02-solution/typescript && pulumi destroy --yes && pulumi stack rm dev --yes --force 2>/dev/null || true
cd ../..

echo "Destroying Chapter 1..."
cd 01-solution/typescript && pulumi destroy --yes && pulumi stack rm dev --yes --force 2>/dev/null || true
cd ../..

echo "Cleanup complete!"
```

Run it:
```bash
chmod +x cleanup.sh
./cleanup.sh
```

## Clean Up Local Files

Remove generated files:

```bash
# Remove kubeconfig files
rm -f 01-solution/typescript/kubeconfig.yaml

# Remove node_modules (optional, to save space)
rm -rf */*/node_modules
```

## :white_check_mark: Final Checklist

Before leaving, verify:

- [ ] All Pulumi stacks destroyed
- [ ] No DigitalOcean resources remaining
- [ ] No unexpected charges on your account
- [ ] Any important work saved/exported

## Thank You! :heart:

Thank you for attending the **Building AI-Assisted Operations: Agentic AI Workshop**!

We hope you learned:
- How to deploy Kubernetes-native AI agents with Kagent
- How to use MCP for connecting agents to external tools
- How to create multi-agent systems that coordinate autonomously
- How to use Pulumi for infrastructure as code

## Stay Connected

- :star: Star this repo: [github.com/dirien/cfgmgmtcamp-2026-agentic-ai-workshop](https://github.com/dirien/cfgmgmtcamp-2026-agentic-ai-workshop)
- :speech_balloon: Join the Pulumi Community: [slack.pulumi.com](https://slack.pulumi.com/)
- :bird: Follow us on Twitter: [@PulumiCorp](https://twitter.com/PulumiCorp)
- :books: Learn more: [pulumi.com/learn](https://www.pulumi.com/learn/)

## Feedback

We'd love to hear your feedback! Please fill out the workshop survey (link provided by instructors).

---

:wave: See you at the next CfgMgmtCamp!
