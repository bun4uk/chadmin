<?php

declare(strict_types=1);

namespace App\ClickHouse;

use App\Topology\Target;
use ClickHouseDB\Client;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;

/**
 * Instantiates smi2/phpclickhouse clients per Target, lazy and cached in-request.
 *
 *  - Self-hosted / Cloud single service з кількома host-failover candidates → pings each (2s) і бере перший живий.
 *  - Cloud idle/stopped targets → NEVER instantiate (would wake). `clientFor()` кидає TargetNotQueryableException.
 *  - `skip_unavailable_shards` ставиться best-effort — readonly SQL users у Cloud його заборонити; тоді просто
 *    логуємо warning і працюємо без.
 */
final class ConnectionManager
{
    /** @var array<string, Client> Кеш на запит: key = target id. */
    private array $clients = [];

    public function __construct(
        private readonly LoggerInterface $logger = new NullLogger(),
    ) {}

    /**
     * @throws TargetNotQueryableException
     */
    public function clientFor(Target $target): Client
    {
        if (!$target->isQueryable()) {
            throw new TargetNotQueryableException($target);
        }

        if (isset($this->clients[$target->id])) {
            return $this->clients[$target->id];
        }

        return $this->clients[$target->id] = $this->createClient($target);
    }

    private function createClient(Target $target): Client
    {
        $hosts = $target->hosts;
        if (count($hosts) === 0) {
            throw new \InvalidArgumentException(sprintf('Target "%s" has no hosts configured.', $target->name));
        }

        $preferFailover = count($hosts) > 1;
        foreach ($hosts as $host) {
            $client = $this->buildClient($host, $target);
            if (!$preferFailover) {
                // Cloud або single host: не пінгуємо — пінг може збудити idle сервіс і створює непотрібний RTT.
                return $client;
            }

            $client->setTimeout(2);
            $client->setConnectTimeOut(2);
            if ($client->ping()) {
                $client->setTimeout(10);
                $client->setConnectTimeOut(5);

                return $client;
            }
        }

        // Жодна нода не відповіла — fallback на перший host, помилка вилетить при першому запиті.
        return $this->buildClient($hosts[0], $target);
    }

    private function buildClient(string $host, Target $target): Client
    {
        $config = [
            'host'     => $host,
            'port'     => (string) $target->port,
            'username' => $target->username,
            'password' => $target->password,
        ];
        if ($target->https) {
            $config['https'] = true;
        }

        $client = new Client($config);
        $client->database($target->database);

        try {
            $client->settings()->set('skip_unavailable_shards', true);
        } catch (\Throwable $e) {
            $this->logger->warning(
                'Could not set skip_unavailable_shards (probably readonly user); continuing without.',
                ['target' => $target->name, 'error' => $e->getMessage()],
            );
        }

        return $client;
    }
}
