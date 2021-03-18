<?php

namespace App\Controller;

use App\Service\ClickHouseClient;
use ClickHouseDB\Exception\QueryException;
use Exception;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

/**
 * Class QueriesController
 * @package App\Controller
 */
class QueriesController extends AbstractController
{
    /**
     * @param string $cluster
     * @param ClickHouseClient $client
     * @return Response
     * @Route("/api/cluster-processes", name="api_cluster_processes")
     */
    public function apiQueries(string $cluster, ClickHouseClient $client): Response
    {
        $nodes = $client->client->select('select * from system.clusters')->rows();

        $processes = [];
        $processesQueries = [];
//dd($nodes);
        for ($i = 0, $count = count($nodes); $i < $count; $i++) {
            $processesQueries[$i] = $client->client->selectAsync(
                <<<SQL
select *, 
       formatReadableSize(memory_usage) as formatted_memory_usage, 
       formatReadableSize(read_bytes) as formatted_read_bytes,  
       formatReadableSize(written_bytes) as formatted_written_bytes
from remote('{$nodes[$i]['host_name']}', 'system', 'processes', '{$client->client->getConnectUsername()}', '{$client->client->getConnectPassword()}')
where elapsed >1
SQL
            );
        }
        $client->client->executeAsync();
        for ($i = 0, $count = count($nodes); $i < $count; $i++) {
            try {
                $processes[$nodes[$i]['host_name']] = $processesQueries[$i]->rows();
            } catch (QueryException $exception) {
            }
        }

        return $this->json(['cluster' => $cluster, 'processes' => $processes]);
    }

    /**
     * @param string $cluster
     * @param string $queryId
     * @param ClickHouseClient $client
     * @return Response
     * @Route("/api/kill-query/{queryId}", name="api_kill_query")
     */
    public function apiKillQuery(string $cluster, string $queryId, ClickHouseClient $client): Response
    {
        try {
            $client->client->write("KILL QUERY ON CLUSTER {$cluster} WHERE query_id='{$queryId}'");

        } catch (Exception $exception) {
            return $this->json(['status' => false, 'query_id' => $queryId]);
        }

        return $this->json(['status' => 'ok', 'query_id' => $queryId]);
    }

    /**
     * @param string $cluster
     * @return JsonResponse
     * @Route("/api/get-cluster-name", name="api_get_cluster_name")
     */
    public function getCluster(string $cluster): JsonResponse
    {
        return $this->json(['cluster' => $cluster]);
    }

    /**
     * @param ClickHouseClient $client
     * @return JsonResponse
     * @Route("/api/get-cluster-list", name="api_get_cluster_list")
     */
    public function getClusterList(ClickHouseClient $client): JsonResponse
    {
        $nodes = $client->client->select('SELECT DISTINCT cluster FROM system.clusters WHERE is_local = 1');
        $clusterList = [];
        while (true) {
            $res = $nodes->fetchRow('cluster');
            if ($res === null) {
                break;
            }
            $clusterList[] = $res;
        }

        return $this->json($clusterList);
    }
}
