<?php

declare(strict_types=1);

namespace App\Controller;

use App\ClickHouse\ConnectionManager;
use App\ClickHouse\QueryBuilder;
use App\ClickHouse\TargetNotQueryableException;
use App\Topology\Target;
use App\Topology\TopologyProvider;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class QueriesController extends AbstractController
{
    public function __construct(
        private readonly TopologyProvider $topologyProvider,
        private readonly ConnectionManager $connectionManager,
        private readonly QueryBuilder $queryBuilder,
    ) {}

    #[Route('/api/cluster-processes', name: 'api_cluster_processes', methods: ['GET'])]
    public function apiQueries(Target $target): Response
    {
        if (!$target->isQueryable()) {
            return $this->json([
                'cluster' => $target->cluster !== '' ? $target->cluster : null,
                'target' => $target->toJson(),
                'sleeping' => true,
                'processes' => (object) [],
                'memory_metrics' => (object) [],
            ]);
        }

        try {
            $client = $this->connectionManager->clientFor($target);
        } catch (TargetNotQueryableException) {
            return $this->json([
                'cluster' => $target->cluster !== '' ? $target->cluster : null,
                'target' => $target->toJson(),
                'sleeping' => true,
                'processes' => (object) [],
                'memory_metrics' => (object) [],
            ]);
        }

        $processesRows = $client->select($this->queryBuilder->processesSql($target))->rows();
        $memoryRows = $client->select($this->queryBuilder->memoryMetricsSql($target))->rows();

        $processes = [];
        foreach ($processesRows as $row) {
            $fqdn = (string) ($row['fqdn'] ?? '');
            $processes[$fqdn][] = $row;
        }

        $memoryData = [];
        foreach ($memoryRows as $row) {
            $fqdn = (string) ($row['fqdn'] ?? '');
            $metric = (string) ($row['metric'] ?? '');
            $memoryData[$fqdn][$metric] = $row;
        }

        return $this->json([
            'cluster' => $target->cluster !== '' ? $target->cluster : null,
            'target' => $target->toJson(),
            'processes' => $processes !== [] ? $processes : (object) [],
            'memory_metrics' => $memoryData !== [] ? $memoryData : (object) [],
        ]);
    }

    #[Route('/api/kill-query/{queryId}', name: 'api_kill_query', methods: ['GET', 'POST', 'DELETE'])]
    public function apiKillQuery(Target $target, string $queryId): Response
    {
        try {
            $client = $this->connectionManager->clientFor($target);
            $client->write($this->queryBuilder->killQuerySql($target, $queryId));
        } catch (TargetNotQueryableException $e) {
            return $this->json([
                'status' => false,
                'query_id' => $queryId,
                'exception' => $e->getMessage(),
            ]);
        } catch (\Throwable $e) {
            return $this->json([
                'status' => false,
                'query_id' => $queryId,
                'exception' => $e->getMessage(),
            ]);
        }

        return $this->json(['status' => 'ok', 'query_id' => $queryId]);
    }

    /**
     * Legacy endpoint — kept for frontend back-compat. Returns the primary target's cluster name
     * (or null in single mode).
     */
    #[Route('/api/get-cluster-name', name: 'api_get_cluster_name', methods: ['GET'])]
    public function getCluster(?string $cluster = null): JsonResponse
    {
        return $this->json(['cluster' => $cluster]);
    }

    /**
     * Legacy endpoint — frontend uses this to populate its cluster dropdown.
     * Now derived from Topology targets.
     */
    #[Route('/api/get-cluster-list', name: 'api_get_cluster_list', methods: ['GET'])]
    public function getClusterList(): JsonResponse
    {
        $topology = $this->topologyProvider->getTopology();
        $names = [];
        foreach ($topology->targets as $target) {
            if ($target->cluster !== '' && !in_array($target->cluster, $names, true)) {
                $names[] = $target->cluster;
            }
        }

        return $this->json($names);
    }
}
