# syntax=docker/dockerfile:1.7
ARG MAVEN_BASE=azul/zulu-openjdk-alpine:17
ARG RUNTIME_BASE_JRE=azul/zulu-openjdk-alpine:17-jre
ARG RUNTIME_BASE_JDK=azul/zulu-openjdk-alpine:17

FROM ${MAVEN_BASE} AS builder

ARG MAVEN_VERSION=3.9.16
# Use Aliyun alpine mirror to avoid slow dl-cdn.alpinelinux.org in CN
RUN sed -i 's|dl-cdn.alpinelinux.org|mirrors.aliyun.com|g' /etc/apk/repositories \
    && apk add --no-cache curl bash \
    && curl -fsSL https://mirrors.ustc.edu.cn/apache/maven/maven-3/3.9.16/binaries/apache-maven-3.9.16-bin.tar.gz \
       | tar xz -C /opt \
    && ln -s /opt/apache-maven-${MAVEN_VERSION}/bin/mvn /usr/local/bin/mvn

ENV MAVEN_HOME=/opt/apache-maven-${MAVEN_VERSION}
WORKDIR /build

# Use Aliyun Maven mirror for fast dependency resolution in CN
COPY settings.xml /root/.m2/settings.xml

COPY pom.xml .
COPY safe-validator-common/pom.xml safe-validator-common/
COPY safe-validator-admin/pom.xml  safe-validator-admin/
COPY safe-validator-form/pom.xml   safe-validator-form/
COPY safe-validator-start/pom.xml  safe-validator-start/
RUN mvn -B -q dependency:go-offline

COPY . .
RUN mvn clean package -DskipTests -B \
    -pl safe-validator-start -am

FROM ${RUNTIME_BASE_JRE} AS prod
WORKDIR /app
RUN sed -i 's|dl-cdn.alpinelinux.org|mirrors.aliyun.com|g' /etc/apk/repositories \
    && addgroup -S app && adduser -S app -G app
COPY --from=builder /build/safe-validator-start/target/safe-validator-start.jar /app/app.jar
USER app
EXPOSE 8080
ENTRYPOINT ["java", "-XX:+UseG1GC", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]

FROM ${RUNTIME_BASE_JDK} AS debug
WORKDIR /app
RUN sed -i 's|dl-cdn.alpinelinux.org|mirrors.aliyun.com|g' /etc/apk/repositories \
    && apk add --no-cache curl bash \
    && addgroup -S app && adduser -S app -G app
COPY --from=builder /build/safe-validator-start/target/safe-validator-start.jar /app/app.jar

USER app
EXPOSE 8080 5005

ENV JAVA_TOOL_OPTIONS="-agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005"
ENTRYPOINT ["java", "-XX:+UseG1GC", "-XX:MaxRAMPercentage=75.0", "-jar", "/app/app.jar"]
