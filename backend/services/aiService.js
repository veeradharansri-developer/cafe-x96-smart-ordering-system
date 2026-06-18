import Anthropic from "@anthropic-ai/sdk";
import { menuData } from "../data/menuData.js";
import dotenv from "dotenv";

dotenv.config();

const apiKey = process.env.ANTHROPIC_API_KEY;
const isApiKeyConfigured = apiKey && apiKey !== "your_anthropic_api_key_here";

let anthropic = null;
if (isApiKeyConfigured) {
  anthropic = new Anthropic({ apiKey });
}

// Intelligent fallback logic for when API key is missing or offline
function generateFallbackResponse(userMessage) {
  const msg = userMessage.toLowerCase();
  
  if (msg.includes("hello") || msg.includes("hi ") || msg.includes("hey")) {
    return "Hello! Welcome to Cafe x96. ☕ I'm Bean, your digital barista. What can I get started for you today? You can ask about our noodles, fried rice, starter dishes, or warm tea and coffee!";
  }
  
  if (msg.includes("coffee") || msg.includes("espresso") || msg.includes("cappuccino") || msg.includes("macchiato")) {
    return "We have fantastic hot coffee! ☕ Try one of these options:\n1. **Hand Brewed Coffee** (₹40.00)\n2. **Hot Chocolate Coffee** (₹45.00)\n3. **Special Gahwa with Kajur** (₹40.00) - served with premium dates\n\nWould you like to add one to your cart?";
  }
  
  if (msg.includes("tea") || msg.includes("matcha") || msg.includes("chai")) {
    return "Our tea selection is classic! 🍵 Here is what we serve:\n1. **Chai** (₹20.00) - strong brewed\n2. **Single Chai** (₹15.00) - small cup\n3. **Lemon Honey Tea** (₹25.00)\n4. **Green Tea** (₹25.00)";
  }

  if (msg.includes("snack") || msg.includes("food") || msg.includes("noodles") || msg.includes("rice") || msg.includes("manchurian") || msg.includes("starter") || msg.includes("slider") || msg.includes("croissant")) {
    return "We have delicious mains and starters! 🍜 Here are some popular options:\n1. **Veg Noodles** (₹60.00)\n2. **Schezwan Noodles** (₹80.00) - spicy\n3. **Veg Fried Rice** (₹60.00)\n4. **Chicken Fried Rice** (₹80.00)\n5. **Veg Manchurian** (₹80.00)\n6. **Chicken 65** (₹130.00)";
  }

  if (msg.includes("veg") || msg.includes("vegetarian")) {
    return "We have plenty of vegetarian options! 🌱 Here is what we recommend:\n1. **Veg Noodles** (₹60.00)\n2. **Veg Fried Rice** (₹60.00)\n3. **Veg Manchurian** (₹80.00)\n\nAll beverages are also 100% vegetarian. Note that Chicken Biryani, Chicken Noodles, Egg Fried Rice, and Egg Specials contain chicken or egg.";
  }

  if (msg.includes("sweet") || msg.includes("dessert") || msg.includes("cake") || msg.includes("brownie")) {
    return "We don't have cakes or desserts on our main menu right now, but we recommend these sweet treats:\n1. **Hot Chocolate Coffee** (₹45.00)\n2. **Maaza** (₹25.00) - mango juice";
  }

  if (msg.includes("combo") || msg.includes("offer") || msg.includes("suggest combo")) {
    return "We don't have preset combos on the digital menu today, but you can easily create your own! Try pairing:\n1. **Veg Noodles** (₹60.00) + **Sprite** (₹15.00)\n2. **Chicken Biryani** (₹130.00) + **Coke** (₹15.00)";
  }

  if (msg.includes("spicy")) {
    return "If you like a bit of spice, we highly recommend:\n1. **Schezwan Noodles** (₹80.00)\n2. **Chicken 65** (₹130.00)\n\nPair either with a cool **Coke** (₹15.00) to balance the heat! 🌶️";
  }

  if (msg.includes("best") || msg.includes("popular") || msg.includes("recommend") || msg.includes("biryani")) {
    return "Here are our top recommendations for the ultimate Cafe x96 experience:\n1. **Chicken Biryani** (₹130.00) 🍛\n2. **Veg Noodles** (₹60.00) 🍜\n3. **Special Gahwa with Kajur** (₹40.00) 🫖";
  }

  return "I'd love to help you with that! At Cafe x96, we serve wok-tossed noodles, fried rice, Manchurian starters, egg specials, and premium hot & cold beverages. Ask me about ingredients, veg options, or recommendations! ☕✨";
}

