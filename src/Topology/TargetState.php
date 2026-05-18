<?php

declare(strict_types=1);

namespace App\Topology;

enum TargetState: string
{
    case Running = 'running';
    case PartiallyRunning = 'partiallyRunning';
    case Degraded = 'degraded';
    case Idle = 'idle';
    case Stopped = 'stopped';
    case Awaking = 'awaking';
    case Starting = 'starting';
    case Stopping = 'stopping';
    case Provisioning = 'provisioning';
    case Terminating = 'terminating';
    case Terminated = 'terminated';
    case SoftDeleting = 'softDeleting';
    case SoftDeleted = 'softDeleted';
    case Failed = 'failed';
    case Unknown = 'unknown';

    public function isQueryable(): bool
    {
        return match ($this) {
            self::Running, self::PartiallyRunning, self::Degraded => true,
            default => false,
        };
    }

    public function isTransitional(): bool
    {
        return match ($this) {
            self::Awaking, self::Starting, self::Stopping,
            self::Provisioning, self::Terminating, self::SoftDeleting => true,
            default => false,
        };
    }

    public static function fromCloudApi(string $state): self
    {
        return match (strtolower($state)) {
            'running' => self::Running,
            'partially_running' => self::PartiallyRunning,
            'degraded' => self::Degraded,
            'idle' => self::Idle,
            'stopped' => self::Stopped,
            'awaking' => self::Awaking,
            'starting' => self::Starting,
            'stopping' => self::Stopping,
            'provisioning' => self::Provisioning,
            'terminating' => self::Terminating,
            'terminated' => self::Terminated,
            'softdeleting' => self::SoftDeleting,
            'softdeleted' => self::SoftDeleted,
            'failed' => self::Failed,
            default => self::Unknown,
        };
    }
}
