<?php

declare(strict_types=1);

namespace App\Service;

use ClickHouseDB\Client;

/**
 * Thin wrapper around smi2/phpclickhouse Client used for the "default" connection
 * (as configured in .env). Kept for backward-compat with code paths that pre-date
 * {@see \App\ClickHouse\ConnectionManager} (cluster-name probe, Phase 2 Cloud API
 * fallback). Controllers should prefer ConnectionManager when they know a Target.
 */
class ClickHouseClient
{
    /** @var Client */
    public $client;

    /**
     * @param string $hosts    Comma-separated failover list (e.g. "host1,host2,host3").
     * @param string $port
     * @param string $username
     * @param string $password
     * @param string $dbName
     * @param bool   $https    True for ClickHouse Cloud (HTTPS 8443); false for self-hosted HTTP 8123.
     */
    public function __construct(
        string $hosts,
        string $port,
        string $username,
        string $password,
        string $dbName,
        bool $https = false,
    ) {
        $hostList = array_values(array_filter(array_map('trim', explode(',', $hosts)), static fn (string $h) => $h !== ''));
        if ($hostList === []) {
            $hostList = ['localhost'];
        }

        foreach ($hostList as $host) {
            $client = $this->buildClient($host, $port, $username, $password, $dbName, $https);
            $client->setTimeout(2);
            $client->setConnectTimeOut(2);

            if (count($hostList) === 1) {
                // Один хост — не пінгуємо (у Cloud пінг збудить idle service); повертаємо як є.
                $this->client = $client;
                return;
            }

            if ($client->ping()) {
                $client->setTimeout(10);
                $client->setConnectTimeOut(5);
                $this->client = $client;
                return;
            }
        }

        // Якщо жодна нода не відповіла — підключаємось до першої (помилка вилетить при першому запиті).
        $this->client = $this->buildClient($hostList[0], $port, $username, $password, $dbName, $https);
    }

    private function buildClient(
        string $host,
        string $port,
        string $username,
        string $password,
        string $dbName,
        bool $https,
    ): Client {
        $config = [
            'host'     => $host,
            'port'     => $port,
            'username' => $username,
            'password' => $password,
        ];
        if ($https) {
            $config['https'] = true;
        }

        $client = new Client($config);
        $client->database($dbName);

        try {
            $client->settings()->set('skip_unavailable_shards', true);
        } catch (\Throwable) {
            // Readonly Cloud users can't set this; ignore — SQL queries can still append
            // SETTINGS skip_unavailable_shards = 1 inline where supported.
        }

        return $client;
    }
}
