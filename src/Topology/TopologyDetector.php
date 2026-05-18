<?php

declare(strict_types=1);

namespace App\Topology;

use App\Service\ClickHouseClient;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;

/**
 * Decides {@see TopologyMode} from env + (optional) SQL probe. Does NOT talk to Cloud API —
 * that's handled by {@see TopologyProvider} in cloud mode.
 *
 * Detection order:
 *  1. CLICKHOUSE_MODE env override (if set and valid).
 *  2. Cloud credentials present → cloud.
 *  3. SQL probe on system.clusters (excluding Cloud-specific 'default' and 'all_groups.%'):
 *     non-empty → cluster, else single.
 *  4. Fallback: single.
 */
final class TopologyDetector
{
    public function __construct(
        private readonly TopologyConfig $config,
        private readonly ClickHouseClient $defaultClient,
        private readonly LoggerInterface $logger = new NullLogger(),
    ) {}

    /**
     * @return array{mode: TopologyMode, detectedClusterName: ?string}
     */
    public function detect(): array
    {
        $override = strtolower(trim($this->config->modeOverride));
        if ($override !== '') {
            $mode = TopologyMode::tryFrom($override);
            if ($mode !== null) {
                $cluster = $mode === TopologyMode::Cluster
                    ? ($this->config->clusterNameOverride !== '' ? $this->config->clusterNameOverride : $this->probeClusterName())
                    : null;

                return ['mode' => $mode, 'detectedClusterName' => $cluster];
            }
        }

        if ($this->config->hasCloudCredentials()) {
            return ['mode' => TopologyMode::Cloud, 'detectedClusterName' => null];
        }

        $clusterName = $this->probeClusterName();
        if ($clusterName !== null && $clusterName !== '') {
            return ['mode' => TopologyMode::Cluster, 'detectedClusterName' => $clusterName];
        }

        return ['mode' => TopologyMode::Single, 'detectedClusterName' => null];
    }

    /**
     * Returns the "real" self-hosted cluster name (excluding Cloud-specific 'default' and 'all_groups.*'),
     * or null if no such cluster exists (single-node or Cloud misdetected-as-cluster).
     */
    private function probeClusterName(): ?string
    {
        try {
            $row = $this->defaultClient->client->select(
                "SELECT cluster FROM system.clusters WHERE is_local = 1 AND cluster NOT IN ('default') AND cluster NOT LIKE 'all_groups.%' ORDER BY cluster LIMIT 1"
            )->fetchRow('cluster');

            return is_string($row) && $row !== '' ? $row : null;
        } catch (\Throwable $e) {
            $this->logger->notice(
                'Cluster probe failed; falling back to single mode.',
                ['error' => $e->getMessage()],
            );
            return null;
        }
    }
}
