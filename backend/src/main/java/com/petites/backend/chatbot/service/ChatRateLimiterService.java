package com.petites.backend.chatbot.service;

import com.petites.backend.chatbot.exception.RateLimitExceededException;
import jakarta.servlet.http.HttpServletRequest;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ChatRateLimiterService {

    private static final Logger log = LoggerFactory.getLogger(ChatRateLimiterService.class);

    private final int maxRequests;
    private final long windowMillis;
    private final Map<String, Deque<Long>> ipRequestLog = new ConcurrentHashMap<>();

    public ChatRateLimiterService(
            @Value("${app.chat.rate-limit.max-requests:20}") int maxRequests,
            @Value("${app.chat.rate-limit.window-seconds:60}") int windowSeconds) {
        this.maxRequests = maxRequests;
        this.windowMillis = windowSeconds * 1000L;
    }

    public void checkRateLimit(String clientIp) {
        String key = (clientIp != null && !clientIp.isBlank()) ? clientIp.trim() : "unknown";
        long now = System.currentTimeMillis();
        long windowStart = now - windowMillis;

        ipRequestLog.compute(key, (k, deque) -> {
            if (deque == null) {
                deque = new ArrayDeque<>();
            }
            while (!deque.isEmpty() && deque.peekFirst() <= windowStart) {
                deque.pollFirst();
            }

            if (deque.size() >= maxRequests) {
                log.warn("Chat rate limit exceeded for IP: {} ({} requests in last {}s)",
                        k, deque.size(), windowMillis / 1000);
                throw new RateLimitExceededException(
                        "Too many chat requests. Please wait a moment before sending another message.");
            }

            deque.addLast(now);
            return deque;
        });

        // Occasional cleanup to avoid unbounded map growth
        if (ipRequestLog.size() > 5000) {
            cleanupExpiredIps(now, windowStart);
        }
    }

    public String resolveClientIp(HttpServletRequest request) {
        if (request == null) {
            return "unknown";
        }

        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isBlank()) {
            return xForwardedFor.split(",")[0].trim();
        }

        String xRealIp = request.getHeader("X-Real-IP");
        if (xRealIp != null && !xRealIp.isBlank()) {
            return xRealIp.trim();
        }

        return request.getRemoteAddr();
    }

    private void cleanupExpiredIps(long now, long windowStart) {
        ipRequestLog.entrySet().removeIf(entry -> {
            Deque<Long> deque = entry.getValue();
            synchronized (deque) {
                while (!deque.isEmpty() && deque.peekFirst() <= windowStart) {
                    deque.pollFirst();
                }
                return deque.isEmpty();
            }
        });
    }

    // Visible for testing
    public void reset() {
        ipRequestLog.clear();
    }
}
