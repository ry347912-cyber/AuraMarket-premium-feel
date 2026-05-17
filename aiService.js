const Groq = require("groq-sdk");
const logger = require("../utils/logger");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const SYSTEM_PROMPT = `You are SmartX AI — an intelligent assistant for a modern AI-powered marketplace. 
Help users find products, compare prices, and make smart purchasing decisions. 
Be concise, helpful, and friendly. Always respond in the language the user writes in.`;

// Chat with AI — with retry logic
const chatWithAI = async (message, context = [], retries = 2) => {
  const messages = [
    ...context,
    { role: "user", content: message },
  ];

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const completion = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...messages],
        max_tokens: 512,
        temperature: 0.7,
      });
      return completion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";
    } catch (error) {
      logger.error(`Groq AI attempt ${attempt + 1} failed: ${error.message}`);
      if (attempt === retries) {
        return "AI service is temporarily unavailable. Please try again later.";
      }
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1))); // exponential backoff
    }
  }
};

// Enhance product description using AI
const enhanceProductDescription = async (title, description, category) => {
  try {
    const prompt = `Write a compelling, SEO-optimized product description for:
Title: ${title}
Category: ${category}
Original description: ${description}

Keep it under 150 words. Focus on benefits, not features. Be persuasive.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 200,
      temperature: 0.8,
    });
    return completion.choices[0]?.message?.content || description;
  } catch (error) {
    logger.error(`AI description enhancement failed: ${error.message}`);
    return description; // fallback to original
  }
};

// Generate product tags using AI
const generateProductTags = async (title, description, category) => {
  try {
    const prompt = `Generate 5-8 relevant SEO tags for this product. Return ONLY a JSON array of strings.
Title: ${title}, Category: ${category}, Description: ${description}`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 100,
      temperature: 0.5,
    });

    const content = completion.choices[0]?.message?.content || "[]";
    return JSON.parse(content.match(/\[.*\]/s)?.[0] || "[]");
  } catch (error) {
    logger.error(`AI tag generation failed: ${error.message}`);
    return [];
  }
};

module.exports = { chatWithAI, enhanceProductDescription, generateProductTags };
