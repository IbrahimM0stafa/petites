package com.petites.backend.chatbot.service;

import java.math.BigDecimal;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.petites.backend.chatbot.dto.ChatActionDto;
import com.petites.backend.chatbot.dto.ChatMessageDto;
import com.petites.backend.chatbot.dto.ChatRequest;
import com.petites.backend.chatbot.dto.ChatResponse;
import com.petites.backend.products.dto.ProductResponse;

@Service
public class ChatbotService {

    private static final Logger logger = LoggerFactory.getLogger(ChatbotService.class);
    private final ChatbotToolsService chatbotToolsService;
    private final ObjectMapper objectMapper;
    private final HttpClient httpClient;

    private static final List<String> GEMINI_MODELS = List.of("gemini-3.5-flash-lite", "gemini-3.6-flash");

    private static final Map<String, String> ARABIC_PRODUCT_SYNONYMS = Map.ofEntries(
        Map.entry("نوتيلا", "Nutella"),
        Map.entry("براونيز", "Brownie"),
        Map.entry("براوني", "Brownie"),
        Map.entry("كيك", "Cake"),
        Map.entry("كيكة", "Cake"),
        Map.entry("تورته", "Cake"),
        Map.entry("تورتة", "Cake"),
        Map.entry("بسكويت", "Biscuit"),
        Map.entry("بسكوت", "Biscuit"),
        Map.entry("كوكيز", "Cookie"),
        Map.entry("كوكي", "Cookie"),
        Map.entry("كريب", "Crêpe"),
        Map.entry("شوكولاتة", "Chocolate"),
        Map.entry("شوكولاته", "Chocolate"),
        Map.entry("شوكولا", "Chocolate")
    );

    private static final Pattern ACTION_TAG_PATTERN = Pattern.compile("\\[ACTION:([A-Z_]+)(?::([^:\\]]+))?(?::(\\d+))?(?::([A-Za-z_]+))?\\]");

    @Value("${app.ai.openai.api-key:}")
    private String openAiApiKey;

    @Value("${app.ai.gemini.api-key:}")
    private String geminiApiKey;

    public ChatbotService(ChatbotToolsService chatbotToolsService, ObjectMapper objectMapper) {
        this.chatbotToolsService = chatbotToolsService;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
    }

    public ChatResponse processChat(ChatRequest request) {
        List<ChatMessageDto> messages = request.messages() != null ? request.messages() : Collections.emptyList();
        if (messages.isEmpty()) {
            return new ChatResponse(
                "Hello! 🥐 I am your Petites shopping concierge. How can I help you today? You can ask about our menu, ask me to add items to your cart, or place an order directly with me!",
                Collections.emptyList(),
                null,
                List.of("📜 Full Menu", "⚡ Instant Items", "🛒 View Cart", "💳 Checkout")
            );
        }

        String userQuery = messages.get(messages.size() - 1).content();

        // 1. Google Gemini AI (Grounded in real DB data, with model fallback)
        if (geminiApiKey != null && !geminiApiKey.isBlank()) {
            for (String modelName : GEMINI_MODELS) {
                try {
                    ChatResponse geminiResp = callGeminiApi(messages, modelName);
                    if (geminiResp != null && geminiResp.reply() != null && !geminiResp.reply().isBlank()) {
                        return geminiResp;
                    }
                } catch (Exception e) {
                    logger.warn("Gemini model {} failed, trying next: {}", modelName, e.getMessage());
                }
            }
        }

        // 2. OpenAI fallback if configured
        if (openAiApiKey != null && !openAiApiKey.isBlank() && openAiApiKey.startsWith("sk-")) {
            try {
                ChatResponse openAiResp = callOpenAiApi(messages);
                if (openAiResp != null && openAiResp.reply() != null && !openAiResp.reply().isBlank()) {
                    return openAiResp;
                }
            } catch (Exception e) {
                logger.warn("OpenAI API call failed: {}", e.getMessage());
            }
        }

        // 3. Smart Conversational Fallback Processor (Dynamic from DB)
        return handleConversationalFallback(userQuery);
    }

