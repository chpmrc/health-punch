import { z } from "zod";
import { ask, type Message } from "~/server/ai/replicate";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const messages: Message[] = [];

export const chatRouter = createTRPCRouter({
  sendMessage: publicProcedure
    .input(z.object({ content: z.string() }))
    .mutation(async ({ input }) => {
      messages.push({ content: input.content, role: "user" });
      const output = await ask(input.content, messages);
      messages.push({ content: output, role: "assistant" });
    }),

  getMessages: publicProcedure.query(async ({ ctx, input }) => {
    return messages;
  }),
});
