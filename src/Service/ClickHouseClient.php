<?php

declare(strict_types=1);

namespace App\Service;

use ClickHouseDB\Client;

/**
 * Class ClickHouseClient
 * @package App\Service
 */
class ClickHouseClient
{
    /**
     * @var Client
     */
    public $client;

    /**
     * ClickHouseClient constructor.
     * @param string $host
     * @param string $port
     * @param string $username
     * @param string $password
     * @param string $dbName
     */
    public function __construct(string $host, string $port, string $username, string $password, string $dbName)
    {
        $this->client = new Client(
            [
                'host'     => $host,
                'port'     => $port,
                'username' => $username,
                'password' => $password
            ]
        );
        $this->client->database($dbName);
    }
}