<?php

declare(strict_types=1);

namespace App\Topology;

final readonly class Topology
{
    /**
     * @param list<Target> $targets
     */
    public function __construct(
        public TopologyMode $mode,
        public array $targets,
        public \DateTimeImmutable $fetchedAt,
        public ?string $organizationId = null,
        public ?string $organizationName = null,
        public ?string $warehouseId = null,
    ) {}

    public function findTargetById(string $id): ?Target
    {
        foreach ($this->targets as $target) {
            if ($target->id === $id) {
                return $target;
            }
        }

        return null;
    }

    public function primaryTarget(): ?Target
    {
        foreach ($this->targets as $target) {
            if ($target->isPrimary === true) {
                return $target;
            }
        }

        return $this->targets[0] ?? null;
    }

    public function firstQueryable(): ?Target
    {
        foreach ($this->targets as $target) {
            if ($target->isQueryable()) {
                return $target;
            }
        }

        return null;
    }

    public function toJson(): array
    {
        return [
            'mode' => $this->mode->value,
            'organization' => $this->organizationId !== null
                ? ['id' => $this->organizationId, 'name' => $this->organizationName]
                : null,
            'warehouseId' => $this->warehouseId,
            'targets' => array_map(static fn (Target $t) => $t->toJson(), $this->targets),
            'fetchedAt' => $this->fetchedAt->format(\DateTimeInterface::ATOM),
        ];
    }
}
