<?php

declare(strict_types=1);

namespace App\Cloud;

use App\Topology\Target;
use App\Topology\TargetState;
use App\Topology\Topology;
use App\Topology\TopologyConfig;
use App\Topology\TopologyMode;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;

/**
 * Assembles a {@see Topology} from Cloud API responses. Called by
 * {@see \App\Topology\TopologyProvider} when mode=cloud.
 *
 * Rules:
 *  - Optional allowlist (CLICKHOUSE_CLOUD_SERVICE_ALLOWLIST) filters the service list.
 *  - Services with unknown / terminated / failed states are skipped; everything else
 *    (including idle/stopped) is returned so the UI can render them as sleeping.
 *  - Organization metadata is fetched once to populate Topology.organization.
 */
final class CloudTopologyFactory
{
    public function __construct(
        private readonly CloudApiClient $apiClient,
        private readonly TopologyConfig $config,
        private readonly LoggerInterface $logger = new NullLogger(),
    ) {}

    public function build(): Topology
    {
        $orgId = $this->apiClient->resolveOrganizationId();
        $orgName = $this->resolveOrganizationName($orgId);
        $services = $this->apiClient->listServices($orgId);

        $allowlist = $this->config->cloudServiceAllowlistIds();
        if ($allowlist !== []) {
            $services = array_values(array_filter($services, static fn (CloudService $s) => in_array($s->id, $allowlist, true)));
        }

        $targets = [];
        $warehouseId = null;
        foreach ($services as $service) {
            $target = $this->buildTarget($service, $orgId);
            if ($target === null) {
                continue;
            }
            $targets[] = $target;
            if ($warehouseId === null && $service->dataWarehouseId !== null && $service->dataWarehouseId !== '') {
                $warehouseId = $service->dataWarehouseId;
            }
        }

        if ($targets === []) {
            $this->logger->warning('Cloud API returned no services for the configured organization/allowlist.');
        }

        return new Topology(
            mode: TopologyMode::Cloud,
            targets: $targets,
            fetchedAt: new \DateTimeImmutable(),
            organizationId: $orgId,
            organizationName: $orgName,
            warehouseId: $warehouseId,
        );
    }

    private function buildTarget(CloudService $service, string $orgId): ?Target
    {
        $state = TargetState::fromCloudApi($service->state);
        if ($state === TargetState::Terminated || $state === TargetState::SoftDeleted) {
            return null;
        }

        $host = $service->httpsHost() ?? $this->config->host;
        $port = $service->httpsPort();

        // Private endpoint mode: connect through the service's private DNS hostname (resolved from the
        // control plane) instead of the public endpoint. Falls back to public when it can't be resolved.
        // The host also feeds the idle-wake /ping in TopologyController, so that stays private too.
        if ($this->config->cloudUsePrivateDns) {
            $host = $this->apiClient->privateDnsHostname($service->id, $orgId) ?? $host;
        }

        return new Target(
            id: $service->id,
            name: $service->name !== '' ? $service->name : $service->id,
            state: $state,
            mode: TopologyMode::Cloud,
            hosts: $host !== '' ? [$host] : $this->config->hostList(),
            port: $port,
            https: true,
            username: $this->config->username,
            password: $this->config->password,
            database: $this->config->database,
            cluster: 'default',
            numReplicas: $service->numReplicas,
            minMemoryGb: $service->minReplicaMemoryGb,
            maxMemoryGb: $service->maxReplicaMemoryGb,
            region: $service->region !== '' ? $service->region : null,
            provider: $service->provider !== '' ? $service->provider : null,
            warehouseId: $service->dataWarehouseId !== '' ? $service->dataWarehouseId : null,
            isPrimary: $service->isPrimary,
            clickhouseVersion: $service->clickhouseVersion,
        );
    }

    private function resolveOrganizationName(string $orgId): ?string
    {
        foreach ($this->apiClient->listOrganizations() as $org) {
            if ($org['id'] === $orgId) {
                return $org['name'];
            }
        }
        return null;
    }
}
