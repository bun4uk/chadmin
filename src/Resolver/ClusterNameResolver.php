<?php

declare(strict_types=1);

namespace App\Resolver;

use App\Topology\TopologyMode;
use App\Topology\TopologyProvider;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Controller\ValueResolverInterface;
use Symfony\Component\HttpKernel\ControllerMetadata\ArgumentMetadata;

/**
 * Backward-compat resolver for legacy controller argument `?string $cluster = null`.
 *
 * Driven by {@see TopologyProvider} instead of raw SQL (which previously was non-deterministic
 * on ClickHouse Cloud — `SELECT cluster FROM system.clusters LIMIT 1` could return either
 * `default` or `all_groups.default`).
 *
 *  - Cloud: cluster name of the primary target (usually 'default').
 *  - Cluster: the real cluster name.
 *  - Single: null (legacy controllers branch on null = single-node mode).
 */
final class ClusterNameResolver implements ValueResolverInterface
{
    public function __construct(private readonly TopologyProvider $topologyProvider) {}

    public function resolve(Request $request, ArgumentMetadata $argument): iterable
    {
        if ($argument->getType() !== 'string' || $argument->getName() !== 'cluster') {
            return [];
        }

        $topology = $this->topologyProvider->getTopology();
        if ($topology->mode === TopologyMode::Single) {
            yield null;
            return;
        }

        $primary = $topology->primaryTarget();
        yield $primary?->cluster ?: null;
    }
}
