<?php

namespace App\Controller;

use App\Service\ClickHouseClient;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Annotation\Route;

class UserController extends AbstractController
{
    /**
     * @param ClickHouseClient $client
     * @return Response
     * @Route("/user/list", name="user_list")
     */
    public function list(ClickHouseClient $client): Response
    {

        $users = $client->client->select('SELECT 
    u.name,
    u.id,
    u.storage, 
    groupArray(g.granted_role_name) AS roles
FROM system.users AS u
LEFT JOIN system.role_grants AS g ON g.user_name = u.name
GROUP BY 
    u.name,
    u.id,
    u.storage
ORDER BY roles,name desc')->rows();
//        dd($users);

        return $this->render('user_list.html.twig', ['users' => $users, 'user' => null]);
    }

    /**
     * @param string $userName
     * @param ClickHouseClient $client
     * @return Response
     * @Route("/user/{userName}", name="user")
     */
    public function user(string $userName, ClickHouseClient $client): Response
    {

        $users = $client->client->selectAsync('SELECT 
    u.name,
    u.id,
    u.storage, 
    groupArray(g.granted_role_name) AS roles
FROM system.users AS u
LEFT JOIN system.role_grants AS g ON g.user_name = u.name
GROUP BY 
    u.name,
    u.id,
    u.storage
ORDER BY roles desc');

        $user = $client->client->selectAsync('SELECT 
    u.name,
    u.id,
    u.storage, 
    groupArray(g.granted_role_name) AS roles
FROM system.users AS u
LEFT JOIN system.role_grants AS g ON g.user_name = u.name
WHERE u.name=:name
GROUP BY 
    u.name,
    u.id,
    u.storage
ORDER BY u.name', ['name' => $userName]);

        $userGrants = $client->client->selectAsync('show grants for {user}', ['user' => $userName]);
        $roleGrants = [];
        $client->client->executeAsync();
        $users = $users->rows();
        $user = $user->fetchRow();
        $user['grants'] = $userGrants->rows();
        foreach ($user['roles'] as $role) {
            $roleGrants[$role] = $client->client->selectAsync('show grants for {role}', ['role' => $role]);
        }
        $client->client->executeAsync();

        foreach ($roleGrants as $role => $roleGrant) {
            $roleGrant = $roleGrant->rows();
            foreach ($roleGrant as $grants) {
                $user['grants'][] = $grants;
            }
        }

        return $this->render('user_list.html.twig', ['users' => $users, 'user' => $user]);
    }

    /**
     * @param ClickHouseClient $client
     * @return Response
     * @Route("/user/roles", name="roles")
     */
    public function roles(ClickHouseClient $client): Response
    {

        $users = $client->client->select('select * from system.roles')->rows();
        dd($users);
        $processes = [];
        $processesQueries = [];

        return $this->render('running_queries.html.twig', ['processes' => $processes]);
    }
}