    private String buildRealMenuSystemPrompt() {
        List<ProductResponse> allProducts = chatbotToolsService.searchMenuItems(null, null, null, null, true);
        long instantCount = allProducts.stream()
            .filter(p -> Boolean.TRUE.equals(p.instantAvailableToday()) && p.instantQuantityToday() != null && p.instantQuantityToday() > 0)
            .count();
        long scheduledCount = allProducts.stream()
            .filter(p -> Boolean.TRUE.equals(p.scheduledEligible()))
            .count();
        String categories = allProducts.stream()
            .map(p -> p.categoryName() != null ? p.categoryName() : "Dessert")
            .distinct()
            .collect(Collectors.joining(", "));

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("""
            You are Petites AI, the sales & shopping concierge for Petites boutique bakery & gourmet dessert shop.
            
            DYNAMIC INVENTORY STATUS (Pulled live from database):
            - Total items in catalog: %d
            - Categories available: [%s]
            - In-stock for instant delivery today: %d items
            - Available for scheduled delivery: %d items
            
            CRITICAL ZERO-HALLUCINATION OPERATING RULES:
            1. DYNAMIC CATALOG: Only recommend items listed in the LIVE INVENTORY below. Never invent products, prices, or flavors.
            2. CART ACTIONS:
               - When the customer asks to add an item to their cart (e.g. "add nutella cake to cart", "ضيف نوتيلا كيك"):
                 You MUST append the exact machine action tag:
                 [ACTION:ADD_TO_CART:<product_id>:<quantity>:<delivery_mode>]
                 Example: "I've added 1 Nutella Cake to your cart! 🥐 [ACTION:ADD_TO_CART:prod-123:1:SCHEDULED]"
                 - <product_id> is the EXACT product ID listed in brackets below.
                 - <quantity> is the requested number (default 1).
                 - <delivery_mode> is "INSTANT" if Instant Delivery Today is YES, otherwise "SCHEDULED".
               - NEVER say "I added it to your cart" without appending this exact [ACTION:ADD_TO_CART:...] tag!
            3. CHECKOUT & ORDERING:
               - When the customer asks to complete their order, checkout, or order now:
                 NEVER claim "Your order is placed" or "I completed your order" on your own!
                 Instead, append: [ACTION:CHECKOUT]
                 and explain: "I'm opening the Petites Checkout Assistant for you below so you can review delivery details and place your order! 🛍️ [ACTION:CHECKOUT]"
            4. VIEWING / CLEARING / TRACKING:
               - View cart: append [ACTION:VIEW_CART]
               - Clear cart: append [ACTION:CLEAR_CART]
               - Track order: append [ACTION:TRACK_ORDER]
            5. UI PRODUCT CARDS & BUTTONS:
               - Whenever you mention items or the menu, interactive product cards with real '+ Cart' buttons are automatically displayed by the interface below your message.
               - NEVER output fake markdown links like '[Add to Cart](#)' or '[Add to Cart]'.
               - NEVER output the internal '[ID: ...]' brackets in your customer-facing text! The IDs are for your internal action tags only.
            6. Match customer's language (English or natural Arabic). Keep responses warm, helpful, and concise.
            
            LIVE INVENTORY & PRICING:
            """, allProducts.size(), categories, instantCount, scheduledCount));

        if (allProducts.isEmpty()) {
            sb.append("Currently, there are no products listed in the shop menu.\n");
        } else {
            for (ProductResponse p : allProducts) {
                boolean instantAvail = Boolean.TRUE.equals(p.instantAvailableToday()) && (p.instantQuantityToday() != null && p.instantQuantityToday() > 0);
                sb.append("• ").append(p.name())
                  .append(" [ID: ").append(p.id()).append("]")
                  .append(" | Price: $").append(p.price())
                  .append(" | Category: ").append(p.categoryName() != null ? p.categoryName() : "Dessert")
                  .append(" | Instant Today: ").append(instantAvail ? "YES (" + p.instantQuantityToday() + " left)" : "NO")
                  .append(" | Scheduled: ").append(Boolean.TRUE.equals(p.scheduledEligible()) ? "YES" : "NO")
                  .append("\n");
            }
        }

