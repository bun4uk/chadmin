<?php

declare(strict_types=1);

namespace App\ClickHouse;

use App\Topology\Target;

final class TargetNotQueryableException extends \RuntimeException
{
    public function __construct(public readonly Target $target, ?\Throwable $previous = null)
    {
        parent::__construct(
            sprintf('Target "%s" is in state "%s" and cannot be queried.', $target->name, $target->state->value),
            0,
            $previous,
        );
    }
}
