<?php

declare(strict_types=1);

namespace App\Cloud;

/**
 * DTO for a single service entry from GET /v1/organizations/{orgId}/services.
 * Field subset is curated to what chadmin actually uses; full schema is much wider.
 */
final readonly class CloudService
{
    /**
     * @param list<array{protocol: string, host: string, port: int, username?: ?string}> $endpoints
     */
    public function __construct(
        public string $id,
        public string $name,
        public string $state,
        public string $provider,          // aws | gcp | azure
        public string $region,
        public array $endpoints,
        public ?string $clickhouseVersion,
        public ?int $numReplicas,
        public ?int $minReplicaMemoryGb,
        public ?int $maxReplicaMemoryGb,
        public bool $idleScaling,
        public ?int $idleTimeoutMinutes,
        public ?string $dataWarehouseId,
        public ?bool $isPrimary,
        public ?bool $isReadonly,
    ) {}

    /** Returns the HTTPS endpoint host, or null if the service exposes none. */
    public function httpsHost(): ?string
    {
        foreach ($this->endpoints as $ep) {
            if (($ep['protocol'] ?? '') === 'https') {
                return $ep['host'] ?? null;
            }
        }
        return null;
    }

    public function httpsPort(): int
    {
        foreach ($this->endpoints as $ep) {
            if (($ep['protocol'] ?? '') === 'https') {
                return $ep['port'] ?? 8443;
            }
        }
        return 8443;
    }

    /** @param array<string, mixed> $raw Response row from Cloud API. */
    public static function fromArray(array $raw): self
    {
        $endpoints = [];
        foreach ((array) ($raw['endpoints'] ?? []) as $ep) {
            if (!is_array($ep)) {
                continue;
            }
            $endpoints[] = [
                'protocol' => (string) ($ep['protocol'] ?? ''),
                'host' => (string) ($ep['host'] ?? ''),
                'port' => (int) ($ep['port'] ?? 0),
                'username' => isset($ep['username']) ? (string) $ep['username'] : null,
            ];
        }

        // New pricing uses replica* fields; legacy uses min/maxTotalMemoryGb. Prefer new.
        $minMemory = isset($raw['minReplicaMemoryGb']) ? (int) $raw['minReplicaMemoryGb'] : null;
        $maxMemory = isset($raw['maxReplicaMemoryGb']) ? (int) $raw['maxReplicaMemoryGb'] : null;

        return new self(
            id: (string) ($raw['id'] ?? ''),
            name: (string) ($raw['name'] ?? ''),
            state: (string) ($raw['state'] ?? 'unknown'),
            provider: (string) ($raw['provider'] ?? ''),
            region: (string) ($raw['region'] ?? ''),
            endpoints: $endpoints,
            clickhouseVersion: isset($raw['clickhouseVersion']) ? (string) $raw['clickhouseVersion'] : null,
            numReplicas: isset($raw['numReplicas']) ? (int) $raw['numReplicas'] : null,
            minReplicaMemoryGb: $minMemory,
            maxReplicaMemoryGb: $maxMemory,
            idleScaling: (bool) ($raw['idleScaling'] ?? false),
            idleTimeoutMinutes: isset($raw['idleTimeoutMinutes']) ? (int) $raw['idleTimeoutMinutes'] : null,
            dataWarehouseId: isset($raw['dataWarehouseId']) ? (string) $raw['dataWarehouseId'] : null,
            isPrimary: isset($raw['isPrimary']) ? (bool) $raw['isPrimary'] : null,
            isReadonly: isset($raw['isReadonly']) ? (bool) $raw['isReadonly'] : null,
        );
    }
}