        return sb.toString();
    }

    private ChatResponse callGeminiApi(List<ChatMessageDto> messages, String modelName) throws Exception {
        ObjectNode rootNode = objectMapper.createObjectNode();

        ObjectNode sysInstruct = rootNode.putObject("systemInstruction");
        ArrayNode sysParts = sysInstruct.putArray("parts");
        sysParts.addObject().put("text", buildRealMenuSystemPrompt());

        ArrayNode contentsArray = rootNode.putArray("contents");
        ObjectNode turn = contentsArray.addObject();
        turn.put("role", "user");
        ArrayNode parts = turn.putArray("parts");

        StringBuilder promptBuilder = new StringBuilder();
        if (messages.size() > 1) {
            promptBuilder.append("Recent conversation context:\n");
            for (int i = Math.max(0, messages.size() - 5); i < messages.size() - 1; i++) {
                ChatMessageDto m = messages.get(i);
                promptBuilder.append(m.role().toUpperCase()).append(": ").append(m.content()).append("\n");
            }
            promptBuilder.append("\nLatest Customer Message:\n");
        }
        promptBuilder.append(messages.get(messages.size() - 1).content());

        parts.addObject().put("text", promptBuilder.toString());

        String requestBody = objectMapper.writeValueAsString(rootNode);
        String geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/" + modelName + ":generateContent?key=" + geminiApiKey.trim();

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(geminiUrl))
                .header("Content-Type", "application/json; charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.ofString(requestBody, java.nio.charset.StandardCharsets.UTF_8))
                .timeout(Duration.ofSeconds(10))
                .build();

        HttpResponse<String> httpResponse = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString(java.nio.charset.StandardCharsets.UTF_8));

        if (httpResponse.statusCode() != 200) {
            logger.warn("Gemini API ({}) returned HTTP {}: {}", modelName, httpResponse.statusCode(), httpResponse.body());
            return null;
        }

        JsonNode responseJson = objectMapper.readTree(httpResponse.body());
        JsonNode candidates = responseJson.path("candidates");
        if (candidates.isMissingNode() || !candidates.isArray() || candidates.isEmpty()) {
            return null;
        }

        String aiReply = candidates.get(0).path("content").path("parts").get(0).path("text").asText();
        String userQuery = messages.get(messages.size() - 1).content();
        List<ProductResponse> matchingProducts = fetchProductsForQuery(userQuery);

        return parseActionAndBuildResponse(aiReply, matchingProducts, userQuery);
    }

    private ChatResponse callOpenAiApi(List<ChatMessageDto> messages) throws Exception {
        ObjectNode rootNode = objectMapper.createObjectNode();
        rootNode.put("model", "gpt-4o-mini");

        ArrayNode msgArray = rootNode.putArray("messages");

        ObjectNode sysMsg = msgArray.addObject();
        sysMsg.put("role", "system");
        sysMsg.put("content", buildRealMenuSystemPrompt());

        for (ChatMessageDto msg : messages) {
            ObjectNode m = msgArray.addObject();
            m.put("role", msg.role());
            m.put("content", msg.content());
        }

        String requestBody = objectMapper.writeValueAsString(rootNode);

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create("https://api.openai.com/v1/chat/completions"))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + openAiApiKey.trim())
                .POST(HttpRequest.BodyPublishers.ofString(requestBody))
                .timeout(Duration.ofSeconds(10))
                .build();

        HttpResponse<String> httpResponse = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString());

        if (httpResponse.statusCode() != 200) {
            return null;
        }

        JsonNode responseJson = objectMapper.readTree(httpResponse.body());
        String content = responseJson.path("choices").path(0).path("message").path("content").asText();

        String userQuery = messages.get(messages.size() - 1).content();
        List<ProductResponse> products = fetchProductsForQuery(userQuery);

        return parseActionAndBuildResponse(content, products, userQuery);
    }

    private ChatResponse parseActionAndBuildResponse(String rawReply, List<ProductResponse> matchingProducts, String userQuery) {
        String cleanReply = rawReply;
        ChatActionDto action = null;
        List<ProductResponse> products = matchingProducts != null ? new ArrayList<>(matchingProducts) : new ArrayList<>();
        boolean arabic = isArabic(rawReply) || isArabic(userQuery);

        Matcher matcher = ACTION_TAG_PATTERN.matcher(rawReply);
        if (matcher.find()) {
            String actionType = matcher.group(1);
            String param1 = matcher.group(2); // productId
            String param2 = matcher.group(3); // quantity
            String param3 = matcher.group(4); // deliveryMode

            cleanReply = matcher.replaceAll("").trim();

            if ("ADD_TO_CART".equalsIgnoreCase(actionType) && param1 != null) {
                int quantity = 1;
                try {
                    if (param2 != null) quantity = Integer.parseInt(param2);
                } catch (Exception ignored) {}

                String deliveryMode = param3 != null ? param3.toUpperCase() : "SCHEDULED";
                ProductResponse p = chatbotToolsService.getProductById(param1);
                if (p == null) {
                    p = findMatchingProductInDb(param1);
                }

                if (p != null) {
                    if (!products.contains(p)) {
                        products.add(0, p);
                    }
                    action = new ChatActionDto("ADD_TO_CART", p.id(), p.name(), quantity, deliveryMode, p.price(), null);
                }
            } else if ("CHECKOUT".equalsIgnoreCase(actionType)) {
                action = new ChatActionDto("INITIATE_CHECKOUT", null, null, null, null, null, null);
            } else if ("VIEW_CART".equalsIgnoreCase(actionType)) {
                action = new ChatActionDto("VIEW_CART", null, null, null, null, null, null);
            } else if ("CLEAR_CART".equalsIgnoreCase(actionType)) {
                action = new ChatActionDto("CLEAR_CART", null, null, null, null, null, null);
            } else if ("TRACK_ORDER".equalsIgnoreCase(actionType)) {
                action = new ChatActionDto("TRACK_ORDER", null, null, null, null, null, null);
            }
        }

        // Secondary safety: If AI did not output tag, but user query had clear action intent
        if (action == null) {
            if (isAddToCartQuery(userQuery)) {
                ProductResponse p = findMatchingProductInDb(userQuery);
                if (p != null) {
                    if (!products.contains(p)) {
                        products.add(0, p);
                    }
                    int qty = extractQuantity(userQuery);
                    boolean instant = Boolean.TRUE.equals(p.instantAvailableToday()) && (p.instantQuantityToday() != null && p.instantQuantityToday() > 0);
                    action = new ChatActionDto("ADD_TO_CART", p.id(), p.name(), qty, instant ? "INSTANT" : "SCHEDULED", p.price(), null);
                }
            } else if (isCheckoutQuery(userQuery)) {
                action = new ChatActionDto("INITIATE_CHECKOUT", null, null, null, null, null, null);
            } else if (isViewCartQuery(userQuery)) {
                action = new ChatActionDto("VIEW_CART", null, null, null, null, null, null);
            } else if (isClearCartQuery(userQuery)) {
                action = new ChatActionDto("CLEAR_CART", null, null, null, null, null, null);
            } else if (isTrackOrderQuery(userQuery)) {
                action = new ChatActionDto("TRACK_ORDER", null, null, null, null, null, null);
            }
        }

        // Clean out any leaked internal UUIDs or fake markdown links
        cleanReply = cleanReply.replaceAll("\\[ID:\\s*[^\\],]+\\]", "");
        cleanReply = cleanReply.replaceAll("\\|?\\s*\\[Add to Cart\\](?:\\([^)]*\\))?", "");
        cleanReply = cleanReply.replaceAll("\\s{2,}", " ").trim();

        // If the user requested the menu or assistant is showing the menu, ensure all DB products are attached as rich cards
        if (isMenuRequest(userQuery) || isMenuRequest(cleanReply)) {
            if (products.isEmpty()) {
                products.addAll(chatbotToolsService.searchMenuItems(null, null, null, null, true));
            }
        }

        List<String> quickReplies = buildQuickReplies(action, arabic);
        return new ChatResponse(cleanReply, products, action, quickReplies);
    }

    private ProductResponse findMatchingProductInDb(String text) {
        if (text == null || text.isBlank()) return null;
        String q = text.toLowerCase().trim();
        List<ProductResponse> all = chatbotToolsService.searchMenuItems(null, null, null, null, true);

        // 1. Direct or substring match on product name
        for (ProductResponse p : all) {
            String name = p.name().toLowerCase();
            if (q.contains(name)) {
                return p;
            }
        }

        // 2. Singular / Plural / Token match on product name
        for (ProductResponse p : all) {
            String[] tokens = p.name().toLowerCase().split("\\s+");
            for (String token : tokens) {
                if (token.length() > 3) {
                    String singular = token.endsWith("s") ? token.substring(0, token.length() - 1) : token;
                    if (q.contains(singular) || q.contains(token)) {
                        return p;
                    }
                }
            }
        }

        // 3. Arabic synonyms matched to DB products
        for (Map.Entry<String, String> entry : ARABIC_PRODUCT_SYNONYMS.entrySet()) {
            if (q.contains(entry.getKey())) {
                String englishKeyword = entry.getValue().toLowerCase();
                for (ProductResponse p : all) {
                    if (p.name().toLowerCase().contains(englishKeyword)) {
                        return p;
                    }
                }
            }
        }

        return null;
    }

    private List<String> buildQuickReplies(ChatActionDto action, boolean arabic) {
        if (action != null && "ADD_TO_CART".equals(action.type())) {
            return arabic
                ? List.of("🛒 عرض السلة", "💳 إتمام الطلب", "📜 المنيو كامل")
                : List.of("🛒 View Cart", "💳 Checkout", "📜 Browse Menu");
        }
        if (action != null && "INITIATE_CHECKOUT".equals(action.type())) {
            return arabic
                ? List.of("🛒 مراجعة السلة", "🥐 المنيو كامل", "📞 مساعدة")
                : List.of("🛒 Review Cart", "🥐 Full Menu", "📞 Contact Us");
        }
        return arabic
            ? List.of("📜 المنيو كامل", "⚡ توصيل فوري", "🛒 السلة", "💳 إتمام الطلب")
            : List.of("📜 Full Menu", "⚡ Instant Items", "🛒 View Cart", "💳 Checkout");
    }

    private List<ProductResponse> fetchProductsForQuery(String userQuery) {
        if (userQuery == null || userQuery.isBlank()) {
            return Collections.emptyList();
        }
        String q = userQuery.toLowerCase().trim();

        if (isGreeting(q) || isConversationalOnly(q)) {
            return Collections.emptyList();
        }

        boolean isExplicitMenu = isMenuRequest(q);
        boolean instantDeliveryOnly = isInstantDeliveryQuery(userQuery);
        String fulfillmentMode = instantDeliveryOnly ? "instant" : null;
        BigDecimal maxPrice = extractMaxPrice(userQuery);

        // When menu is requested, return ALL products dynamically from DB
        if (isExplicitMenu) {
            return chatbotToolsService.searchMenuItems(null, null, fulfillmentMode, maxPrice, true);
        }

        // Otherwise check if a specific DB product is mentioned
        ProductResponse matched = findMatchingProductInDb(userQuery);
        if (matched != null) {
            return List.of(matched);
        }

        if (maxPrice != null || instantDeliveryOnly) {
            return chatbotToolsService.searchMenuItems(null, null, fulfillmentMode, maxPrice, true);
        }

        return Collections.emptyList();
    }

    private boolean isAddToCartQuery(String query) {
        if (query == null) return false;
        String q = query.toLowerCase();
        return (q.contains("add") || q.contains("cart") || q.contains("buy") || q.contains("put") 
            || q.contains("ضيف") || q.contains("اضف") || q.contains("حط") || q.contains("سلة") || q.contains("السلة"))
            && !isCheckoutQuery(query) && !isViewCartQuery(query) && !isClearCartQuery(query);
    }

    private boolean isCheckoutQuery(String query) {
        if (query == null) return false;
        String q = query.toLowerCase();
        return q.contains("checkout") || q.contains("complete order") || q.contains("place order") || q.contains("order now")
            || q.contains("order my cart") || q.contains("pay now")
            || q.contains("عايز اطلب") || q.contains("اطلب") || q.contains("اتمام الطلب") || q.contains("تأكيد الطلب")
            || q.contains("اشتري") || q.contains("دفع");
    }

    private boolean isViewCartQuery(String query) {
        if (query == null) return false;
        String q = query.toLowerCase();
        return q.contains("view cart") || q.contains("show cart") || q.contains("what's in my cart") || q.contains("whats in my cart")
            || q.contains("my cart") || q.contains("عرض السلة") || q.contains("وريني السلة") || q.contains("السلة فيها ايه")
            || q.contains("محتويات السلة");
    }

    private boolean isClearCartQuery(String query) {
        if (query == null) return false;
        String q = query.toLowerCase();
        return q.contains("clear cart") || q.contains("empty cart") || q.contains("delete cart")
            || q.contains("مسح السلة") || q.contains("تفريغ السلة") || q.contains("فضي السلة") || q.contains("امسح السلة");
    }

    private boolean isTrackOrderQuery(String query) {
        if (query == null) return false;
        String q = query.toLowerCase();
        return q.contains("track order") || q.contains("where is my order") || q.contains("order status") || q.contains("my order")
            || q.contains("تتبع الطلب") || q.contains("فين الاوردر") || q.contains("فين طلبي") || q.contains("حالة الطلب");
    }

    private int extractQuantity(String query) {
        if (query == null) return 1;
        Pattern p = Pattern.compile("(?:add|put|want|buy|حط|ضيف|عاوز|عايز)\\s+(\\d+)\\s+");
        Matcher m = p.matcher(query.toLowerCase());
        if (m.find()) {
            try {
                return Integer.parseInt(m.group(1));
            } catch (Exception ignored) {}
        }
        return 1;
    }

    private boolean isMenuRequest(String query) {
        if (query == null) return false;
        String q = query.toLowerCase().trim();
        return q.contains("menu") || q.contains("المنيو") || q.contains("منيو") 
            || q.contains("قائمة") || q.contains("قائمه") || q.contains("استعرض") 
            || q.contains("المنتجات") || q.contains("عايز اشوف") || q.contains("show me the")
            || q.contains("show items") || q.contains("browse");
    }

    private boolean isConversationalOnly(String query) {
        String q = query.toLowerCase().trim();
        return (q.contains("عربي") || q.contains("arabic") || q.contains("english") || q.contains("شكرا") || q.contains("thank")
            || q.contains("who are you") || q.contains("من انت") || q.contains("whats your name") || q.contains("what's your name") || q.contains("اسمك")
            || q.contains("how are you") || q.contains("ازيك") || q.contains("عامل ايه")
            || q.contains("ممكن ترد") || q.contains("تواصل") || q.contains("help") || q.contains("مساعدة"))
            && !isMenuRequest(query) && !isAddToCartQuery(query) && !isCheckoutQuery(query);
    }

    private ChatResponse handleConversationalFallback(String userQuery) {
        String q = userQuery != null ? userQuery.trim().toLowerCase() : "";
        boolean arabic = isArabic(q);
        List<ProductResponse> allAvailable = chatbotToolsService.searchMenuItems(null, null, null, null, true);

        // 1. ADD TO CART (Dynamic DB matching)
        if (isAddToCartQuery(userQuery)) {
            ProductResponse p = findMatchingProductInDb(userQuery);
            if (p != null) {
                int quantity = extractQuantity(userQuery);
                boolean instant = Boolean.TRUE.equals(p.instantAvailableToday()) && (p.instantQuantityToday() != null && p.instantQuantityToday() > 0);
                String mode = instant ? "INSTANT" : "SCHEDULED";
                ChatActionDto action = new ChatActionDto("ADD_TO_CART", p.id(), p.name(), quantity, mode, p.price(), null);

                String reply = arabic
                    ? String.format("تمت إضافة %dx %s ($%s) إلى سلتك بنجاح! 🛒 يمكنك عرض السلة أو إتمام الطلب الآن.", quantity, p.name(), p.price())
                    : String.format("Added %dx %s ($%s) to your cart! 🛒 You can review your cart or proceed to checkout.", quantity, p.name(), p.price());

                return new ChatResponse(reply, List.of(p), action, buildQuickReplies(action, arabic));
            } else {
                return new ChatResponse(
                    arabic ? "لم أجد الصنف المطلوب بالاسم، يرجى كتابة اسم المنتج أو تفقد القائمة أدناه:" : "I couldn't locate that specific item. Check out our available menu below:",
                    allAvailable,
                    null,
                    buildQuickReplies(null, arabic)
                );
            }
        }

        // 2. CHECKOUT / PLACE ORDER
        if (isCheckoutQuery(userQuery)) {
            ChatActionDto action = new ChatActionDto("INITIATE_CHECKOUT", null, null, null, null, null, null);
            String reply = arabic
                ? "لقد فتحت لك نافذة إتمام الطلب بالأسفل! 🛍️ يرجى مراجعة تفاصيل التوصيل لتأكيد طلبك مباشرة:"
                : "I've opened the Petites Checkout Assistant for you below! 🛍️ Please review your delivery details to confirm your order:";
            return new ChatResponse(reply, Collections.emptyList(), action, buildQuickReplies(action, arabic));
        }

        // 3. VIEW CART
        if (isViewCartQuery(userQuery)) {
            ChatActionDto action = new ChatActionDto("VIEW_CART", null, null, null, null, null, null);
            String reply = arabic ? "إليك ملخص سلة التسوق الخاصة بك 🛒:" : "Here is your shopping cart summary 🛒:";
            return new ChatResponse(reply, Collections.emptyList(), action, buildQuickReplies(action, arabic));
        }

        // 4. CLEAR CART
        if (isClearCartQuery(userQuery)) {
            ChatActionDto action = new ChatActionDto("CLEAR_CART", null, null, null, null, null, null);
            String reply = arabic ? "تم مسح جميع المنتجات من سلة التسوق الخاصة بك." : "Your shopping cart has been cleared.";
            return new ChatResponse(reply, Collections.emptyList(), action, buildQuickReplies(action, arabic));
        }

        // 5. TRACK ORDER
        if (isTrackOrderQuery(userQuery)) {
            ChatActionDto action = new ChatActionDto("TRACK_ORDER", null, null, null, null, null, null);
            String reply = arabic ? "جاري التحقق من أحدث طلباتك 📦..." : "Checking your latest order status 📦...";
            return new ChatResponse(reply, Collections.emptyList(), action, buildQuickReplies(action, arabic));
        }

        // 6. Name / Identity
        if (q.contains("name") || q.contains("اسمك") || q.contains("who are you") || q.contains("من انت")) {
            return new ChatResponse(
                arabic ? "أنا المساعد الذكي لمتجر Petites! 🥐 يمكنني مساعدتك في استعراض المنيو، إضافة المنتجات للسلة، وإتمام طلبك مباشرة هنا!"
                       : "I am Petites Assistant! 🥐 I'm here to help you explore our gourmet desserts, add items to your cart, and complete your order right here!",
                Collections.emptyList(),
                null,
                buildQuickReplies(null, arabic)
            );
        }

        // 7. Dynamic Recommendations from DB
        if (q.contains("recommend") || q.contains("اقتراح") || q.contains("ترشح") || q.contains("best") || q.contains("light") || q.contains("خفيف")) {
            List<ProductResponse> recommended = chatbotToolsService.getFeaturedItems();
            if (recommended.isEmpty() && !allAvailable.isEmpty()) {
                recommended = allAvailable.subList(0, Math.min(2, allAvailable.size()));
            }
            String names = recommended.stream()
                .map(p -> p.name() + " ($" + p.price() + ")")
                .collect(Collectors.joining(" and "));

            return new ChatResponse(
                arabic ? "أبرز الأصناف التي ننصحك بتجربتها هي " + names + "!" : "Our top recommended desserts today are " + names + "!",
                recommended,
                null,
                buildQuickReplies(null, arabic)
            );
        }

        // 8. Greetings
        if (isGreeting(q) || isConversationalOnly(q)) {
            return new ChatResponse(
                arabic ? "أهلاً بك في Petites! 🥐 كيف يمكنني مساعدتك اليوم؟ يمكنك سؤالي عن المنيو، أو إضافة أي صنف للسلة وإتمام طلبك مباشرة."
                       : "Welcome to Petites! 🥐 How can I help you today? You can browse our menu, add items to your cart, or order directly with me!",
                Collections.emptyList(),
                null,
                buildQuickReplies(null, arabic)
            );
        }

        // 9. Explicit Menu Request
        if (isMenuRequest(q)) {
            return new ChatResponse(
                arabic ? "إليك قائمة طعام Petites والأسعار المتوفرة اليوم:" : "Here is our available menu and pricing today:",
                allAvailable,
                null,
                buildQuickReplies(null, arabic)
            );
        }

        boolean instantDeliveryQuery = isInstantDeliveryQuery(userQuery);
        String fulfillmentMode = instantDeliveryQuery ? "instant" : null;
        BigDecimal maxPrice = extractMaxPrice(userQuery);

        List<ProductResponse> products = chatbotToolsService.searchMenuItems(
            null,
            null,
            fulfillmentMode,
            maxPrice,
            true
        );

        if (!products.isEmpty()) {
            String header = arabic ? "إليك العناصر المتوفرة:" : "Here are our available items:";
            return new ChatResponse(header, products, null, buildQuickReplies(null, arabic));
        }

        if (instantDeliveryQuery) {
            return new ChatResponse(
                arabic ? "لا توجد عناصر متوفرة للتوصيل الفوري اليوم، ولكن جميع المنتجات متاحة للطلب المسبق بالتوصيل المجدول!" : "We currently don't have any items in stock for instant delivery today. All items are available for scheduled delivery!",
                allAvailable,
                null,
                buildQuickReplies(null, arabic)
            );
        }

        return new ChatResponse(
            arabic ? "يسعدني مساعدتك! يمكنك سؤالي عن أي صنف في القائمة أو التوصيل، أو كتابة 'أضف [اسم الصنف]' لإضافته للسلة، أو 'عايز اطلب' لإتمام طلبك."
                   : "I'd be happy to help! You can ask about any menu item, say 'Add [item name] to cart' to add items, or 'Checkout' to complete your order.",
            allAvailable,
            null,
            buildQuickReplies(null, arabic)
        );
    }

    private boolean isArabic(String text) {
        if (text == null) return false;
        return text.matches(".*[\\u0600-\\u06FF].*");
    }

    private BigDecimal extractMaxPrice(String query) {
        if (query == null) return null;
        String q = query.toLowerCase();
        Pattern pattern = Pattern.compile("(under|below|less than|max|cheap|<|اقل من|تحت)\\s*\\$?(\\d+(?:\\.\\d+)?)");
        Matcher matcher = pattern.matcher(q);
        if (matcher.find()) {
            try {
                return new BigDecimal(matcher.group(2));
            } catch (Exception ignored) {}
        }
        return null;
    }

    private boolean isInstantDeliveryQuery(String query) {
        if (query == null) return false;
        String q = query.toLowerCase();
        return q.contains("instant") || q.contains("same day") || q.contains("فوري") || q.contains("اليوم");
    }

    private boolean isGreeting(String query) {
        if (query == null) return false;
        String q = query.trim().toLowerCase();
        return q.matches("^(hi|hello|hey|greetings|good morning|good afternoon|good evening|اهلا|مرحبا|سلام|صباح الخير|مساء الخير).*");
    }
}
