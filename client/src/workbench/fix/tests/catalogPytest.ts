import type { ScenarioId } from '../remediation/types';

/** Regression tests for pytest, written against the "after" code of the same scenario. */
export const PYTEST_TESTS: Record<ScenarioId, string> = {
  'database-connection-refused': `import psycopg2
import pytest

from database import connect_with_retry


def no_wait(seconds):
    pass


def test_keeps_trying_until_the_database_accepts_the_connection():
    calls = []

    def flaky_connect():
        calls.append(1)
        if len(calls) < 3:
            raise psycopg2.OperationalError("connection refused")
        return "connected"

    assert connect_with_retry(flaky_connect, wait=no_wait) == "connected"
    assert len(calls) == 3  # the old code gave up on the first refusal


def test_gives_up_after_the_last_attempt():
    def always_down():
        raise psycopg2.OperationalError("connection refused")

    with pytest.raises(psycopg2.OperationalError):
        connect_with_retry(always_down, attempts=2, wait=no_wait)`,
  'connection-pool-exhausted': `from unittest.mock import MagicMock

import pytest

from pool import with_connection


def test_returns_the_connection_after_the_work():
    pool = MagicMock()
    assert with_connection(pool, lambda connection: "row") == "row"
    pool.putconn.assert_called_once_with(pool.getconn.return_value)


def test_returns_the_connection_even_when_the_work_fails():
    pool = MagicMock()

    def failing_work(connection):
        raise RuntimeError("query failed")

    with pytest.raises(RuntimeError):
        with_connection(pool, failing_work)
    pool.putconn.assert_called_once()  # the old code leaked the connection here`,
  'sql-injection': `from unittest.mock import MagicMock

from products import find_product

ATTACK = "1' OR '1'='1"


def test_passes_the_id_as_a_parameter():
    cursor = MagicMock()
    find_product(cursor, ATTACK)
    cursor.execute.assert_called_once_with("SELECT * FROM products WHERE id = %s", (ATTACK,))


def test_never_builds_the_query_from_the_input():
    cursor = MagicMock()
    find_product(cursor, ATTACK)
    query = cursor.execute.call_args.args[0]
    assert ATTACK not in query`,
  'null-access': `import pytest

from users import city_of


def test_returns_the_city_in_upper_case():
    assert city_of({"address": {"city": "rome"}}) == "ROME"


@pytest.mark.parametrize(
    "user",
    [None, {}, {"address": None}, {"address": {}}, {"address": {"city": None}}],
)
def test_falls_back_to_unknown_when_a_part_is_missing(user):
    assert city_of(user) == "UNKNOWN"  # the old code raised KeyError or AttributeError`,
  'unhandled-rejection': `import asyncio
from unittest.mock import MagicMock

from tasks import run_safely


def test_a_failing_background_task_is_logged_not_lost():
    logger = MagicMock()

    async def failing():
        raise ValueError("boom")

    asyncio.run(run_safely(failing(), logger))  # does not raise
    logger.exception.assert_called_once()


def test_returns_the_result_of_a_healthy_task():
    async def healthy():
        return 42

    assert asyncio.run(run_safely(healthy(), MagicMock())) == 42`,
  'outbound-timeout': `from unittest.mock import MagicMock

from http_client import build_session, fetch


def test_every_request_has_a_connect_and_a_read_timeout():
    session = MagicMock()
    fetch("https://api.example.com", session=session)
    session.get.assert_called_once_with("https://api.example.com", timeout=(3, 10))


def test_transient_failures_are_retried_three_times():
    adapter = build_session().get_adapter("https://api.example.com")
    assert adapter.max_retries.total == 3`,
  'rate-limit-429': `import pytest

from client import get_with_backoff


class FakeResponse:
    def __init__(self, status_code, headers=None):
        self.status_code = status_code
        self.headers = headers or {}


def test_waits_for_retry_after_then_retries():
    answers = iter([FakeResponse(429, {"Retry-After": "2"}), FakeResponse(200)])
    waits = []
    response = get_with_backoff(
        "https://api.example.com",
        get=lambda url, timeout: next(answers),
        wait=waits.append,
    )
    assert response.status_code == 200
    assert waits == [2.0]


def test_gives_up_when_the_limit_never_lifts():
    with pytest.raises(RuntimeError):
        get_with_backoff(
            "https://api.example.com",
            get=lambda url, timeout: FakeResponse(429),
            wait=lambda seconds: None,
            attempts=2,
        )`,
  'out-of-memory': `from process_file import process_file


def test_handles_every_line_one_at_a_time(tmp_path):
    path = tmp_path / "input.log"
    path.write_text("a\\nb\\nc\\n")
    seen = []
    assert process_file(path, seen.append) == 3
    assert seen == ["a\\n", "b\\n", "c\\n"]


def test_handles_nothing_for_an_empty_file(tmp_path):
    path = tmp_path / "empty.log"
    path.write_text("")
    seen = []
    assert process_file(path, seen.append) == 0
    assert seen == []`,
  'expired-certificate': `from datetime import datetime, timezone

from certificate import days_until

NOT_AFTER = datetime(2030, 1, 1, tzinfo=timezone.utc)


def test_counts_the_whole_days_left():
    now = datetime(2029, 12, 22, tzinfo=timezone.utc)
    assert days_until(NOT_AFTER, now) == 10


def test_is_negative_once_the_certificate_has_expired():
    now = datetime(2030, 1, 3, tzinfo=timezone.utc)
    assert days_until(NOT_AFTER, now) < 0`,
  'cors-blocked': `import pytest

from cors import resolve_allowed_origin


def test_echoes_an_origin_from_the_allowlist():
    assert resolve_allowed_origin("https://app.example.com") == "https://app.example.com"


@pytest.mark.parametrize(
    "origin",
    [None, "", "https://evil.example.com", "https://app.example.com.evil.io"],
)
def test_refuses_everything_else(origin):
    assert resolve_allowed_origin(origin) is None  # never answer with *`,
  'missing-environment-variable': `import pytest

from config import load_config

VALID = {"DATABASE_URL": "postgres://db/app", "SESSION_SECRET": "not-a-real-secret"}


def test_reads_the_required_values_and_applies_the_default_port():
    config = load_config(VALID)
    assert config["database_url"] == "postgres://db/app"
    assert config["port"] == 3000


def test_names_every_missing_variable_without_printing_any_value():
    with pytest.raises(RuntimeError) as error:
        load_config({"DATABASE_URL": ""})
    message = str(error.value)
    assert "DATABASE_URL" in message
    assert "SESSION_SECRET" in message`,
  'json-parse-error': `import pytest

from body import parse_json_body


def test_returns_the_parsed_value_of_a_valid_body():
    assert parse_json_body('{"quantity": 2}') == ({"quantity": 2}, None)


@pytest.mark.parametrize("text", ['{"quantity":', "not json", "", "   ", None])
def test_answers_with_an_error_instead_of_raising(text):
    value, error = parse_json_body(text)
    assert value is None
    assert error`,
  'path-traversal': `import pytest

from safe_paths import resolve_inside


def test_accepts_a_file_inside_the_folder(tmp_path):
    assert resolve_inside(tmp_path, "report.pdf") == (tmp_path / "report.pdf").resolve()


@pytest.mark.parametrize(
    "requested",
    ["../secret.txt", "../../etc/passwd", "/etc/passwd", "a/../../b", "x\\0y"],
)
def test_refuses_paths_that_leave_the_folder(tmp_path, requested):
    assert resolve_inside(tmp_path, requested) is None`,
  'brute-force-login': `from limiter import LoginLimiter


def test_locks_the_account_on_the_fifth_failure():
    limiter = LoginLimiter(max_failures=5, window=900, lock=900)
    for second in range(4):
        limiter.record_failure("alice", second)
    assert not limiter.is_locked("alice", 10)
    limiter.record_failure("alice", 4)
    assert limiter.is_locked("alice", 10)
    assert not limiter.is_locked("alice", 4 + 901)  # the lock expires


def test_does_not_count_old_failures_or_other_accounts():
    limiter = LoginLimiter(max_failures=2, window=10, lock=10)
    limiter.record_failure("alice", 0)
    limiter.record_failure("alice", 100)
    limiter.record_failure("bob", 100)
    assert not limiter.is_locked("alice", 101)
    assert not limiter.is_locked("bob", 101)


def test_forgets_the_failures_after_a_good_login():
    limiter = LoginLimiter(max_failures=2)
    limiter.record_failure("alice", 0)
    limiter.record_failure("alice", 1)
    limiter.reset("alice")
    assert not limiter.is_locked("alice", 2)`,
  'file-descriptor-leak': `from unittest.mock import mock_open

import pytest

from files import read_first_line


def test_closes_the_file_after_reading():
    opener = mock_open(read_data="first\\nsecond")
    assert read_first_line("data.txt", opener=opener) == "first\\n"
    opener.return_value.__exit__.assert_called_once()


def test_closes_the_file_even_when_reading_fails():
    opener = mock_open()
    opener.return_value.readline.side_effect = OSError("disk error")
    with pytest.raises(OSError):
        read_first_line("data.txt", opener=opener)
    opener.return_value.__exit__.assert_called_once()  # the old code leaked the descriptor`,
};
