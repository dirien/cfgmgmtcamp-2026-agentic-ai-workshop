import * as pulumi from "@pulumi/pulumi";
import * as command from "@pulumi/command";

// Configuration
const config = new pulumi.Config();
const keyName = config.get("keyName") || "cfgmgmtcamp-workshop-2026";
const model = config.get("model") || "anthropic-claude-opus-4.5";

// Get DO token from ESC environment (via pulumiConfig)
const doConfig = new pulumi.Config("digitalocean");
const doToken = doConfig.requireSecret("token");

// DigitalOcean GenAI API configuration
const doApiBaseUrl = "https://api.digitalocean.com/v2/gen-ai";
const inferenceEndpoint = "https://inference.do-ai.run/v1";

// Create Model Access Key via DO API
const createModelAccessKey = new command.local.Command("create-model-access-key", {
    create: pulumi.interpolate`curl -s -X POST "${doApiBaseUrl}/models/api_keys" \
        -H "Authorization: Bearer ${doToken}" \
        -H "Content-Type: application/json" \
        -d '{"name": "${keyName}"}'`,
    // Delete the key on destroy
    delete: pulumi.interpolate`KEY_UUID=$(curl -s -X GET "${doApiBaseUrl}/models/api_keys" \
        -H "Authorization: Bearer ${doToken}" \
        -H "Content-Type: application/json" | \
        jq -r '.api_key_infos[]? | select(.name=="${keyName}") | .uuid // empty') && \
        [ -n "$KEY_UUID" ] && curl -s -X DELETE "${doApiBaseUrl}/models/api_keys/$KEY_UUID" \
        -H "Authorization: Bearer ${doToken}" \
        -H "Content-Type: application/json" || echo "Key not found"`,
});

// Parse the API response to extract the secret key
const apiKeyInfo = createModelAccessKey.stdout.apply(stdout => {
    try {
        const response = JSON.parse(stdout);
        return response.api_key_info;
    } catch (e) {
        throw new Error(`Failed to parse API response: ${stdout}`);
    }
});

// Extract the secret key
const modelAccessKey = apiKeyInfo.apply(info => info?.secret_key || "");
const keyUuid = apiKeyInfo.apply(info => info?.uuid || "");

// ============================================
// Outputs for Workshop Participants
// ============================================

// Primary outputs for kagent configuration
export const llmEndpoint = inferenceEndpoint;
export const llmModel = model;
export const llmApiKey = pulumi.secret(modelAccessKey);

// Additional metadata
export const modelAccessKeyName = keyName;
export const modelAccessKeyUuid = keyUuid;

// OpenAI-compatible configuration (for tools expecting OpenAI format)
export const openaiApiBase = inferenceEndpoint;
export const openaiApiKey = pulumi.secret(modelAccessKey);

// Example curl command for testing (with redacted key)
export const testCommand = pulumi.interpolate`curl -s -X POST "${inferenceEndpoint}/chat/completions" \\
  -H "Authorization: Bearer <YOUR_MODEL_ACCESS_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{"model": "${model}", "messages": [{"role": "user", "content": "Hello!"}], "temperature": 0.7, "max_tokens": 100}'`;

// ESC environment snippet for workshop-workload-env
export const escEnvironmentSnippet = pulumi.interpolate`# Add this to your workshop-workload-env ESC environment:
values:
  llm:
    endpoint: "${inferenceEndpoint}"
    model: "${model}"
    apiKey:
      fn::secret: "<paste-model-access-key-here>"
`;

// Kagent Helm values snippet
export const kagentHelmValuesSnippet = pulumi.interpolate`# Kagent Helm values for using this LLM:
providers:
  default: openAI
  openAI:
    provider: OpenAI
    model: ${model}
    apiKeySecretRef: kagent-openai
    apiKeySecretKey: OPENAI_API_KEY
    config:
      baseUrl: ${inferenceEndpoint}
      maxTokens: 4096  # Required for Anthropic models
`;
