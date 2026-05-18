<?php

declare(strict_types=1);

namespace App\Topology;

use App\Cloud\CloudTopologyFactory;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;

/**
 * Single source of truth for the current Topology within a request.
 *
 * In Cloud mode delegates to {@see CloudTopologyFactory} (only registered in Phase 2+).
 * If the factory is unavailable (or throws) the provider falls back to a "degraded" Topology
 * with one target derived from env — service name parsed from the pod hostname when the shape
 * is recognizable, otherwise a placeholder.
 */
final class TopologyProvider
{
    private ?Topology $memoized = null;

    public function __construct(
        private readonly TopologyConfig $config,
        private readonly TopologyDetector $detector,
        private readonly ?CloudTopologyFactory $cloudTopologyFactory = null,
        private readonly LoggerInterface $logger = new NullLogger(),
    ) {}

    public function getTopology(): Topology
    {
        if ($this->memoized !== null) {
            return $this->memoized;
        }

        $detected = $this->detector->detect();
        $mode = $detected['mode'];

        $topology = match ($mode) {
            TopologyMode::Cloud => $this->buildCloudTopology(),
            TopologyMode::Cluster => $this->buildClusterTopology($detected['detectedClusterName'] ?? ''),
            TopologyMode::Single => $this->buildSingleTopology(),
        };

        return $this->memoized = $topology;
    }

    private function buildSingleTopology(): Topology
    {
        $hosts = $this->config->hostList();
        $primary = $hosts[0] ?? 'localhost';

        $target = new Target(
            id: 'local',
            name: $primary,
            state: TargetState::Running,
            mode: TopologyMode::Single,
            hosts: $hosts !== [] ? $hosts : ['localhost'],
            port: $this->config->portAsInt(),
            https: $this->config->https,
            username: $this->config->username,
            password: $this->config->password,
            database: $this->config->database,
            cluster: '',
            numReplicas: 1,
        );

        return new Topology(TopologyMode::Single, [$target], new \DateTimeImmutable());
    }

    private function buildClusterTopology(string $clusterName): Topology
    {
        if ($clusterName === '') {
            $this->logger->warning('Cluster mode detected but cluster name is empty; falling back to single.');
            return $this->buildSingleTopology();
        }

        $hosts = $this->config->hostList();
        $target = new Target(
            id: $clusterName,
            name: $clusterName,
            state: TargetState::Running,
            mode: TopologyMode::Cluster,
            hosts: $hosts,
            port: $this->config->portAsInt(),
            https: $this->config->https,
            username: $this->config->username,
            password: $this->config->password,
            database: $this->config->database,
            cluster: $clusterName,
        );

        return new Topology(TopologyMode::Cluster, [$target], new \DateTimeImmutable());
    }

    private function buildCloudTopology(): Topology
    {
        if ($this->cloudTopologyFactory !== null) {
            try {
                return $this->cloudTopologyFactory->build();
            } catch (\Throwable $e) {
                $this->logger->warning('Cloud topology factory failed; falling back to degraded cloud mode.', [
                    'error' => $e->getMessage(),
                ]);
            }
        }

        return $this->buildDegradedCloudTopology();
    }

    /** Fallback used when CloudApiClient isn't registered or the API is unreachable. */
    private function buildDegradedCloudTopology(): Topology
    {
        $hosts = $this->config->hostList();
        $primary = $hosts[0] ?? '';
        $serviceName = $this->deriveServiceNameFromHost($primary) ?? $primary;

        $target = new Target(
            id: $serviceName !== '' ? $serviceName : 'cloud-fallback',
            name: $serviceName !== '' ? $serviceName : 'ClickHouse Cloud',
            state: TargetState::Running,
            mode: TopologyMode::Cloud,
            hosts: $hosts !== [] ? $hosts : ['localhost'],
            port: $this->config->portAsInt(),
            https: true,  // Cloud is always HTTPS.
            username: $this->config->username,
            password: $this->config->password,
            database: $this->config->database,
            cluster: 'default',
        );

        return new Topology(TopologyMode::Cloud, [$target], new \DateTimeImmutable());
    }

    /**
     * Cloud pod FQDN pattern: `c-<service-name>-server-<uuid>-N.c-<service-name>-server-headless...`
     * or public endpoint like `<prefix>.<region>.<cloud>.clickhouse.cloud`.
     */
    private function deriveServiceNameFromHost(string $host): ?string
    {
        if ($host === '') {
            return null;
        }
        if (preg_match('/^c-(.+?)-server-/', $host, $m)) {
            return $m[1];
        }

        return null;
    }

}