export async function askClaude(messageHistory, currentMenu = []) {
  const menuToUse = currentMenu.length > 0 ? currentMenu : menuData;

  // Generate a string listing of our menu dynamically for AI context injection
  const menuContext = menuToUse
    .map(
      (item) =>
        `- [${item.category}] ${item.name} (₹${item.price.toFixed(2)}) - ${item.isVeg ? "Veg" : "Non-Veg"}. ${item.isOutOfStock ? "CURRENTLY OUT OF STOCK (DO NOT RECOMMEND)" : "In Stock"}. Rating: ${item.rating}. Description: ${item.description}`
    )
    .join("\n");

  const systemPrompt = `You are "Bean", the friendly, premium, and sophisticated AI Chatbot Assistant for "Cafe x96".
Your goal is to guide customers through our menu, recommend drinks/combos, answer diet questions, and chat in a warm, welcoming cafe host style.

Here is the exact Cafe x96 Menu:
${menuContext}

Rules:
1. ONLY recommend and discuss items that are on the Cafe x96 menu. If they ask for something not on the menu, politely say we don't serve it, but offer a close match from our menu.
2. If they ask for recommendations:
   - Strong Coffee: Suggest Hand Brewed Coffee or Black Coffee.
   - Sweet Coffee: Suggest Hot Chocolate Coffee.
   - Cool Drink: Suggest Coke 200ml or Sprite 200ml.
   - Spicy Food: Suggest Schezwan Noodles or Chicken 65.
   - Tea/Chai: Suggest Chai or Green Tea.
3. DO NOT recommend any item that is marked CURRENTLY OUT OF STOCK. If a customer specifically asks for an out-of-stock item, politely inform them it is currently sold out and suggest an available alternative item from the same category!
4. When listing recommendations or answering questions about options, ALWAYS present the items in a structured numbered list (ordered form) instead of inline sentences. Example:
   1. **Item Name** (₹Price) - Description
5. Keep responses brief, warm, and use cafe-themed emojis (☕, 🍜, 🍚, 🌶️, ✨).`;

  if (!isApiKeyConfigured) {
    // Wait briefly to simulate API network call typing state
    await new Promise((resolve) => setTimeout(resolve, 800));
    const lastUserMessage = messageHistory[messageHistory.length - 1]?.content || "";
    return generateFallbackResponse(lastUserMessage);
  }

  try {
    let formattedMessages = messageHistory.map((m) => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.content,
    }));

    // Anthropic API requires the first message in the message list to be from the 'user'
    if (formattedMessages.length > 0 && formattedMessages[0].role === "assistant") {
      formattedMessages = formattedMessages.slice(1);
    }

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 250,
      temperature: 0.5,
      system: systemPrompt,
      messages: formattedMessages,
    });

    return response.content[0].text;
  } catch (error) {
    console.error("Error communicating with Anthropic API:", error);
    // Return friendly local fallback if API error occurs (e.g. rate limit, invalid key)
    const lastUserMessage = messageHistory[messageHistory.length - 1]?.content || "";
    return `${generateFallbackResponse(lastUserMessage)} *(Note: Running in offline assistance mode)*`;
  }
}

