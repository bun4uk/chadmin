<?php

declare(strict_types=1);

namespace App\Topology;

/**
 * Centralizes env-var reading so TopologyProvider / ConnectionManager / CloudApiClient
 * all share a single source of truth. Built via DI with bound env() parameters.
 */
final readonly class TopologyConfig
{
    public function __construct(
        public string $modeOverride,        // CLICKHOUSE_MODE: cloud | cluster | single | ''
        public string $host,                // CLICKHOUSE_HOST (comma-separated list allowed)
        public string $port,                // CLICKHOUSE_PORT
        public string $username,            // CLICKHOUSE_USERNAME
        public string $password,            // CLICKHOUSE_PASSWORD
        public string $database,            // CLICKHOUSE_DB_NAME
        public bool $https,                 // CLICKHOUSE_HTTPS
        public string $clusterNameOverride, // CLICKHOUSE_CLUSTER_NAME (used only in forced cluster mode)
        public string $cloudKeyId,          // CLICKHOUSE_CLOUD_KEY_ID
        public string $cloudKeySecret,      // CLICKHOUSE_CLOUD_KEY_SECRET
        public string $cloudOrgId,          // CLICKHOUSE_CLOUD_ORG_ID
        public string $cloudServiceAllowlist,   // CLICKHOUSE_CLOUD_SERVICE_ALLOWLIST (csv)
    ) {}

    /** @return list<string> Trimmed non-empty host list. */
    public function hostList(): array
    {
        $list = array_map('trim', explode(',', $this->host));
        return array_values(array_filter($list, static fn (string $h) => $h !== ''));
    }

    /** @return list<string> Allowlisted Cloud service IDs, empty = no filter. */
    public function cloudServiceAllowlistIds(): array
    {
        $list = array_map('trim', explode(',', $this->cloudServiceAllowlist));
        return array_values(array_filter($list, static fn (string $h) => $h !== ''));
    }

    public function hasCloudCredentials(): bool
    {
        return $this->cloudKeyId !== '' && $this->cloudKeySecret !== '';
    }

    public function portAsInt(): int
    {
        return $this->port === '' ? 8123 : (int) $this->port;
    }
}
