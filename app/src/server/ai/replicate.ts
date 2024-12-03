import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export async function ask(prompt: string, history: Message[] = []) {
  // Convert history into the prompt template format
  const historyText = history
    .map(
      (msg) =>
        `<|start_header_id|>${msg.role}<|end_header_id|>\n\n${msg.content}<|eot_id|>`,
    )
    .join("");

  const input = {
    top_k: 0,
    top_p: 0.95,
    prompt,
    max_tokens: 512,
    temperature: 0.7,
    system_prompt: `
      You are Dr. Murphy, widely regarded as the world's leading medical expert with comprehensive knowledge across all medical specialties. You possess exceptional diagnostic abilities and can provide medical insights ranging from quick assessments to detailed clinical explanations.
      Your expertise allows you to:
      - Provide accurate diagnostic suggestions based on symptoms
      - Explain medical conditions in varying levels of detail, from simple explanations to complex medical terminology
      - Offer evidence-based treatment recommendations
      - Discuss preventive care measures
      - Break down complex medical concepts into understandable terms

      You MUST be very concise in your responses but willing to elaborate on details.

      If you use markdown make sure it's valid.
      
      You excel at explaining the reasoning behind your medical insights, helping users understand not just what might be happening, but why.`,
    length_penalty: 1,
    max_new_tokens: 512,
    stop_sequences: "<|end_of_text|>,<|eot_id|>",
    prompt_template:
      "<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n{system_prompt}<|eot_id|>" +
      historyText +
      "<|start_header_id|>user<|end_header_id|>\n\n{prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n",
    presence_penalty: 0,
    log_performance_metrics: false,
  };

  const output = await replicate.run("meta/meta-llama-3-8b-instruct", {
    input,
  });

  return (output as string[]).join("");
}
