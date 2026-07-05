# ── Stage 1: Build ─────────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine AS build
WORKDIR /workspace

# Copy Maven wrapper and POM first to cache dependencies
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN chmod +x mvnw && ./mvnw dependency:go-offline -B

# Copy source and build the fat JAR
COPY src src
RUN ./mvnw -DskipTests clean package -B

# ── Stage 2: Runtime ───────────────────────────────────────────
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Install curl for Docker health checks
RUN apk add --no-cache curl

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY --from=build /workspace/target/*.jar app.jar

RUN chown appuser:appgroup app.jar
USER appuser

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]
