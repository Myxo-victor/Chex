<?php
declare(strict_types=1);

/**
 * VenJS 5.10.0 Secure Database Engine
 *
 * Configure your database credentials in CONFIG below.
 * This endpoint is used by venjs.db.connect(...).
 */

header('Content-Type: application/json; charset=utf-8');

// ----------------------------
// CONFIG: EDIT THESE VALUES
// ----------------------------
$CONFIG = [
    // Add your database host, database name, username, and password here.
    'db_host' => '127.0.0.1',
    'db_port' => 3306,
    'db_name' => 'test', #Change this to your own database name
    'db_user' => 'root', #This too
    'db_pass' => '', #This too
    'db_charset' => 'utf8mb4',

    // Create a long random secret key and use same key in venjs.db.connect({ apiKey: '...' }).
    // Leave empty to disable API key enforcement (NOT recommended for production).
    'api_key' => 'CHANGE_THIS_TO_A_LONG_RANDOM_SECRET',

    // Allowed frontend origins. Keep minimal in production.
    'allowed_origins' => [
        'http://localhost', #This too, this one is for localhost
        'http://127.0.0.1' #and this
    ],

    // Whitelist allowed tables to prevent access to unexpected DB tables.
    'allowed_tables' => [
        'users' #Add your database tables here
    ],

    // Set true in development to include exception details.
    'debug' => true,
];

function respond(int $status, array $payload): void {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit;
}

function sanitize_identifier(string $value): string {
    if (!preg_match('/^[A-Za-z_][A-Za-z0-9_]*$/', $value)) {
        throw new InvalidArgumentException('Invalid identifier.');
    }
    return $value;
}

function sanitize_identifier_list($value): array {
    if (!is_array($value) || count($value) === 0) {
        throw new InvalidArgumentException('Invalid column list.');
    }
    $out = [];
    foreach ($value as $column) {
        if (!is_string($column)) {
            throw new InvalidArgumentException('Invalid column in list.');
        }
        $out[] = sanitize_identifier($column);
    }
    return array_values(array_unique($out));
}

function ensure_allowed_table(string $table, array $allowedTables): string {
    $safeTable = sanitize_identifier($table);
    if (!in_array($safeTable, $allowedTables, true)) {
        throw new InvalidArgumentException('Table is not allowed.');
    }
    return $safeTable;
}

function require_json_payload(): array {
    $raw = file_get_contents('php://input');
    $data = json_decode((string)$raw, true);
    if (!is_array($data)) {
        throw new InvalidArgumentException('Invalid JSON payload.');
    }
    return $data;
}

function build_where_clause(array $where, array &$params): string {
    if (count($where) === 0) return '';
    $parts = [];
    $i = 0;
    foreach ($where as $column => $value) {
        if (!is_string($column)) {
            throw new InvalidArgumentException('Invalid where column.');
        }
        $safeColumn = sanitize_identifier($column);
        $param = ':w' . $i++;
        $parts[] = "`{$safeColumn}` = {$param}";
        $params[$param] = $value;
    }
    return ' WHERE ' . implode(' AND ', $parts);
}

