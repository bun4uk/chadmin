<?php

declare(strict_types=1);

namespace App\ClickHouse;

use App\Topology\Target;
use App\Topology\TopologyMode;

/**
 * Builds SQL that branches on Target mode:
 *  - cluster/cloud per-service → clusterAllReplicas('<clusterName>', system, <table>) + SETTINGS skip_unavailable_shards = 1
 *  - single-node → FROM system.<table>
 */
final class QueryBuilder
{
    public function processesSql(Target $target): string
    {
        if ($this->isSingleNode($target)) {
            return <<<SQL
            SELECT
                q.* EXCEPT fqdn,
                cl.fqdn AS fqdn
            FROM
            (
                SELECT
                    FQDN() AS fqdn,
                    *,
                    formatReadableSize(memory_usage) AS formatted_memory_usage,
                    formatReadableSize(peak_memory_usage) AS formatted_peak_memory_usage,
                    formatReadableSize(read_bytes) AS formatted_read_bytes,
                    formatReadableSize(written_bytes) AS formatted_written_bytes
                FROM system.processes
                WHERE elapsed > 1
            ) AS q
            RIGHT JOIN
            (
                SELECT FQDN() AS fqdn
            ) AS cl ON q.fqdn = cl.fqdn
            ORDER BY fqdn ASC
            SQL;
        }

        $clusterEsc = $this->escapeClusterName($target->cluster);

        return <<<SQL
        SELECT
            q.* EXCEPT fqdn,
            cl.fqdn AS fqdn
        FROM
        (
            SELECT
                FQDN() AS fqdn,
                *,
                formatReadableSize(memory_usage) AS formatted_memory_usage,
                formatReadableSize(peak_memory_usage) AS formatted_peak_memory_usage,
                formatReadableSize(read_bytes) AS formatted_read_bytes,
                formatReadableSize(written_bytes) AS formatted_written_bytes
            FROM clusterAllReplicas('$clusterEsc', system, processes)
            WHERE elapsed > 1
        ) AS q
        RIGHT JOIN
        (
            SELECT fqdn
            FROM
            (
                SELECT FQDN() AS fqdn
                FROM clusterAllReplicas('$clusterEsc', system, clusters)
            )
            GROUP BY fqdn
        ) AS cl ON q.fqdn = cl.fqdn
        ORDER BY fqdn ASC
        SETTINGS skip_unavailable_shards = 1
        SQL;
    }

    public function memoryMetricsSql(Target $target): string
    {
        // CGroup metrics reflect the container/pod limit (Cloud, Docker self-hosted). OSMemory metrics
        // reflect the physical host — misleading for ClickHouse Cloud where pods share a large AWS node.
        // Frontend prefers CGroup when present, falls back to OS for older ClickHouse.
        $metrics = "'CGroupMemoryTotal', 'CGroupMemoryUsed', 'OSMemoryTotal', 'MemoryResident'";

        if ($this->isSingleNode($target)) {
            return <<<SQL
            SELECT
                FQDN() AS fqdn,
                metric,
                CAST(value, 'Int64') AS bytes,
                formatReadableSize(value) AS readable_size
            FROM system.asynchronous_metrics
            WHERE metric IN ($metrics)
            SQL;
        }

        $clusterEsc = $this->escapeClusterName($target->cluster);

        return <<<SQL
        SELECT * FROM (
            SELECT
                FQDN() AS fqdn,
                metric,
                CAST(value, 'Int64') AS bytes,
                formatReadableSize(value) AS readable_size
            FROM clusterAllReplicas('$clusterEsc', system, asynchronous_metrics)
            WHERE metric IN ($metrics)
        )
        ORDER BY fqdn, metric
        SETTINGS skip_unavailable_shards = 1
        SQL;
    }

    public function queryLogLastUserActivitySql(Target $target): string
    {
        if ($this->isSingleNode($target)) {
            $queryLog = 'system.query_log';
        } else {
            $clusterEsc = $this->escapeClusterName($target->cluster);
            $queryLog = "clusterAllReplicas('$clusterEsc', system.query_log)";
        }

        // Повертає список користувачів з їхнім останнім QueryStart-часом; JOIN-иться в контролері з system.users.
        $settings = $this->isSingleNode($target) ? '' : 'SETTINGS skip_unavailable_shards = 1';

        return <<<SQL
        SELECT
            u.name,
            q.last_query_at
        FROM system.users AS u
        LEFT JOIN
        (
            SELECT
                initial_user AS name,
                max(event_time) AS last_query_at
            FROM $queryLog
            WHERE type = 'QueryStart'
            GROUP BY initial_user
        ) AS q USING name
        ORDER BY u.name
        $settings
        SQL;
    }

    public function killQuerySql(Target $target, string $queryId): string
    {
        $queryIdEsc = addslashes($queryId);
        if ($this->isSingleNode($target)) {
            return "KILL QUERY WHERE query_id='$queryIdEsc'";
        }

        $clusterEsc = $this->escapeClusterName($target->cluster);

        return "KILL QUERY ON CLUSTER `$clusterEsc` WHERE query_id='$queryIdEsc'";
    }

    public function dropUserSql(Target $target, string $user): string
    {
        $userEsc = str_replace('`', '``', $user);
        if ($this->isSingleNode($target)) {
            return "DROP USER IF EXISTS `$userEsc`";
        }

        $clusterEsc = $this->escapeClusterName($target->cluster);

        return "DROP USER IF EXISTS `$userEsc` ON CLUSTER `$clusterEsc`";
    }

    private function isSingleNode(Target $target): bool
    {
        return $target->mode === TopologyMode::Single || $target->cluster === '';
    }

    /**
     * Cluster names are identifiers (alphanumeric + underscore + dot); escaping a single-quote-injection path.
     */
    private function escapeClusterName(string $name): string
    {
        return str_replace(["'", "\\"], ["''", "\\\\"], $name);
    }
}
