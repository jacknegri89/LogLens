import type { RemediationScenario } from './types';

export const DATABASE_SCENARIOS: RemediationScenario[] = [
  {
    id: 'database-connection-refused',
    samples: {
      node: {
        before: `import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function start() {
  await pool.query('SELECT 1'); // one refused connection kills the service
}`,
        after: `import { setTimeout as sleep } from 'node:timers/promises';
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
});

export async function connectWithRetry<T>(
  connect: () => Promise<T>,
  maxAttempts = 6,
  wait: (ms: number) => Promise<unknown> = sleep,
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await connect();
    } catch (error) {
      if (attempt >= maxAttempts) throw error;
      await wait(Math.min(500 * 2 ** attempt, 15_000)); // exponential backoff
    }
  }
}`,
      },
      python: {
        before: `import psycopg2

connection = psycopg2.connect(DATABASE_URL)  # fails at import time if the database is down`,
        after: `import time

import psycopg2


def connect_with_retry(connect, attempts=6, wait=time.sleep):
    for attempt in range(1, attempts + 1):
        try:
            return connect()
        except psycopg2.OperationalError:
            if attempt == attempts:
                raise
            wait(min(0.5 * 2**attempt, 15))  # exponential backoff


def open_connection():
    return connect_with_retry(lambda: psycopg2.connect(DATABASE_URL, connect_timeout=5))`,
      },
      java: {
        before: `HikariConfig config = new HikariConfig();
config.setJdbcUrl(System.getenv("DATABASE_URL"));
HikariDataSource dataSource = new HikariDataSource(config); // throws if the database is down`,
        after: `public final class DatabaseConfig {
    public static HikariConfig build(String url) {
        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(url);
        config.setMaximumPoolSize(10);
        config.setConnectionTimeout(5_000);
        config.setInitializationFailTimeout(60_000); // keep retrying while the database starts
        return config;
    }
}`,
      },
      go: {
        before: `db, _ := sql.Open("postgres", dsn)
if err := db.Ping(); err != nil {
	log.Fatal(err) // one failed attempt kills the service
}`,
        after: `db, _ := sql.Open("postgres", dsn)
db.SetMaxOpenConns(10)
db.SetConnMaxLifetime(30 * time.Minute)

delay := 500 * time.Millisecond
for attempt := 1; ; attempt++ {
	err := db.Ping()
	if err == nil {
		break
	}
	if attempt == 6 {
		log.Fatal(err)
	}
	time.Sleep(delay)
	delay *= 2 // exponential backoff
}`,
      },
    },
  },
  {
    id: 'connection-pool-exhausted',
    samples: {
      node: {
        before: `const client = await pool.connect();
const result = await client.query('SELECT * FROM orders WHERE id = $1', [id]);
return result.rows[0]; // the client is never released: the pool runs dry`,
        after: `import type { Pool, PoolClient } from 'pg';

export async function withClient<T>(
  pool: Pool,
  work: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    return await work(client);
  } finally {
    client.release(); // always give the connection back, even on errors
  }
}

// const order = await withClient(pool, (client) => findOrder(client, id));`,
      },
      python: {
        before: `connection = pool.getconn()
cursor = connection.cursor()
cursor.execute("SELECT * FROM orders WHERE id = %s", (order_id,))
return cursor.fetchone()  # the connection is never returned to the pool`,
        after: `def with_connection(pool, work):
    connection = pool.getconn()
    try:
        return work(connection)
    finally:
        pool.putconn(connection)  # always return the connection, even on errors


# order = with_connection(pool, lambda connection: find_order(connection, order_id))`,
      },
      java: {
        before: `Connection connection = dataSource.getConnection();
PreparedStatement statement = connection.prepareStatement("SELECT * FROM orders WHERE id = ?");
statement.setLong(1, orderId);
return mapOrder(statement.executeQuery()); // nothing is closed: the pool runs dry`,
        after: `public Order findOrder(DataSource dataSource, long orderId) throws SQLException {
    try (Connection connection = dataSource.getConnection();
         PreparedStatement statement = connection.prepareStatement("SELECT * FROM orders WHERE id = ?")) {
        statement.setLong(1, orderId);
        try (ResultSet rows = statement.executeQuery()) {
            return mapOrder(rows);
        }
    } // try-with-resources returns the connection to the pool
}`,
      },
      go: {
        before: `rows, err := db.Query("SELECT id FROM orders WHERE user_id = $1", userID)
if err != nil {
	return nil, err
}
// rows is never closed: the connection stays busy`,
        after: `rows, err := db.QueryContext(ctx, "SELECT id FROM orders WHERE user_id = $1", userID)
if err != nil {
	return nil, err
}
defer rows.Close() // releases the connection`,
      },
    },
  },
  {
    id: 'sql-injection',
    samples: {
      node: {
        before: `const rows = await db.query("SELECT * FROM products WHERE id = '" + request.query.id + "'");`,
        after: `export async function findProductById(db: Database, rawId: unknown) {
  const id = String(rawId);
  if (!/^\\d+$/.test(id)) throw new Error('Invalid product id');
  return db.query('SELECT * FROM products WHERE id = $1', [Number(id)]); // the value never becomes SQL
}`,
      },
      python: {
        before: `cursor.execute("SELECT * FROM products WHERE id = '" + product_id + "'")`,
        after: `def find_product(cursor, product_id):
    cursor.execute("SELECT * FROM products WHERE id = %s", (product_id,))  # parameterized
    return cursor.fetchone()`,
      },
      java: {
        before: `Statement statement = connection.createStatement();
ResultSet rows = statement.executeQuery("SELECT * FROM products WHERE id = '" + id + "'");`,
        after: `public ResultSet find(Connection connection, String id) throws SQLException {
    PreparedStatement statement = connection.prepareStatement("SELECT * FROM products WHERE id = ?");
    statement.setString(1, id); // the value never becomes SQL
    return statement.executeQuery();
}`,
      },
      php: {
        before: `$result = $pdo->query("SELECT * FROM products WHERE id = '" . $_GET['id'] . "'");`,
        after: `$statement = $pdo->prepare('SELECT * FROM products WHERE id = :id');
$statement->execute(['id' => $_GET['id'] ?? '']);
$result = $statement->fetchAll(PDO::FETCH_ASSOC);`,
      },
      go: {
        before: `rows, err := db.Query("SELECT * FROM products WHERE id = '" + id + "'")`,
        after: `rows, err := db.Query("SELECT * FROM products WHERE id = $1", id)`,
      },
      csharp: {
        before: `var command = new SqlCommand("SELECT * FROM Products WHERE Id = '" + id + "'", connection);`,
        after: `var command = new SqlCommand("SELECT * FROM Products WHERE Id = @id", connection);
command.Parameters.AddWithValue("@id", id);`,
      },
      ruby: {
        before: `Product.where("id = '#{params[:id]}'")`,
        after: `Product.where(id: params[:id])`,
      },
    },
  },
];
