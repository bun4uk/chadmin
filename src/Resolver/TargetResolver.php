<?php

declare(strict_types=1);

namespace App\Resolver;

use App\Topology\Target;
use App\Topology\TopologyProvider;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Controller\ValueResolverInterface;
use Symfony\Component\HttpKernel\ControllerMetadata\ArgumentMetadata;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Resolves a controller argument of type {@see Target}:
 *  - reads `?target=<id>` from querystring;
 *  - falls back to primary Target in Topology (first cloud primary / cluster / single node);
 *  - 404 if an explicit target id is not in Topology.
 */
final class TargetResolver implements ValueResolverInterface
{
    public function __construct(private readonly TopologyProvider $topologyProvider) {}

    public function resolve(Request $request, ArgumentMetadata $argument): iterable
    {
        if ($argument->getType() !== Target::class) {
            return [];
        }

        $topology = $this->topologyProvider->getTopology();
        $requestedId = $request->query->get('target');

        if (is_string($requestedId) && $requestedId !== '') {
            $target = $topology->findTargetById($requestedId);
            if ($target === null) {
                throw new NotFoundHttpException(sprintf('Target "%s" not found in current topology.', $requestedId));
            }
            yield $target;
            return;
        }

        $primary = $topology->primaryTarget();
        if ($primary === null) {
            if ($argument->isNullable()) {
                yield null;
                return;
            }
            throw new NotFoundHttpException('No targets available in current topology.');
        }

        yield $primary;
    }
}
