<?php

declare(strict_types=1);

namespace App\Resolver;

use App\Service\ClickHouseClient;
use ClickHouseDB\Client;
use Generator;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Controller\ArgumentValueResolverInterface;
use Symfony\Component\HttpKernel\ControllerMetadata\ArgumentMetadata;

/**
 * Class ClusterNameResolver
 * @package App\Resolver
 */
class ClusterNameResolver implements ArgumentValueResolverInterface
{
    /**
     * @var Client
     */
    private Client $clickHouseClient;

    /**
     * ClusterNameResolver constructor.
     * @param ClickHouseClient $clickHouseClient
     */
    public function __construct(ClickHouseClient $clickHouseClient)
    {
        $this->clickHouseClient = $clickHouseClient->client;
    }

    /**
     * Whether this resolver can resolve the value for the given ArgumentMetadata.
     *
     * @param Request $request
     * @param ArgumentMetadata $argument
     *
     * @return bool
     */
    public function supports(Request $request, ArgumentMetadata $argument): bool
    {

        return $argument->getType() === 'string' && $argument->getName() === 'cluster';
    }

    /**
     * @param Request $request
     * @param ArgumentMetadata $argument
     *
     * @return Generator
     */
    public function resolve(
        Request $request,
        ArgumentMetadata $argument
    ): Generator
    {
        yield $this->clickHouseClient->select('select cluster from system.clusters limit 1')->fetchRow('cluster');
    }
}