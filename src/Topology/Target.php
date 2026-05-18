<?php

declare(strict_types=1);

namespace App\Topology;

final readonly class Target
{
    /**
     * @param list<string> $hosts  Data-plane hosts (SQL). For self-hosted usually a failover list;
     *                             for Cloud — single host from service endpoint.
     * @param string       $cluster ClickHouse cluster name to use with clusterAllReplicas():
     *                              self-hosted → real cluster name (e.g. "prod_main");
     *                              Cloud per-service → "default";
     *                              single-node → "" (direct FROM system.*).
     */
    public function __construct(
        public string $id,
        public string $name,
        public TargetState $state,
        public TopologyMode $mode,
        public array $hosts,
        public int $port,
        public bool $https,
        public string $username,
        public string $password,
        public string $database,
        public string $cluster,
        public ?int $numReplicas = null,
        public ?int $minMemoryGb = null,
        public ?int $maxMemoryGb = null,
        public ?string $region = null,
        public ?string $provider = null,
        public ?string $warehouseId = null,
        public ?bool $isPrimary = null,
        public ?string $clickhouseVersion = null,
    ) {}

    public function isQueryable(): bool
    {
        return $this->state->isQueryable();
    }

    public function toJson(): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'state' => $this->state->value,
            'queryable' => $this->isQueryable(),
            'mode' => $this->mode->value,
            'numReplicas' => $this->numReplicas,
            'minMemoryGb' => $this->minMemoryGb,
            'maxMemoryGb' => $this->maxMemoryGb,
            'region' => $this->region,
            'provider' => $this->provider,
            'warehouseId' => $this->warehouseId,
            'isPrimary' => $this->isPrimary,
            'clickhouseVersion' => $this->clickhouseVersion,
        ];
    }
}