try {
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        http_response_code(204);
        exit;
    }

    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        respond(405, ['ok' => false, 'error' => 'Method not allowed. Use POST.']);
    }

    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && in_array($origin, $CONFIG['allowed_origins'], true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Methods: POST, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, X-Venjs-Key');
    } elseif ($origin !== '') {
        respond(403, ['ok' => false, 'error' => 'Origin not allowed.']);
    }

    $apiKey = trim((string)$CONFIG['api_key']);
    if ($apiKey !== '') {
        $requestKey = (string)($_SERVER['HTTP_X_VENJS_KEY'] ?? '');
        if ($requestKey === '' || !hash_equals($apiKey, $requestKey)) {
            respond(401, ['ok' => false, 'error' => 'Unauthorized request key.']);
        }
    }

    $payload = require_json_payload();
    $op = isset($payload['op']) ? (string)$payload['op'] : '';
    $table = isset($payload['table']) ? (string)$payload['table'] : '';
    $safeTable = ensure_allowed_table($table, $CONFIG['allowed_tables']);

    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $CONFIG['db_host'],
        (int)$CONFIG['db_port'],
        $CONFIG['db_name'],
        $CONFIG['db_charset']
    );
    $pdo = new PDO($dsn, $CONFIG['db_user'], $CONFIG['db_pass'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);

    switch ($op) {
        case 'read': {
            $select = isset($payload['select']) ? sanitize_identifier_list($payload['select']) : ['*'];
            $selectSql = $select === ['*'] ? '*' : implode(', ', array_map(fn($c) => "`{$c}`", $select));

            $params = [];
            $where = is_array($payload['where'] ?? null) ? $payload['where'] : [];
            $whereSql = build_where_clause($where, $params);

            $orderBySql = '';
            if (isset($payload['orderBy']) && is_string($payload['orderBy']) && $payload['orderBy'] !== '') {
                $direction = 'ASC';
                $orderBy = trim($payload['orderBy']);
                if (strpos($orderBy, '-') === 0) {
                    $direction = 'DESC';
                    $orderBy = substr($orderBy, 1);
                }
                $safeOrder = sanitize_identifier($orderBy);
                $orderBySql = " ORDER BY `{$safeOrder}` {$direction}";
            }

            $limitSql = '';
            if (isset($payload['limit'])) {
                $limit = (int)$payload['limit'];
                if ($limit < 1 || $limit > 500) {
                    throw new InvalidArgumentException('limit must be between 1 and 500.');
                }
                $limitSql = " LIMIT {$limit}";
            }

            $offsetSql = '';
            if (isset($payload['offset'])) {
                $offset = (int)$payload['offset'];
                if ($offset < 0) {
                    throw new InvalidArgumentException('offset must be >= 0.');
                }
                $offsetSql = " OFFSET {$offset}";
            }

            $sql = "SELECT {$selectSql} FROM `{$safeTable}`{$whereSql}{$orderBySql}{$limitSql}{$offsetSql}";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $rows = $stmt->fetchAll();
            respond(200, ['ok' => true, 'data' => $rows, 'count' => count($rows)]);
        }

        case 'create': {
            $data = $payload['data'] ?? null;
            if (!is_array($data) || count($data) === 0) {
                throw new InvalidArgumentException('create requires non-empty data object.');
            }

            $columns = [];
            $placeholders = [];
            $params = [];
            $i = 0;
            foreach ($data as $column => $value) {
                if (!is_string($column)) {
                    throw new InvalidArgumentException('Invalid create column.');
                }
                $safeColumn = sanitize_identifier($column);
                $param = ':c' . $i++;
                $columns[] = "`{$safeColumn}`";
                $placeholders[] = $param;
                $params[$param] = $value;
            }

            $sql = "INSERT INTO `{$safeTable}` (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $placeholders) . ")";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            respond(201, ['ok' => true, 'data' => ['id' => $pdo->lastInsertId()]]);
        }

		case 'register': {
            $data = $payload['data'] ?? null;
            if (!is_array($data) || count($data) === 0) {
                throw new InvalidArgumentException('register requires non-empty data object.');
            }

            // Hash the password before storing it
			if (isset($data['password'])) {
				$data['password_hash'] = password_hash($data['password'], PASSWORD_DEFAULT);
				unset($data['password']);
			}

            $columns = [];
            $placeholders = [];
            $params = [];
            $i = 0;
            foreach ($data as $column => $value) {
                if (!is_string($column)) {
                    throw new InvalidArgumentException('Invalid register column.');
                }
                $safeColumn = sanitize_identifier($column);
                $param = ':c' . $i++;
                $columns[] = "`{$safeColumn}`";
                $placeholders[] = $param;
                $params[$param] = $value;
            }
            $sql = "INSERT INTO `{$safeTable}` (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $placeholders) . ")";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            respond(201, ['ok' => true, 'data' => ['id' => $pdo->lastInsertId()]]);
        }
        case 'update': {
            $where = $payload['where'] ?? null;
            $data = $payload['data'] ?? null;
            if (!is_array($where) || count($where) === 0) {
                throw new InvalidArgumentException('update requires a non-empty where object.');
            }
            if (!is_array($data) || count($data) === 0) {
                throw new InvalidArgumentException('update requires a non-empty data object.');
            }

            $sets = [];
            $params = [];
            $i = 0;
            foreach ($data as $column => $value) {
                if (!is_string($column)) {
                    throw new InvalidArgumentException('Invalid update column.');
                }
                $safeColumn = sanitize_identifier($column);
                $param = ':u' . $i++;
                $sets[] = "`{$safeColumn}` = {$param}";
                $params[$param] = $value;
            }

            $whereSql = build_where_clause($where, $params);
            $sql = "UPDATE `{$safeTable}` SET " . implode(', ', $sets) . $whereSql;
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            respond(200, ['ok' => true, 'data' => ['affectedRows' => $stmt->rowCount()]]);
        }

        case 'delete': {
            $where = $payload['where'] ?? null;
            if (!is_array($where) || count($where) === 0) {
                throw new InvalidArgumentException('delete requires a non-empty where object.');
            }

            $params = [];
            $whereSql = build_where_clause($where, $params);
            $sql = "DELETE FROM `{$safeTable}`{$whereSql}";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            respond(200, ['ok' => true, 'data' => ['affectedRows' => $stmt->rowCount()]]);
        }

        case 'exists': {
            $where = $payload['where'] ?? null;
            if (!is_array($where) || count($where) === 0) {
                throw new InvalidArgumentException('exists requires a non-empty where object.');
            }

            $params = [];
            $whereSql = build_where_clause($where, $params);
            $sql = "SELECT 1 FROM `{$safeTable}`{$whereSql} LIMIT 1";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            $exists = (bool)$stmt->fetchColumn();
            respond(200, ['ok' => true, 'data' => ['exists' => $exists]]);
        }

        case 'login': {
            $credentials = $payload['credentials'] ?? null;
            $loginConfig = $payload['login'] ?? null;
            if (!is_array($credentials) || !is_array($loginConfig)) {
                throw new InvalidArgumentException('login requires credentials and login config.');
            }

            $userField = sanitize_identifier((string)($loginConfig['userField'] ?? 'email'));
            $passField = sanitize_identifier((string)($loginConfig['passField'] ?? 'password_hash'));
            $userValue = (string)($credentials[$userField] ?? '');
            $password = (string)($credentials['password'] ?? '');

            if ($userValue === '' || $password === '') {
                respond(400, ['ok' => false, 'error' => 'Missing login credentials.']);
            }

            $select = isset($payload['select']) ? sanitize_identifier_list($payload['select']) : ['id', $userField];
            if (!in_array($passField, $select, true)) {
                $select[] = $passField;
            }
            $selectSql = implode(', ', array_map(fn($c) => "`{$c}`", $select));

            $sql = "SELECT {$selectSql} FROM `{$safeTable}` WHERE `{$userField}` = :u LIMIT 1";
            $stmt = $pdo->prepare($sql);
            $stmt->execute([':u' => $userValue]);
            $row = $stmt->fetch();

            if (!$row || !isset($row[$passField]) || !password_verify($password, (string)$row[$passField])) {
                respond(401, ['ok' => false, 'error' => 'Invalid credentials.']);
            }

            unset($row[$passField]);
            respond(200, ['ok' => true, 'data' => $row]);
        }

        default:
            respond(400, ['ok' => false, 'error' => 'Unsupported operation.']);
    }
} catch (Throwable $e) {
    $message = $CONFIG['debug'] ? $e->getMessage() : 'Request failed.';
    respond(500, ['ok' => false, 'error' => $message]);
}
