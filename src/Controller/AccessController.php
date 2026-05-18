<?php

declare(strict_types=1);

namespace App\Controller;

use App\ClickHouse\ConnectionManager;
use App\ClickHouse\QueryBuilder;
use App\ClickHouse\TargetNotQueryableException;
use App\Topology\Target;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

final class AccessController extends AbstractController
{
    public function __construct(
        private readonly ConnectionManager $connectionManager,
        private readonly QueryBuilder $queryBuilder,
    ) {}

    #[Route('/api/access-overview', name: 'api_access_overview', methods: ['GET'])]
    public function accessOverview(Target $target): JsonResponse
    {
        if (!$target->isQueryable()) {
            return $this->json([
                'target' => $target->toJson(),
                'sleeping' => true,
                'users' => [],
                'roles' => [],
                'user_roles' => [],
                'user_grants' => [],
                'role_grants' => [],
            ]);
        }

        try {
            $client = $this->connectionManager->clientFor($target);
        } catch (TargetNotQueryableException) {
            return $this->json([
                'target' => $target->toJson(),
                'sleeping' => true,
                'users' => [],
                'roles' => [],
                'user_roles' => [],
                'user_grants' => [],
                'role_grants' => [],
            ]);
        }

        $users = $client->select($this->queryBuilder->queryLogLastUserActivitySql($target))->rows();

        $roles = $client->select('SELECT name FROM system.roles ORDER BY name')->rows();

        $userRoles = $client->select(
            'SELECT user_name, granted_role_name AS role_name FROM system.role_grants ORDER BY user_name, role_name'
        )->rows();

        $userGrants = $client->select(
            'SELECT user_name, access_type, database, `table` AS table_name, column FROM system.grants WHERE user_name != \'\' ORDER BY user_name, access_type, database, table_name, column'
        )->rows();

        $roleGrants = $client->select(
            'SELECT role_name, access_type, database, `table` AS table_name, column FROM system.grants WHERE role_name != \'\' ORDER BY role_name, access_type, database, table_name, column'
        )->rows();

        return $this->json([
            'target' => $target->toJson(),
            'users' => $users,
            'roles' => $roles,
            'user_roles' => $userRoles,
            'user_grants' => $userGrants,
            'role_grants' => $roleGrants,
        ]);
    }

    #[Route('/users', name: 'users_page', methods: ['GET'])]
    public function usersPage(): Response
    {
        return $this->render('users.html.twig');
    }

    #[Route('/api/drop-clickhouse-user/{user}', name: 'api_drop_clickhouse_user', methods: ['GET', 'POST', 'DELETE'])]
    public function dropClickhouseUser(Target $target, string $user): JsonResponse
    {
        try {
            $client = $this->connectionManager->clientFor($target);
            $client->write($this->queryBuilder->dropUserSql($target, $user));
        } catch (TargetNotQueryableException $e) {
            return $this->json(['status' => false, 'exception' => $e->getMessage()]);
        }

        return $this->json(['status' => 'ok', 'message' => "User {$user} has been dropped"]);
    }
}
