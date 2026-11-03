import type { ScenarioId } from '../remediation/types';

/** Regression tests for JUnit 5 (with Mockito where a collaborator is needed). */
export const JUNIT_TESTS: Record<ScenarioId, string> = {
  'database-connection-refused': `import static org.junit.jupiter.api.Assertions.assertEquals;

import com.zaxxer.hikari.HikariConfig;
import org.junit.jupiter.api.Test;

class DatabaseConfigTest {
    @Test
    void waitsForTheDatabaseInsteadOfFailingAtStartup() {
        HikariConfig config = DatabaseConfig.build("jdbc:postgresql://db:5432/app");
        assertEquals(60_000, config.getInitializationFailTimeout());
        assertEquals(5_000, config.getConnectionTimeout());
    }

    @Test
    void capsThePoolAndKeepsTheUrl() {
        HikariConfig config = DatabaseConfig.build("jdbc:postgresql://db:5432/app");
        assertEquals(10, config.getMaximumPoolSize());
        assertEquals("jdbc:postgresql://db:5432/app", config.getJdbcUrl());
    }
}`,
  'connection-pool-exhausted': `import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;

class OrderRepositoryTest {
    @Test
    void closesTheConnectionEvenWhenTheQueryFails() throws Exception {
        DataSource dataSource = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.prepareStatement(anyString())).thenThrow(new SQLException("query failed"));

        assertThrows(SQLException.class, () -> new OrderRepository().findOrder(dataSource, 7L));

        verify(connection).close(); // the old code never closed it
    }

    @Test
    void closesTheConnectionAfterASuccessfulQuery() throws Exception {
        DataSource dataSource = mock(DataSource.class);
        Connection connection = mock(Connection.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        ResultSet rows = mock(ResultSet.class);
        when(dataSource.getConnection()).thenReturn(connection);
        when(connection.prepareStatement(anyString())).thenReturn(statement);
        when(statement.executeQuery()).thenReturn(rows);

        new OrderRepository().findOrder(dataSource, 7L);

        verify(connection).close();
        verify(statement).close();
    }
}`,
  'sql-injection': `import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.sql.Connection;
import java.sql.PreparedStatement;
import org.junit.jupiter.api.Test;

class ProductRepositoryTest {
    private static final String ATTACK = "1' OR '1'='1";

    @Test
    void sendsTheIdAsAParameterNeverInsideTheSql() throws Exception {
        Connection connection = mock(Connection.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        when(connection.prepareStatement("SELECT * FROM products WHERE id = ?")).thenReturn(statement);

        new ProductRepository().find(connection, ATTACK);

        verify(statement).setString(1, ATTACK);
        verify(connection, never()).createStatement(); // the old code built the SQL by hand
    }

    @Test
    void keepsTheSameQueryForANormalId() throws Exception {
        Connection connection = mock(Connection.class);
        PreparedStatement statement = mock(PreparedStatement.class);
        when(connection.prepareStatement("SELECT * FROM products WHERE id = ?")).thenReturn(statement);

        new ProductRepository().find(connection, "42");

        verify(statement).setString(1, "42");
        verify(statement).executeQuery();
    }
}`,
  'null-access': `import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class UserFormatterTest {
    @Test
    void returnsTheCityInUpperCase() {
        User user = new User(new Address("rome"));
        assertEquals("ROME", UserFormatter.cityOf(user));
    }

    @Test
    void fallsBackToUnknownWhenAPartIsMissing() {
        assertEquals("UNKNOWN", UserFormatter.cityOf(null));
        assertEquals("UNKNOWN", UserFormatter.cityOf(new User(null)));
        assertEquals("UNKNOWN", UserFormatter.cityOf(new User(new Address(null))));
    }
}`,
  'unhandled-rejection': `import static org.junit.jupiter.api.Assertions.assertEquals;

import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class WorkerTest {
    @Test
    void reportsAnExceptionInsteadOfLosingIt() throws InterruptedException {
        AtomicReference<Throwable> failure = new AtomicReference<>();

        Thread worker = Worker.startWorker(
            () -> { throw new IllegalStateException("boom"); },
            failure::set);
        worker.join();

        assertEquals("boom", failure.get().getMessage());
    }

    @Test
    void doesNotReportAnythingWhenTheTaskSucceeds() throws InterruptedException {
        AtomicReference<Throwable> failure = new AtomicReference<>();
        Worker.startWorker(() -> { }, failure::set).join();
        assertEquals(null, failure.get());
    }
}`,
  'outbound-timeout': `import static org.junit.jupiter.api.Assertions.assertEquals;

import java.net.URI;
import java.net.http.HttpRequest;
import java.time.Duration;
import org.junit.jupiter.api.Test;

class HttpRequestsTest {
    @Test
    void everyRequestHasAReadTimeout() {
        HttpRequest request = HttpRequests.build(URI.create("https://api.example.com"));
        assertEquals(Duration.ofSeconds(10), request.timeout().orElseThrow());
    }

    @Test
    void theClientHasAConnectTimeout() {
        assertEquals(Duration.ofSeconds(3), HttpRequests.client().connectTimeout().orElseThrow());
    }
}`,
  'rate-limit-429': `import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class RateLimitedClientTest {
    @Test
    void obeysTheRetryAfterHeader() {
        assertEquals(2_000L, RateLimitedClient.delayMillis(0, 2));
    }

    @Test
    void backsOffExponentiallyWithAShortJitterAndACap() {
        long first = RateLimitedClient.delayMillis(0, 0);
        long late = RateLimitedClient.delayMillis(10, 0);
        assertTrue(first >= 1_000 && first < 1_250);
        assertTrue(late >= 30_000 && late < 30_250);
    }
}`,
  'out-of-memory': `import static org.junit.jupiter.api.Assertions.assertEquals;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class LineProcessorTest {
    @TempDir
    Path folder;

    @Test
    void handlesEveryLineOneAtATime() throws Exception {
        Path file = Files.writeString(folder.resolve("input.log"), "a\\nb\\nc\\n");
        List<String> seen = new ArrayList<>();

        long count = LineProcessor.process(file, seen::add);

        assertEquals(3, count);
        assertEquals(List.of("a", "b", "c"), seen);
    }

    @Test
    void handlesNothingForAnEmptyFile() throws Exception {
        Path file = Files.writeString(folder.resolve("empty.log"), "");
        assertEquals(0, LineProcessor.process(file, line -> { }));
    }
}`,
  'expired-certificate': `import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Instant;
import org.junit.jupiter.api.Test;

class CertificateCheckTest {
    private static final Instant NOT_AFTER = Instant.parse("2030-01-01T00:00:00Z");

    @Test
    void countsTheWholeDaysLeft() {
        assertEquals(10, CertificateCheck.daysLeft(NOT_AFTER, Instant.parse("2029-12-22T00:00:00Z")));
    }

    @Test
    void isNegativeOnceTheCertificateHasExpired() {
        assertTrue(CertificateCheck.daysLeft(NOT_AFTER, Instant.parse("2030-01-03T00:00:00Z")) < 0);
    }
}`,
  'cors-blocked': `import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.util.Optional;
import org.junit.jupiter.api.Test;

class CorsPolicyTest {
    @Test
    void echoesAnOriginFromTheAllowlist() {
        assertEquals(
            Optional.of("https://app.example.com"),
            CorsPolicy.resolveAllowedOrigin("https://app.example.com"));
    }

    @Test
    void refusesEverythingElse() {
        assertTrue(CorsPolicy.resolveAllowedOrigin(null).isEmpty());
        assertTrue(CorsPolicy.resolveAllowedOrigin("https://evil.example.com").isEmpty());
        assertTrue(CorsPolicy.resolveAllowedOrigin("https://app.example.com.evil.io").isEmpty());
    }
}`,
  'missing-environment-variable': `import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.util.Map;
import org.junit.jupiter.api.Test;

class AppConfigTest {
    @Test
    void readsTheRequiredValues() {
        AppConfig config = AppConfig.load(
            Map.of("DATABASE_URL", "postgres://db/app", "SESSION_SECRET", "not-a-real-secret"));
        assertEquals("postgres://db/app", config.databaseUrl());
    }

    @Test
    void namesEveryMissingVariableWithoutPrintingAnyValue() {
        IllegalStateException error = assertThrows(
            IllegalStateException.class, () -> AppConfig.load(Map.of("DATABASE_URL", "")));
        assertEquals("Missing environment variables: DATABASE_URL, SESSION_SECRET", error.getMessage());
    }
}`,
  'json-parse-error': `import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

class JsonBodiesTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void returnsTheParsedValueOfAValidBody() {
        assertEquals(2, JsonBodies.parse(mapper, "{\\"quantity\\":2}").orElseThrow().get("quantity").asInt());
    }

    @Test
    void answersEmptyInsteadOfThrowingOnBadInput() {
        assertTrue(JsonBodies.parse(mapper, "{\\"quantity\\":").isEmpty());
        assertTrue(JsonBodies.parse(mapper, "   ").isEmpty());
        assertTrue(JsonBodies.parse(mapper, null).isEmpty());
    }
}`,
  'path-traversal': `import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class SafePathsTest {
    @TempDir
    Path base;

    @Test
    void acceptsAFileInsideTheFolder() {
        assertEquals(base.resolve("report.pdf").toAbsolutePath(), SafePaths.resolveInside(base, "report.pdf"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"../secret.txt", "../../etc/passwd", "/etc/passwd", "a/../../b"})
    void refusesPathsThatLeaveTheFolder(String requested) {
        assertThrows(IllegalArgumentException.class, () -> SafePaths.resolveInside(base, requested));
    }
}`,
  'brute-force-login': `import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class LoginLimiterTest {
    private static final Instant START = Instant.parse("2030-01-01T00:00:00Z");

    @Test
    void locksTheAccountOnTheFifthFailure() {
        LoginLimiter limiter = new LoginLimiter(5, Duration.ofMinutes(15), Duration.ofMinutes(15));
        for (int attempt = 0; attempt < 4; attempt++) {
            limiter.recordFailure("alice", START.plusSeconds(attempt));
        }
        assertFalse(limiter.isLocked("alice", START.plusSeconds(10)));

        limiter.recordFailure("alice", START.plusSeconds(4));

        assertTrue(limiter.isLocked("alice", START.plusSeconds(10)));
        assertFalse(limiter.isLocked("alice", START.plus(Duration.ofMinutes(16))));
    }

    @Test
    void doesNotCountOldFailuresOrOtherAccounts() {
        LoginLimiter limiter = new LoginLimiter(2, Duration.ofSeconds(10), Duration.ofSeconds(10));
        limiter.recordFailure("alice", START);
        limiter.recordFailure("alice", START.plusSeconds(100));
        limiter.recordFailure("bob", START.plusSeconds(100));
        assertFalse(limiter.isLocked("alice", START.plusSeconds(101)));
        assertFalse(limiter.isLocked("bob", START.plusSeconds(101)));
    }
}`,
  'file-descriptor-leak': `import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import org.junit.jupiter.api.Test;

class FirstLineTest {
    static class TrackedStream extends ByteArrayInputStream {
        boolean closed;

        TrackedStream(String text) {
            super(text.getBytes());
        }

        @Override
        public void close() throws IOException {
            closed = true;
            super.close();
        }
    }

    @Test
    void closesTheStreamAfterReading() throws IOException {
        TrackedStream stream = new TrackedStream("first\\nsecond");
        assertEquals("first", FirstLine.readFirstLine(stream));
        assertTrue(stream.closed);
    }

    @Test
    void closesTheStreamEvenWhenReadingFails() {
        boolean[] closed = {false};
        InputStream broken = new InputStream() {
            @Override public int read() throws IOException { throw new IOException("disk error"); }
            @Override public void close() { closed[0] = true; }
        };
        assertThrows(IOException.class, () -> FirstLine.readFirstLine(broken));
        assertTrue(closed[0]); // the old code leaked the descriptor here
    }
}`,
};
