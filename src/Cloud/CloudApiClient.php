<?php

declare(strict_types=1);

namespace App\Cloud;

use App\Topology\TopologyConfig;
use Psr\Log\LoggerInterface;
use Psr\Log\NullLogger;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Symfony\Contracts\HttpClient\Exception\TransportExceptionInterface;

/**
 * ClickHouse Cloud control-plane REST client.
 *
 *   Auth: HTTP Basic (key ID + key secret from CLICKHOUSE_CLOUD_KEY_ID / _SECRET).
 *   Base: https://api.clickhouse.cloud/v1
 *   Response envelope: every endpoint returns { status, requestId, result | error }.
 *
 * Important: calls to `api.clickhouse.cloud` are control-plane — they do NOT wake idle services.
 * Only data-plane HTTPS/native hits the service and wakes it. We strictly avoid the data-plane
 * for state queries.
 */
final class CloudApiClient
{
    private const BASE_URI = 'https://api.clickhouse.cloud/v1/';
    private const CACHE_TTL_SERVICES = 30;       // seconds — service list + states
    private const CACHE_TTL_ORGANIZATIONS = 300; // seconds — orgs almost never change
    private const CACHE_TTL_PRIVATE_DNS = 300;   // seconds — private endpoint config is effectively static
    private const CACHE_TTL_PRIVATE_DNS_MISS = 30; // seconds — re-probe soon after a transient failure

    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly TopologyConfig $config,
        private readonly ?CacheInterface $cache = null,
        private readonly LoggerInterface $logger = new NullLogger(),
    ) {}

    /**
     * Invalidates cached services list — call after a wake action so the next topology
     * fetch picks up the new state immediately instead of after TTL expiry.
     */
    public function invalidateServicesCache(?string $orgId = null): void
    {
        if ($this->cache === null) {
            return;
        }
        $orgId = $orgId ?? $this->config->cloudOrgId;
        if ($orgId === '') {
            return;
        }
        $this->cache->delete($this->servicesCacheKey($orgId));
    }

    /**
     * @return list<array{id: string, name: string}>
     */
    public function listOrganizations(): array
    {
        $compute = function (): array {
            $payload = $this->request('GET', 'organizations');
            $out = [];
            foreach ((array) $payload as $org) {
                if (is_array($org) && isset($org['id'], $org['name'])) {
                    $out[] = ['id' => (string) $org['id'], 'name' => (string) $org['name']];
                }
            }
            return $out;
        };

        if ($this->cache === null) {
            return $compute();
        }
        return $this->cache->get('chadmin.cloud.organizations', function (ItemInterface $item) use ($compute) {
            $item->expiresAfter(self::CACHE_TTL_ORGANIZATIONS);
            return $compute();
        });
    }

    /**
     * Resolves the org id to use: CLICKHOUSE_CLOUD_ORG_ID if set, otherwise auto-derived
     * when the key has access to exactly one org. Throws if ambiguous.
     */
    public function resolveOrganizationId(): string
    {
        if ($this->config->cloudOrgId !== '') {
            return $this->config->cloudOrgId;
        }

        $orgs = $this->listOrganizations();
        if (count($orgs) === 1) {
            return $orgs[0]['id'];
        }
        if ($orgs === []) {
            throw new CloudApiException('Cloud API key has access to no organizations.');
        }
        throw new CloudApiException(sprintf(
            'Cloud API key has access to %d organizations; set CLICKHOUSE_CLOUD_ORG_ID to select one.',
            count($orgs),
        ));
    }

    /**
     * Lists all services in the resolved organization. Control-plane only — does NOT wake services.
     * Cached for {@see self::CACHE_TTL_SERVICES}s; call {@see invalidateServicesCache()} after a
     * wake action to pick up the new state immediately.
     *
     * @return list<CloudService>
     */
    public function listServices(?string $orgId = null): array
    {
        $orgId = $orgId ?? $this->resolveOrganizationId();

        $compute = function () use ($orgId): array {
            $payload = $this->request('GET', sprintf('organizations/%s/services', urlencode($orgId)));
            $services = [];
            foreach ((array) $payload as $row) {
                if (is_array($row)) {
                    $services[] = CloudService::fromArray($row);
                }
            }
            return $services;
        };

        if ($this->cache === null) {
            return $compute();
        }
        return $this->cache->get($this->servicesCacheKey($orgId), function (ItemInterface $item) use ($compute) {
            $item->expiresAfter(self::CACHE_TTL_SERVICES);
            return $compute();
        });
    }

    private function servicesCacheKey(string $orgId): string
    {
        return 'chadmin.cloud.services.' . $orgId;
    }

    /**
     * Resolves a service's private endpoint DNS hostname from
     * GET /v1/organizations/{orgId}/services/{serviceId}/privateEndpointConfig.
     *
     * Control-plane only — does NOT wake the service. Used when CLICKHOUSE_CLOUD_USE_PRIVATE_DNS
     * is on so the data-plane SQL connection (and the idle-wake /ping) goes through the private
     * endpoint instead of the public one. Returns null when no private endpoint is configured or
     * the lookup fails, so the caller can fall back to the public endpoint.
     */
    public function privateDnsHostname(string $serviceId, ?string $orgId = null): ?string
    {
        $orgId = $orgId ?? $this->resolveOrganizationId();

        $compute = function () use ($orgId, $serviceId): ?string {
            try {
                $payload = $this->request('GET', sprintf(
                    'organizations/%s/services/%s/privateEndpointConfig',
                    urlencode($orgId),
                    urlencode($serviceId),
                ));
            } catch (CloudApiException $e) {
                $this->logger->warning('Failed to resolve private endpoint config; falling back to public endpoint.', [
                    'service' => $serviceId,
                    'error' => $e->getMessage(),
                ]);
                return null;
            }

            $host = is_array($payload) ? trim((string) ($payload['privateDnsHostname'] ?? '')) : '';
            if ($host === '') {
                $this->logger->warning('No private DNS hostname configured for service; falling back to public endpoint.', [
                    'service' => $serviceId,
                ]);
                return null;
            }
            return $host;
        };

        if ($this->cache === null) {
            return $compute();
        }
        return $this->cache->get($this->privateDnsCacheKey($orgId, $serviceId), function (ItemInterface $item) use ($compute) {
            $host = $compute();
            // Positive config is static → long TTL; a miss is likely transient → re-probe soon.
            $item->expiresAfter($host !== null ? self::CACHE_TTL_PRIVATE_DNS : self::CACHE_TTL_PRIVATE_DNS_MISS);
            return $host;
        });
    }

    private function privateDnsCacheKey(string $orgId, string $serviceId): string
    {
        return 'chadmin.cloud.private_dns.' . $orgId . '.' . $serviceId;
    }

    /**
     * Explicit wake — used only on user-initiated action (click "Wake" button).
     *
     *  - `stopped` → PATCH /state with {"command": "start"}.
     *  - `idle` → per Cloud docs, `start` does NOT resume an idle service; only a data-plane
     *    request (e.g. HTTPS /ping) resumes. We call /ping on the HTTPS endpoint.
     */
    public function wakeService(string $serviceId, string $currentState, ?string $httpsHost = null, int $httpsPort = 8443, ?string $orgId = null): void
    {
        $orgId = $orgId ?? $this->resolveOrganizationId();

        $normalized = strtolower($currentState);
        if ($normalized === 'stopped') {
            $this->request(
                'PATCH',
                sprintf('organizations/%s/services/%s/state', urlencode($orgId), urlencode($serviceId)),
                ['command' => 'start'],
            );
            return;
        }

        if ($normalized === 'idle' && $httpsHost !== null && $httpsHost !== '') {
            try {
                $this->httpClient->request('GET', sprintf('https://%s:%d/ping', $httpsHost, $httpsPort), [
                    'timeout' => 3,
                    'max_redirects' => 0,
                ])->getStatusCode();
            } catch (TransportExceptionInterface $e) {
                // Read timeout is EXPECTED for an idle service — the TCP/TLS handshake already
                // delivered the wake signal, but the service can take minutes to answer HTTP.
                // Only genuine connect-level failures (DNS, connection refused, TLS) bubble up.
                if (stripos($e->getMessage(), 'timeout') === false) {
                    throw new CloudApiException('Failed to ping Cloud service to wake it: ' . $e->getMessage(), previous: $e);
                }
                $this->logger->info('Idle wake /ping timed out (expected) — wake signal delivered', [
                    'service' => $serviceId,
                ]);
            }
            return;
        }

        throw new CloudApiException(sprintf(
            'Cannot wake service "%s" from state "%s" — only idle/stopped are resumable.',
            $serviceId,
            $currentState,
        ));
    }

    /**
     * Runs one HTTP request against api.clickhouse.cloud. Retries once on 429/5xx with backoff.
     * Unwraps the common {status, requestId, result|error} envelope and returns `result`.
     *
     * @return mixed  The `result` field from the envelope (usually array).
     */
    private function request(string $method, string $path, ?array $body = null): mixed
    {
        $url = self::BASE_URI . ltrim($path, '/');
        $options = [
            'auth_basic' => [$this->config->cloudKeyId, $this->config->cloudKeySecret],
            'timeout' => 10,
            'max_redirects' => 0,
        ];
        if ($body !== null) {
            $options['json'] = $body;
        }

        $attempts = 0;
        while (true) {
            $attempts++;
            try {
                $response = $this->httpClient->request($method, $url, $options);
                $status = $response->getStatusCode();
                $content = $response->getContent(false);
            } catch (TransportExceptionInterface $e) {
                if ($attempts >= 3) {
                    throw new CloudApiException('Cloud API transport error: ' . $e->getMessage(), previous: $e);
                }
                usleep(200_000 * $attempts);
                continue;
            }

            if ($status === 429 || $status >= 500) {
                if ($attempts >= 3) {
                    throw new CloudApiException(sprintf('Cloud API %s %s → %d after %d attempts: %s', $method, $path, $status, $attempts, $content));
                }
                $resetHeader = $response->getHeaders(false)['x-ratelimit-reset'][0] ?? null;
                $delaySec = is_numeric($resetHeader) ? max(1, (int) $resetHeader) : $attempts;
                $this->logger->notice('Cloud API backoff', ['status' => $status, 'delay_sec' => $delaySec, 'path' => $path]);
                sleep(min(5, $delaySec));
                continue;
            }

            $decoded = json_decode($content, true);
            if (!is_array($decoded)) {
                throw new CloudApiException(sprintf('Cloud API returned non-JSON body for %s %s: %s', $method, $path, substr($content, 0, 200)));
            }

            $requestId = isset($decoded['requestId']) ? (string) $decoded['requestId'] : null;
            if ($status >= 400 || isset($decoded['error'])) {
                throw new CloudApiException(
                    sprintf('Cloud API error %s %s: %s', $method, $path, $decoded['error'] ?? "HTTP $status"),
                    statusCode: $status,
                    requestId: $requestId,
                );
            }

            return $decoded['result'] ?? null;
        }
    }
}
