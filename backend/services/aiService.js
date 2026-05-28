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
    return "Hello! Welcome to Cafe x96. ☕ I'm Bean, your digital barista. What can I get started for you today? You can ask about our menu, combos, or vegetarian options!";
  }
  
  if (msg.includes("coffee") || msg.includes("espresso") || msg.includes("cappuccino") || msg.includes("macchiato")) {
    return "We have wonderful coffees! ☕ Our signature is the **Signature Espresso Gold** ($4.50) topped with real edible gold leaf. If you like it sweet, I highly recommend the **Caramel Macchiato Crystal** ($5.20). Would you like to add one to your cart?";
  }
  
  if (msg.includes("tea") || msg.includes("matcha") || msg.includes("chai")) {
    return "Our tea selection is premium! 🍵 Try our ceremonial **Royal Matcha Latte** ($4.80) whisked with oat milk, or our warming **Cardamom Masala Chai** ($3.50). For a refreshing cold drink, the **Rose Hibiscus Cold Tea** ($4.20) is perfect!";
  }

  if (msg.includes("snack") || msg.includes("food") || msg.includes("croissant") || msg.includes("toast") || msg.includes("paneer") || msg.includes("panini")) {
    return "For a quick bite, we have our flaky **Truffle Cheese Croissant** ($5.50) or the **Avocado Sourdough Toast** ($7.20). 🥐 Looking for something spicy? The **Spicy Peri-Peri Paneer Slider** ($6.50) has a delicious kick!";
  }

  if (msg.includes("veg") || msg.includes("vegetarian")) {
    return "Almost everything on our menu is vegetarian-friendly! 🌱 All our coffees, teas, and desserts are vegetarian. For snacks, the **Truffle Cheese Croissant**, **Avocado Sourdough Toast**, and **Spicy Peri-Peri Paneer Slider** are vegetarian. Only our **Smoked Chicken Pesto Panini** contains chicken!";
  }

  if (msg.includes("sweet") || msg.includes("dessert") || msg.includes("cake") || msg.includes("brownie") || msg.includes("tart")) {
    return "Indulge your sweet tooth! 🍰 Our popular **Saffron Tres Leches Cake** ($6.80) is soaked in saffron cream and is absolutely divine. We also have a rich **Double Chocolate Fudge Brownie** ($4.80) served with vanilla ice cream!";
  }

  if (msg.includes("combo") || msg.includes("offer") || msg.includes("suggest combo")) {
    return "We have three premium combos! 🎁 \n1. **Premium Sunrise Combo** ($11.00): Espresso + Truffle Croissant (Save money!)\n2. **Classic High Tea Combo** ($9.50): Masala Chai + Avocado Toast\n3. **Decadent Duo Combo** ($10.00): Caramel Macchiato + Double Chocolate Brownie. Which one sounds best?";
  }

  if (msg.includes("spicy")) {
    return "If you like a bit of spice, you must try the **Spicy Peri-Peri Paneer Slider** ($6.50)! 🌱 It features grilled paneer coated in a fiery peri-peri glaze. Pair it with a cool **Rose Hibiscus Cold Tea** to balance the heat!";
  }

  if (msg.includes("best") || msg.includes("popular") || msg.includes("recommend")) {
    return "Our top recommendations are the **Signature Espresso Gold** ☕, the **Truffle Cheese Croissant** 🥐, and the **Saffron Tres Leches Cake** 🍰. Together, they make the ultimate Cafe x96 luxury experience!";
  }

  return "I'd love to help you with that! At Cafe x96, we serve signature coffee, craft teas, freshly baked croissants, and premium desserts. Ask me about ingredients, combos, or dietary preferences! ☕✨";
}

export async function askClaude(messageHistory, currentMenu = []) {
  const menuToUse = currentMenu.length > 0 ? currentMenu : menuData;

  // Generate a string listing of our menu dynamically for AI context injection
  const menuContext = menuToUse
    .map(
      (item) =>
        `- [${item.category}] ${item.name} ($${item.price.toFixed(2)}) - ${item.isVeg ? "Veg" : "Non-Veg"}. ${item.isOutOfStock ? "CURRENTLY OUT OF STOCK (DO NOT RECOMMEND)" : "In Stock"}. Rating: ${item.rating}. Description: ${item.description}`
    )
    .join("\n");

  const systemPrompt = `You are "Bean", the friendly, premium, and sophisticated AI Chatbot Assistant for "Cafe x96".
Your goal is to guide customers through our menu, recommend drinks/combos, answer diet questions, and chat in a warm, welcoming cafe host style.

Here is the exact Cafe x96 Menu:
${menuContext}

Rules:
1. ONLY recommend and discuss items that are on the Cafe x96 menu. If they ask for something not on the menu, politely say we don't serve it, but offer a close match from our menu.
2. If they ask for recommendations:
   - Strong Coffee: Suggest Signature Espresso Gold.
   - Sweet Coffee: Suggest Caramel Macchiato Crystal.
   - Cool Drink: Suggest Rose Hibiscus Cold Tea or Irish Whiskey Brew (Non-Alcoholic).
   - Spicy Snack: Suggest Spicy Peri-Peri Paneer Slider.
   - Match/Tea: Suggest Royal Matcha Latte or Cardamom Masala Chai.
3. DO NOT recommend any item that is marked CURRENTLY OUT OF STOCK. If a customer specifically asks for an out-of-stock item, politely inform them it is currently sold out and suggest an available alternative item from the same category!
4. Be brief, warm, and use cafe-themed emojis (☕, 🥐, 🍵, 🍰, ✨). Keep responses under 3 sentences where possible.`;

  if (!isApiKeyConfigured) {
    // Wait briefly to simulate API network call typing state
    await new Promise((resolve) => setTimeout(resolve, 800));
    const lastUserMessage = messageHistory[messageHistory.length - 1]?.content || "";
    return generateFallbackResponse(lastUserMessage);
  }

  try {
    const formattedMessages = messageHistory.map((m) => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.content,
    }));

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

